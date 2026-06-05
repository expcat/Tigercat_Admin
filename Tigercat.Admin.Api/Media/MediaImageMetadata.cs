using System.Buffers.Binary;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace Tigercat.Admin.Api.Media;

public static partial class MediaImageMetadata
{
    public static async Task<ImageDimensions?> TryReadDimensionsAsync(
        byte[] bytes,
        string contentType,
        CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();

        if (bytes.Length == 0 || !MediaFileRules.IsImageContentType(contentType))
        {
            return null;
        }

        if (string.Equals(contentType, "image/png", StringComparison.OrdinalIgnoreCase))
        {
            return TryReadPng(bytes);
        }

        if (string.Equals(contentType, "image/jpeg", StringComparison.OrdinalIgnoreCase))
        {
            return TryReadJpeg(bytes);
        }

        if (string.Equals(contentType, "image/gif", StringComparison.OrdinalIgnoreCase))
        {
            return TryReadGif(bytes);
        }

        if (string.Equals(contentType, "image/webp", StringComparison.OrdinalIgnoreCase))
        {
            return TryReadWebp(bytes);
        }

        if (string.Equals(contentType, "image/svg+xml", StringComparison.OrdinalIgnoreCase))
        {
            return await TryReadSvgAsync(bytes, ct);
        }

        return null;
    }

    private static ImageDimensions? TryReadPng(ReadOnlySpan<byte> bytes)
    {
        ReadOnlySpan<byte> signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
        if (bytes.Length < 24 || !bytes[..8].SequenceEqual(signature))
        {
            return null;
        }

        return new ImageDimensions(
            BinaryPrimitives.ReadInt32BigEndian(bytes.Slice(16, 4)),
            BinaryPrimitives.ReadInt32BigEndian(bytes.Slice(20, 4)));
    }

    private static ImageDimensions? TryReadGif(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length < 10 ||
            !(bytes[..6].SequenceEqual("GIF87a"u8) || bytes[..6].SequenceEqual("GIF89a"u8)))
        {
            return null;
        }

        return new ImageDimensions(
            BinaryPrimitives.ReadUInt16LittleEndian(bytes.Slice(6, 2)),
            BinaryPrimitives.ReadUInt16LittleEndian(bytes.Slice(8, 2)));
    }

    private static ImageDimensions? TryReadJpeg(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length < 4 || bytes[0] != 0xff || bytes[1] != 0xd8)
        {
            return null;
        }

        var index = 2;
        while (index + 9 < bytes.Length)
        {
            if (bytes[index] != 0xff)
            {
                index++;
                continue;
            }

            var marker = bytes[index + 1];
            index += 2;

            if (marker is 0xd8 or 0xd9)
            {
                continue;
            }

            if (index + 2 > bytes.Length)
            {
                return null;
            }

            var segmentLength = BinaryPrimitives.ReadUInt16BigEndian(bytes.Slice(index, 2));
            if (segmentLength < 2 || index + segmentLength > bytes.Length)
            {
                return null;
            }

            if (marker is >= 0xc0 and <= 0xcf and not 0xc4 and not 0xc8 and not 0xcc)
            {
                if (segmentLength < 7)
                {
                    return null;
                }

                return new ImageDimensions(
                    BinaryPrimitives.ReadUInt16BigEndian(bytes.Slice(index + 5, 2)),
                    BinaryPrimitives.ReadUInt16BigEndian(bytes.Slice(index + 3, 2)));
            }

            index += segmentLength;
        }

        return null;
    }

    private static ImageDimensions? TryReadWebp(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length < 30 ||
            !bytes[..4].SequenceEqual("RIFF"u8) ||
            !bytes.Slice(8, 4).SequenceEqual("WEBP"u8))
        {
            return null;
        }

        var chunk = bytes.Slice(12, 4);
        if (chunk.SequenceEqual("VP8 "u8) && bytes.Length >= 30)
        {
            return new ImageDimensions(
                BinaryPrimitives.ReadUInt16LittleEndian(bytes.Slice(26, 2)) & 0x3fff,
                BinaryPrimitives.ReadUInt16LittleEndian(bytes.Slice(28, 2)) & 0x3fff);
        }

        if (chunk.SequenceEqual("VP8L"u8) && bytes.Length >= 25)
        {
            var b0 = bytes[21];
            var b1 = bytes[22];
            var b2 = bytes[23];
            var b3 = bytes[24];
            var width = 1 + (((b1 & 0x3f) << 8) | b0);
            var height = 1 + ((b3 << 6) | (b2 >> 2) | ((b1 & 0xc0) << 6));
            return new ImageDimensions(width, height);
        }

        if (chunk.SequenceEqual("VP8X"u8) && bytes.Length >= 30)
        {
            var width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
            var height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
            return new ImageDimensions(width, height);
        }

        return null;
    }

    private static async Task<ImageDimensions?> TryReadSvgAsync(byte[] bytes, CancellationToken ct)
    {
        var text = Encoding.UTF8.GetString(bytes);
        await Task.CompletedTask.WaitAsync(ct);

        var width = TryReadSvgNumber(SvgWidthRegex().Match(text));
        var height = TryReadSvgNumber(SvgHeightRegex().Match(text));
        if (width is > 0 && height is > 0)
        {
            return new ImageDimensions(width.Value, height.Value);
        }

        var viewBox = SvgViewBoxRegex().Match(text);
        if (!viewBox.Success)
        {
            return null;
        }

        var parts = viewBox.Groups[1].Value
            .Split([' ', ','], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (parts.Length == 4 &&
            double.TryParse(parts[2], NumberStyles.Float, CultureInfo.InvariantCulture, out var viewBoxWidth) &&
            double.TryParse(parts[3], NumberStyles.Float, CultureInfo.InvariantCulture, out var viewBoxHeight))
        {
            return new ImageDimensions((int)Math.Round(viewBoxWidth), (int)Math.Round(viewBoxHeight));
        }

        return null;
    }

    private static int? TryReadSvgNumber(Match match)
    {
        if (!match.Success)
        {
            return null;
        }

        return double.TryParse(match.Groups[1].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out var value)
            ? (int)Math.Round(value)
            : null;
    }

    [GeneratedRegex("""\bwidth\s*=\s*["']([0-9.]+)""", RegexOptions.IgnoreCase)]
    private static partial Regex SvgWidthRegex();

    [GeneratedRegex("""\bheight\s*=\s*["']([0-9.]+)""", RegexOptions.IgnoreCase)]
    private static partial Regex SvgHeightRegex();

    [GeneratedRegex("""\bviewBox\s*=\s*["']([^"']+)""", RegexOptions.IgnoreCase)]
    private static partial Regex SvgViewBoxRegex();
}

public record ImageDimensions(int Width, int Height);
