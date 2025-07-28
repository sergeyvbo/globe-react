using Microsoft.AspNetCore.Mvc;
using GeoQuizApi.Middleware;

namespace GeoQuizApi.Services;

/// <summary>
/// Service interface for creating RFC 9457 compliant ProblemDetails from exceptions.
/// Wraps ASP.NET Core's built-in IProblemDetailsService with custom logic.
/// </summary>
public interface ICustomProblemDetailsService
{
    /// <summary>
    /// Creates a ProblemDetails object from an exception with appropriate HTTP status code and problem type.
    /// </summary>
    /// <param name="exception">The exception to convert to ProblemDetails</param>
    /// <param name="context">The current HTTP context</param>
    /// <returns>A ProblemDetails object compliant with RFC 9457</returns>
    ProblemDetails CreateProblemDetails(Exception exception, HttpContext context);

    /// <summary>
    /// Creates a ValidationProblemDetails object from a ValidationException with detailed error information.
    /// </summary>
    /// <param name="exception">The validation exception containing field-specific errors</param>
    /// <param name="context">The current HTTP context</param>
    /// <returns>A ValidationProblemDetails object with detailed validation errors</returns>
    ValidationProblemDetails CreateValidationProblemDetails(ValidationException exception, HttpContext context);
}