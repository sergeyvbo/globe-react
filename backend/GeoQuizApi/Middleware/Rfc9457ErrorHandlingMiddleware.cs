using Microsoft.AspNetCore.Mvc;
using GeoQuizApi.Services;
using GeoQuizApi.Models.Exceptions;
using System.Text.Json;

namespace GeoQuizApi.Middleware;

/// <summary>
/// Middleware for handling exceptions and converting them to RFC 9457 compliant ProblemDetails responses.
/// Replaces the existing ErrorHandlingMiddleware with ASP.NET Core built-in ProblemDetails support.
/// </summary>
public class Rfc9457ErrorHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<Rfc9457ErrorHandlingMiddleware> _logger;
    private readonly IProblemDetailsService _problemDetailsService;
    private readonly ICustomProblemDetailsService _customProblemDetailsService;

    public Rfc9457ErrorHandlingMiddleware(
        RequestDelegate next,
        ILogger<Rfc9457ErrorHandlingMiddleware> logger,
        IProblemDetailsService problemDetailsService,
        ICustomProblemDetailsService customProblemDetailsService)
    {
        _next = next;
        _logger = logger;
        _problemDetailsService = problemDetailsService;
        _customProblemDetailsService = customProblemDetailsService;
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
        // Log the exception with appropriate level based on exception type
        LogException(exception, context);

        // Create appropriate ProblemDetails based on exception type
        ProblemDetails problemDetails = exception switch
        {
            ValidationException validationEx => _customProblemDetailsService.CreateValidationProblemDetails(validationEx, context),
            _ => _customProblemDetailsService.CreateProblemDetails(exception, context)
        };

        // Set the response status code
        context.Response.StatusCode = problemDetails.Status ?? 500;

        // For ValidationException, always write manually to ensure errors are preserved
        if (exception is ValidationException)
        {
            await WriteProblemDetailsManually(context, problemDetails);
            return;
        }

        // Create ProblemDetailsContext for the built-in service
        var problemDetailsContext = new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = problemDetails
        };

        // Try to use the built-in IProblemDetailsService to write the response
        if (!await _problemDetailsService.TryWriteAsync(problemDetailsContext))
        {
            // Fallback: manually write the response if the built-in service couldn't handle it
            await WriteProblemDetailsManually(context, problemDetails);
        }
    }

    /// <summary>
    /// Logs exceptions with appropriate log levels based on the exception type and HTTP status code.
    /// Maintains the same logging behavior as the original ErrorHandlingMiddleware.
    /// </summary>
    /// <param name="exception">The exception to log</param>
    /// <param name="context">The HTTP context</param>
    private void LogException(Exception exception, HttpContext context)
    {
        var path = context.Request.Path;

        switch (exception)
        {
            case ValidationException:
                _logger.LogWarning(exception, "Validation error occurred at {Path}", path);
                break;

            case UnauthorizedAccessException:
                _logger.LogWarning(exception, "Unauthorized access attempt at {Path}", path);
                break;

            case KeyNotFoundException:
                _logger.LogWarning(exception, "Resource not found at {Path}", path);
                break;

            case InvalidOperationException invalidOpEx when invalidOpEx.Message.Contains("already exists"):
                _logger.LogWarning(exception, "Conflict error at {Path}", path);
                break;

            case ArgumentException:
                _logger.LogWarning(exception, "Bad request at {Path}", path);
                break;

            default:
                _logger.LogError(exception, "Unhandled exception occurred at {Path}", path);
                break;
        }
    }

    /// <summary>
    /// Manually writes ProblemDetails to the response as a fallback when IProblemDetailsService fails.
    /// Ensures proper Content-Type header and JSON serialization.
    /// </summary>
    /// <param name="context">The HTTP context</param>
    /// <param name="problemDetails">The ProblemDetails to write</param>
    private static async Task WriteProblemDetailsManually(HttpContext context, ProblemDetails problemDetails)
    {
        context.Response.ContentType = "application/problem+json";
        
        var jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        };
        
        // Special handling for ValidationProblemDetails to ensure Errors property is serialized
        if (problemDetails is ValidationProblemDetails validationProblemDetails)
        {
            // Create a custom object that includes all properties including Errors
            var responseObject = new
            {
                type = validationProblemDetails.Type,
                title = validationProblemDetails.Title,
                status = validationProblemDetails.Status,
                detail = validationProblemDetails.Detail,
                instance = validationProblemDetails.Instance,
                errors = validationProblemDetails.Errors,
                timestamp = validationProblemDetails.Extensions.ContainsKey("timestamp") ? validationProblemDetails.Extensions["timestamp"] : null,
                traceId = validationProblemDetails.Extensions.ContainsKey("traceId") ? validationProblemDetails.Extensions["traceId"] : null
            };
            
            await context.Response.WriteAsJsonAsync(responseObject, jsonOptions);
        }
        else
        {
            await context.Response.WriteAsJsonAsync(problemDetails, jsonOptions);
        }
    }
}