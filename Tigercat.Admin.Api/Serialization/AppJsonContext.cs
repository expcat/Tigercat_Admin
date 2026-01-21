using System.Text.Json.Serialization;
using Tigercat.Admin.Api.Common;

namespace Tigercat.Admin.Api.Serialization;

[JsonSerializable(typeof(ApiResponse<object>))]
internal partial class AppJsonContext : JsonSerializerContext
{
}
