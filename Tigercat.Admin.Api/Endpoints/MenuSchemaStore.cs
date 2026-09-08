using System.Text.Json;
using System.Text.RegularExpressions;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

internal readonly record struct MenuSchemaMutation(
    bool Ok,
    int Status,
    string Message,
    MenuSchemaNodeResponse? Node);

internal sealed class MenuSchemaStore
{
    public const string ItemsPlacement = "items";
    public const string BottomItemsPlacement = "bottomItems";
    public const string ProtectedHomeKey = "home";

    private const int KeyMaxLength = 64;
    private const int LabelMaxLength = 50;
    private const int IconMaxLength = 32;
    private const int PathMaxLength = 128;
    private const int PermissionMaxLength = 64;
    private const int IframeSrcMaxLength = 512;

    private static readonly Regex KeyPattern = new(
        @"^[A-Za-z][A-Za-z0-9_-]{0,63}$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private readonly object _gate = new();
    private MenuSchemaResponse _schema;

    public MenuSchemaStore()
    {
        _schema = Clone(MenusCatalog.Schema);
    }

    public MenuSchemaResponse Snapshot()
    {
        lock (_gate)
        {
            return Clone(_schema);
        }
    }

    public MenuSchemaMutation Create(MenuNodeWriteRequest request)
    {
        lock (_gate)
        {
            var schema = Clone(_schema);
            var keyError = ValidateKey(request.Key, required: true);
            if (keyError is not null)
            {
                return Fail(400, keyError);
            }

            var key = request.Key!.Trim();
            if (Find(schema, key) is not null)
            {
                return Fail(409, "菜单节点 key 已存在");
            }

            var fieldError = ValidateFields(request);
            if (fieldError is not null)
            {
                return Fail(400, fieldError);
            }

            var parentError = ResolveParent(schema, request.ParentKey, request.Placement, out var siblings, out _);
            if (parentError is not null)
            {
                return Fail(parentError.Value.Status, parentError.Value.Message);
            }

            var node = ApplyFields(new MenuSchemaNodeResponse { Key = key }, request, replacing: false);
            siblings!.Add(node);
            WriteSiblings(schema, request.ParentKey, request.Placement, siblings);
            _schema = schema;
            return new MenuSchemaMutation(true, 201, "Success", CloneNode(node));
        }
    }

    public MenuSchemaMutation Update(string key, MenuNodeWriteRequest request)
    {
        lock (_gate)
        {
            if (string.IsNullOrWhiteSpace(key))
            {
                return Fail(400, "请提供菜单节点 key");
            }

            var schema = Clone(_schema);
            var current = Find(schema, key);
            if (current is null)
            {
                return Fail(404, "菜单节点不存在");
            }

            var fieldError = ValidateFields(request);
            if (fieldError is not null)
            {
                return Fail(400, fieldError);
            }

            var nextParentKey = NormalizeParentKey(request.ParentKey);
            var moving = nextParentKey != NormalizeParentKey(current.ParentKey)
                || (!string.IsNullOrWhiteSpace(request.Placement)
                    && !string.Equals(NormalizePlacement(request.Placement), current.Placement, StringComparison.OrdinalIgnoreCase)
                    && nextParentKey is null);

            if (moving)
            {
                if (string.Equals(nextParentKey, key, StringComparison.Ordinal))
                {
                    return Fail(400, "不能把节点移动到自身下面");
                }

                if (nextParentKey is not null && IsDescendant(current.Node, nextParentKey))
                {
                    return Fail(400, "不能把节点移动到自己的子节点下面");
                }

                var parentError = ResolveParent(schema, request.ParentKey, request.Placement, out var nextSiblings, out _);
                if (parentError is not null)
                {
                    return Fail(parentError.Value.Status, parentError.Value.Message);
                }

                current.Siblings.RemoveAll(item => string.Equals(item.Key, key, StringComparison.Ordinal));
                WriteSiblings(schema, current.ParentKey, current.Placement, current.Siblings);
                ApplyFields(current.Node, request, replacing: true);
                nextSiblings!.Add(current.Node);
                WriteSiblings(schema, request.ParentKey, request.Placement, nextSiblings);
            }
            else
            {
                ApplyFields(current.Node, request, replacing: true);
            }

            _schema = schema;
            return new MenuSchemaMutation(true, 200, "Success", CloneNode(current.Node));
        }
    }

    public MenuSchemaMutation Delete(string key)
    {
        lock (_gate)
        {
            if (string.IsNullOrWhiteSpace(key))
            {
                return Fail(400, "请提供菜单节点 key");
            }

            if (string.Equals(key, ProtectedHomeKey, StringComparison.Ordinal))
            {
                return Fail(400, "不能删除仪表盘节点");
            }

            var schema = Clone(_schema);
            var current = Find(schema, key);
            if (current is null)
            {
                return Fail(404, "菜单节点不存在");
            }

            if (current.Node.Children is { Length: > 0 })
            {
                return Fail(400, "请先删除子节点");
            }

            current.Siblings.RemoveAll(item => string.Equals(item.Key, key, StringComparison.Ordinal));
            WriteSiblings(schema, current.ParentKey, current.Placement, current.Siblings);
            _schema = schema;
            return new MenuSchemaMutation(true, 200, "删除成功", null);
        }
    }

    private static MenuSchemaMutation Fail(int status, string message)
        => new(false, status, message, null);

    private static string? ValidateKey(string? key, bool required)
    {
        var value = key?.Trim() ?? string.Empty;
        if (value.Length == 0)
        {
            return required ? "请输入菜单节点 key" : null;
        }

        if (value.Length > KeyMaxLength || !KeyPattern.IsMatch(value))
        {
            return "key 需以字母开头，仅含字母、数字、下划线或连字符，最长 64 位";
        }

        return null;
    }

    private static string? ValidateFields(MenuNodeWriteRequest request)
    {
        if (request.Label is { Length: > LabelMaxLength })
        {
            return $"显示名长度不能超过 {LabelMaxLength}";
        }

        if (request.Icon is { Length: > IconMaxLength })
        {
            return $"图标名长度不能超过 {IconMaxLength}";
        }

        if (request.Path is { Length: > 0 })
        {
            var path = request.Path.Trim();
            if (path.Length > PathMaxLength)
            {
                return $"路径长度不能超过 {PathMaxLength}";
            }

            if (!path.StartsWith('/'))
            {
                return "路径必须以 / 开头";
            }
        }

        if (request.Permission is { Length: > PermissionMaxLength })
        {
            return $"权限码长度不能超过 {PermissionMaxLength}";
        }

        if (request.IframeSrc is { Length: > IframeSrcMaxLength })
        {
            return $"iframe 地址长度不能超过 {IframeSrcMaxLength}";
        }

        if (request.Placement is { Length: > 0 }
            && !string.Equals(request.Placement, ItemsPlacement, StringComparison.OrdinalIgnoreCase)
            && !string.Equals(request.Placement, BottomItemsPlacement, StringComparison.OrdinalIgnoreCase))
        {
            return "placement 只能是 items 或 bottomItems";
        }

        return null;
    }

    private static MenuSchemaNodeResponse ApplyFields(
        MenuSchemaNodeResponse node,
        MenuNodeWriteRequest request,
        bool replacing)
    {
        if (!replacing || request.Label is not null)
        {
            node.Label = EmptyToNull(request.Label);
        }

        if (!replacing || request.Icon is not null)
        {
            node.Icon = EmptyToNull(request.Icon);
        }

        if (!replacing || request.Path is not null)
        {
            node.Path = EmptyToNull(request.Path);
        }

        if (!replacing || request.Permission is not null)
        {
            node.Permission = EmptyToNull(request.Permission);
        }

        if (!replacing || request.IframeSrc is not null)
        {
            node.IframeSrc = EmptyToNull(request.IframeSrc);
        }

        if (request.HideInMenu.HasValue)
        {
            node.HideInMenu = request.HideInMenu.Value;
        }

        if (request.HideInBreadcrumb.HasValue)
        {
            node.HideInBreadcrumb = request.HideInBreadcrumb.Value;
        }

        if (request.FlatMenu.HasValue)
        {
            node.FlatMenu = request.FlatMenu.Value;
        }

        return node;
    }

    private static MenuSchemaMutation? ResolveParent(
        MenuSchemaResponse schema,
        string? parentKey,
        string? placement,
        out List<MenuSchemaNodeResponse>? siblings,
        out string resolvedPlacement)
    {
        siblings = null;
        var normalizedParent = NormalizeParentKey(parentKey);
        resolvedPlacement = NormalizePlacement(placement);

        if (normalizedParent is null)
        {
            siblings = RootList(schema, resolvedPlacement);
            return null;
        }

        var parent = Find(schema, normalizedParent);
        if (parent is null)
        {
            return Fail(400, "父节点不存在");
        }

        parent.Node.Children ??= [];
        siblings = parent.Node.Children.ToList();
        resolvedPlacement = parent.Placement;
        return null;
    }

    private static void WriteSiblings(
        MenuSchemaResponse schema,
        string? parentKey,
        string? placement,
        List<MenuSchemaNodeResponse> siblings)
    {
        var normalizedParent = NormalizeParentKey(parentKey);
        if (normalizedParent is null)
        {
            var resolved = NormalizePlacement(placement);
            if (resolved == BottomItemsPlacement)
            {
                schema.BottomItems = [.. siblings];
            }
            else
            {
                schema.Items = [.. siblings];
            }

            return;
        }

        var parent = Find(schema, normalizedParent);
        if (parent is null)
        {
            return;
        }

        parent.Node.Children = siblings.Count == 0 ? null : [.. siblings];
    }

    private static List<MenuSchemaNodeResponse> RootList(MenuSchemaResponse schema, string placement)
        => placement == BottomItemsPlacement ? schema.BottomItems.ToList() : schema.Items.ToList();

    private static string NormalizePlacement(string? placement)
        => string.Equals(placement, BottomItemsPlacement, StringComparison.OrdinalIgnoreCase)
            ? BottomItemsPlacement
            : ItemsPlacement;

    private static string? NormalizeParentKey(string? parentKey)
        => string.IsNullOrWhiteSpace(parentKey) ? null : parentKey.Trim();

    private static string? EmptyToNull(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }

    private static NodeLocation? Find(MenuSchemaResponse schema, string key)
        => FindIn(schema.Items, key, null, ItemsPlacement)
            ?? FindIn(schema.BottomItems, key, null, BottomItemsPlacement);

    private static NodeLocation? FindIn(
        MenuSchemaNodeResponse[] nodes,
        string key,
        string? parentKey,
        string placement)
    {
        var siblings = nodes.ToList();
        foreach (var node in siblings)
        {
            if (string.Equals(node.Key, key, StringComparison.Ordinal))
            {
                return new NodeLocation(node, parentKey, siblings, placement);
            }

            if (node.Children is { Length: > 0 })
            {
                var nested = FindIn(node.Children, key, node.Key, placement);
                if (nested is not null)
                {
                    return nested;
                }
            }
        }

        return null;
    }

    private static bool IsDescendant(MenuSchemaNodeResponse node, string key)
    {
        if (node.Children is null)
        {
            return false;
        }

        foreach (var child in node.Children)
        {
            if (string.Equals(child.Key, key, StringComparison.Ordinal) || IsDescendant(child, key))
            {
                return true;
            }
        }

        return false;
    }

    private static MenuSchemaResponse Clone(MenuSchemaResponse source)
    {
        var json = JsonSerializer.Serialize(source, AppJsonContext.Default.MenuSchemaResponse);
        return JsonSerializer.Deserialize(json, AppJsonContext.Default.MenuSchemaResponse)!;
    }

    private static MenuSchemaNodeResponse CloneNode(MenuSchemaNodeResponse source)
    {
        var json = JsonSerializer.Serialize(source, AppJsonContext.Default.MenuSchemaNodeResponse);
        return JsonSerializer.Deserialize(json, AppJsonContext.Default.MenuSchemaNodeResponse)!;
    }

    private sealed record NodeLocation(
        MenuSchemaNodeResponse Node,
        string? ParentKey,
        List<MenuSchemaNodeResponse> Siblings,
        string Placement);
}
