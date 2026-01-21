namespace Tigercat.Admin.Api.Common;

public class ApiResponse<T>
{
    public int Code { get; set; }
    public string Message { get; set; }
    public T? Data { get; set; }
    public bool Success { get; set; }

    public ApiResponse(T? data, string message = "Success", int code = 200, bool success = true)
    {
        Data = data;
        Message = message;
        Code = code;
        Success = success;
    }

    public static ApiResponse<T> Ok(T data, string message = "Success")
        => new(data, message);

    public static ApiResponse<T> Fail(string message = "Error", int code = 500)
        => new(default, message, code, false);
}

public static class ApiResult
{
    public static ApiResponse<T> Ok<T>(T data, string message = "Success")
        => ApiResponse<T>.Ok(data, message);

    public static ApiResponse<T> Fail<T>(string message = "Error", int code = 500)
        => ApiResponse<T>.Fail(message, code);

    public static ApiResponse<object> Fail(string message = "Error", int code = 500)
        => ApiResponse<object>.Fail(message, code);
}
