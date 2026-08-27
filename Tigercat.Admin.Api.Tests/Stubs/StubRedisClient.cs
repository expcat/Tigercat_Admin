using System.Reflection;
using FreeRedis;

namespace Tigercat.Admin.Api.Tests.Stubs;

/// <summary>
/// DispatchProxy stand-in for <see cref="IRedisClient"/> that returns empty stream
/// results so export tests can exercise the 200 path without Redis.
/// </summary>
internal class StubRedisClient : DispatchProxy
{
    protected override object? Invoke(MethodInfo? targetMethod, object?[]? args)
    {
        if (targetMethod is null)
        {
            return null;
        }

        var returnType = targetMethod.ReturnType;
        if (returnType == typeof(void) || returnType == typeof(Task) || returnType == typeof(ValueTask))
        {
            return null;
        }

        if (returnType == typeof(StreamsEntry[]))
        {
            return Array.Empty<StreamsEntry>();
        }

        if (returnType.IsArray)
        {
            var element = returnType.GetElementType();
            return element is null ? Array.Empty<object>() : Array.CreateInstance(element, 0);
        }

        if (returnType.IsGenericType && returnType.GetGenericTypeDefinition() == typeof(Task<>))
        {
            var resultType = returnType.GetGenericArguments()[0];
            var result = resultType == typeof(StreamsEntry[])
                ? Array.Empty<StreamsEntry>()
                : resultType.IsValueType
                    ? Activator.CreateInstance(resultType)
                    : null;
            return typeof(Task).GetMethod(nameof(Task.FromResult))!
                .MakeGenericMethod(resultType)
                .Invoke(null, [result]);
        }

        if (Nullable.GetUnderlyingType(returnType) is not null)
        {
            return null;
        }

        return returnType.IsValueType ? Activator.CreateInstance(returnType) : null;
    }

    public static IRedisClient Create() => Create<IRedisClient, StubRedisClient>()!;
}
