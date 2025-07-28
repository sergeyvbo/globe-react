using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace GeoQuizApi.Middleware;

public class ErrorHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ErrorHandlingMiddleware> _logger;
    private readonly IWebHostEnvironment _environment;

    public ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger, IWebHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var response = context.Response;
        response.ContentType = "application/json";

        var errorResponse = new ErrorResponse
        {
            Timestamp = DateTime.UtcNow,
            Path = context.Request.Path
        };

        switch (exception)
        {
            case ValidationException validationEx:
                response.StatusCode = (int)HttpStatusCode.UnprocessableEntity;
                // Convert string[] values back to object for backward compatibility
                var legacyErrors = validationEx.Errors.ToDictionary(
                    kvp => kvp.Key, 
                    kvp => (object)(kvp.Value.Length == 1 ? kvp.Value[0] : kvp.Value)
                );
                errorResponse.Error = new ErrorDetails
                {
                    Type = "ValidationError",
                    Message = "Validation failed",
                    Details = legacyErrors
                };
                _logger.LogWarning(exception, "Validation error occurred at {Path}", context.Request.Path);
                break;

            case UnauthorizedAccessException:
                response.StatusCode = (int)HttpStatusCode.Unauthorized;
                errorResponse.Error = new ErrorDetails
                {
                    Type = "UnauthorizedError",
                    Message = "Access denied"
                };
                _logger.LogWarning(exception, "Unauthorized access attempt at {Path}", context.Request.Path);
                break;

            case KeyNotFoundException:
                response.StatusCode = (int)HttpStatusCode.NotFound;
                errorResponse.Error = new ErrorDetails
                {
                    Type = "NotFoundError",
                    Message = "Resource not found"
                };
                _logger.LogWarning(exception, "Resource not found at {Path}", context.Request.Path);
                break;

            case InvalidOperationException invalidOpEx when invalidOpEx.Message.Contains("already exists"):
                response.StatusCode = (int)HttpStatusCode.Conflict;
                errorResponse.Error = new ErrorDetails
                {
                    Type = "ConflictError",
                    Message = exception.Message
                };
                _logger.LogWarning(exception, "Conflict error at {Path}", context.Request.Path);
                break;

            case ArgumentException:
                response.StatusCode = (int)HttpStatusCode.BadRequest;
                errorResponse.Error = new ErrorDetails
                {
                    Type = "BadRequestError",
                    Message = exception.Message
                };
                _logger.LogWarning(exception, "Bad request at {Path}", context.Request.Path);
                break;

            default:
                response.StatusCode = (int)HttpStatusCode.InternalServerError;
                errorResponse.Error = new ErrorDetails
                {
                    Type = "InternalServerError",
                    Message = _environment.IsDevelopment() 
                        ? exception.Message 
                        : "An internal server error occurred"
                };
                
                _logger.LogError(exception, "Unhandled exception occurred at {Path}", context.Request.Path);
                break;
        }

        // Include stack trace only in development
        if (_environment.IsDevelopment() && response.StatusCode == (int)HttpStatusCode.InternalServerError)
        {
            errorResponse.Error.Details = new Dictionary<string, object>
            {
                ["stackTrace"] = exception.StackTrace ?? string.Empty,
                ["innerException"] = exception.InnerException?.Message ?? string.Empty
            };
        }

        var jsonResponse = JsonSerializer.Serialize(errorResponse, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await response.WriteAsync(jsonResponse);
    }
}

public class ErrorResponse
{
    public ErrorDetails Error { get; set; } = new();
    public DateTime Timestamp { get; set; }
    public string Path { get; set; } = string.Empty;
}

public class ErrorDetails
{
    public string Type { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public Dictionary<string, object>? Details { get; set; }
}

public class ValidationException : Exception
{
    public Dictionary<string, string[]> Errors { get; }

    public ValidationException(Dictionary<string, string[]> errors) : base("Validation failed")
    {
        Errors = errors;
    }

    public ValidationException(string field, string message) : base("Validation failed")
    {
        Errors = new Dictionary<string, string[]> { [field] = new[] { message } };
    }

    public ValidationException(string field, string[] messages) : base("Validation failed")
    {
        Errors = new Dictionary<string, string[]> { [field] = messages };
    }

    // Convenience constructor for backward compatibility with Dictionary<string, object>
    public ValidationException(Dictionary<string, object> errors) : base("Validation failed")
    {
        Errors = new Dictionary<string, string[]>();
        
        foreach (var error in errors)
        {
            var errorMessages = error.Value switch
            {
                string stringValue => new[] { stringValue },
                string[] arrayValue => arrayValue,
                IEnumerable<string> enumerableValue => enumerableValue.ToArray(),
                _ => new[] { error.Value?.ToString() ?? "Invalid value" }
            };

            Errors[error.Key] = errorMessages;
        }
    }
}