using Microsoft.AspNetCore.Mvc;
using GeoQuizApi.Models;
using GeoQuizApi.Middleware;
using System.Net;

namespace GeoQuizApi.Services;

/// <summary>
/// Service for creating RFC 9457 compliant ProblemDetails from exceptions.
/// Wraps ASP.NET Core's built-in IProblemDetailsService with custom exception mapping logic.
/// </summary>
public class CustomProblemDetailsService : ICustomProblemDetailsService
{
    private readonly IProblemDetailsService _problemDetailsService;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<CustomProblemDetailsService> _logger;

    public CustomProblemDetailsService(
        IProblemDetailsService problemDetailsService,
        IWebHostEnvironment environment,
        ILogger<CustomProblemDetailsService> logger)
    {
        _problemDetailsService = problemDetailsService;
        _environment = environment;
        _logger = logger;
    }

    /// <summary>
    /// Creates a ProblemDetails object from an exception with appropriate HTTP status code and problem type.
    /// </summary>
    /// <param name="exception">The exception to convert to ProblemDetails</param>
    /// <param name="context">The current HTTP context</param>
    /// <returns>A ProblemDetails object compliant with RFC 9457</returns>
    public ProblemDetails CreateProblemDetails(Exception exception, HttpContext context)
    {
        var (statusCode, problemType) = GetStatusCodeAndProblemType(exception);
        var title = ProblemTypes.GetTitle(problemType);

        var problemDetails = new ProblemDetails
        {
            Type = problemType,
            Title = title,
            Status = statusCode,
            Detail = GetDetailMessage(exception, statusCode),
            Instance = context.Request.Path
        };

        // Add additional fields
        problemDetails.Extensions["timestamp"] = DateTime.UtcNow;
        problemDetails.Extensions["traceId"] = context.TraceIdentifier;

        // Include development-specific information
        if (_environment.IsDevelopment() && statusCode == (int)HttpStatusCode.InternalServerError)
        {
            problemDetails.Extensions["stackTrace"] = exception.StackTrace ?? string.Empty;
            if (exception.InnerException != null)
            {
                problemDetails.Extensions["innerException"] = exception.InnerException.Message;
            }
        }

        return problemDetails;
    }

    /// <summary>
    /// Creates a ValidationProblemDetails object from a ValidationException with detailed error information.
    /// </summary>
    /// <param name="exception">The validation exception containing field-specific errors</param>
    /// <param name="context">The current HTTP context</param>
    /// <returns>A ValidationProblemDetails object with detailed validation errors</returns>
    public ValidationProblemDetails CreateValidationProblemDetails(ValidationException exception, HttpContext context)
    {
        var validationProblemDetails = new ValidationProblemDetails
        {
            Type = ProblemTypes.ValidationError,
            Title = ProblemTypes.GetTitle(ProblemTypes.ValidationError),
            Status = (int)HttpStatusCode.UnprocessableEntity,
            Detail = "The request contains invalid data",
            Instance = context.Request.Path
        };

        // ValidationException.Errors now directly matches ValidationProblemDetails.Errors format
        foreach (var error in exception.Errors)
        {
            validationProblemDetails.Errors[error.Key] = error.Value;
        }

        // Add additional fields
        validationProblemDetails.Extensions["timestamp"] = DateTime.UtcNow;
        validationProblemDetails.Extensions["traceId"] = context.TraceIdentifier;

        return validationProblemDetails;
    }

    /// <summary>
    /// Determines the HTTP status code and problem type URI for a given exception.
    /// </summary>
    /// <param name="exception">The exception to analyze</param>
    /// <returns>A tuple containing the HTTP status code and problem type URI</returns>
    private static (int statusCode, string problemType) GetStatusCodeAndProblemType(Exception exception)
    {
        return exception switch
        {
            ValidationException => ((int)HttpStatusCode.UnprocessableEntity, ProblemTypes.ValidationError),
            UnauthorizedAccessException => ((int)HttpStatusCode.Unauthorized, ProblemTypes.AuthenticationError),
            KeyNotFoundException => ((int)HttpStatusCode.NotFound, ProblemTypes.NotFoundError),
            InvalidOperationException invalidOpEx when invalidOpEx.Message.Contains("already exists") => 
                ((int)HttpStatusCode.Conflict, ProblemTypes.ConflictError),
            InvalidOperationException => ((int)HttpStatusCode.Conflict, ProblemTypes.ConflictError),
            ArgumentException => ((int)HttpStatusCode.BadRequest, ProblemTypes.BadRequestError),
            _ => ((int)HttpStatusCode.InternalServerError, ProblemTypes.InternalServerError)
        };
    }

    /// <summary>
    /// Gets an appropriate detail message for the exception based on environment and status code.
    /// </summary>
    /// <param name="exception">The exception to get details for</param>
    /// <param name="statusCode">The HTTP status code</param>
    /// <returns>A detail message appropriate for the environment</returns>
    private string GetDetailMessage(Exception exception, int statusCode)
    {
        // For client errors (4xx), always show the exception message as it's safe
        if (statusCode >= 400 && statusCode < 500)
        {
            return exception.Message;
        }

        // For server errors (5xx), be more careful about what we expose
        if (statusCode >= 500)
        {
            return _environment.IsDevelopment() 
                ? exception.Message 
                : "An internal server error occurred";
        }

        return exception.Message;
    }
}