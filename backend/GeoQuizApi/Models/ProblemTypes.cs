using System.Collections.ObjectModel;
using GeoQuizApi.Middleware;

namespace GeoQuizApi.Models;

/// <summary>
/// Registry of standardized problem type URIs according to RFC 9457.
/// Provides constants for all error type URIs and mapping from exception types to problem types.
/// </summary>
public static class ProblemTypes
{
    /// <summary>
    /// Base URI for all problem types in the GeoQuiz API
    /// </summary>
    public const string BaseUri = "https://geoquiz.sergeivbo.ru/problems/";

    // Problem Type URIs
    public const string ValidationError = BaseUri + "validation-error";
    public const string AuthenticationError = BaseUri + "authentication-error";
    public const string AuthorizationError = BaseUri + "authorization-error";
    public const string NotFoundError = BaseUri + "not-found-error";
    public const string ConflictError = BaseUri + "conflict-error";
    public const string InternalServerError = BaseUri + "internal-server-error";
    public const string BadRequestError = BaseUri + "bad-request-error";

    /// <summary>
    /// Mapping from exception types to their corresponding problem type URIs
    /// </summary>
    public static readonly ReadOnlyDictionary<Type, string> ExceptionToProblemTypeMap = 
        new(new Dictionary<Type, string>
        {
            { typeof(ValidationException), ValidationError },
            { typeof(UnauthorizedAccessException), AuthenticationError },
            { typeof(KeyNotFoundException), NotFoundError },
            { typeof(InvalidOperationException), ConflictError },
            { typeof(ArgumentException), BadRequestError },
            { typeof(Exception), InternalServerError }
        });

    /// <summary>
    /// Mapping from problem type URIs to their default titles
    /// </summary>
    public static readonly ReadOnlyDictionary<string, string> ProblemTypeTitles = 
        new(new Dictionary<string, string>
        {
            { ValidationError, "One or more validation errors occurred." },
            { AuthenticationError, "Authentication required" },
            { AuthorizationError, "Access denied" },
            { NotFoundError, "Resource not found" },
            { ConflictError, "Resource conflict" },
            { InternalServerError, "An error occurred while processing your request." },
            { BadRequestError, "Invalid request" }
        });

    /// <summary>
    /// Gets the problem type URI for a given exception type.
    /// </summary>
    /// <param name="exceptionType">The exception type to map</param>
    /// <returns>The corresponding problem type URI</returns>
    public static string GetProblemType(Type exceptionType)
    {
        // Check for exact type match first
        if (ExceptionToProblemTypeMap.TryGetValue(exceptionType, out var problemType))
        {
            return problemType;
        }

        // Check for special cases based on exception message or properties
        if (exceptionType == typeof(InvalidOperationException))
        {
            return ConflictError;
        }

        // Check inheritance hierarchy
        foreach (var kvp in ExceptionToProblemTypeMap)
        {
            if (kvp.Key.IsAssignableFrom(exceptionType))
            {
                return kvp.Value;
            }
        }

        // Default fallback
        return InternalServerError;
    }

    /// <summary>
    /// Gets the problem type URI for a given exception instance.
    /// Handles special cases like InvalidOperationException with conflict messages.
    /// </summary>
    /// <param name="exception">The exception instance to map</param>
    /// <returns>The corresponding problem type URI</returns>
    public static string GetProblemType(Exception exception)
    {
        return exception switch
        {
            ValidationException => ValidationError,
            UnauthorizedAccessException => AuthenticationError,
            KeyNotFoundException => NotFoundError,
            InvalidOperationException invalidOpEx when invalidOpEx.Message.Contains("already exists") => ConflictError,
            InvalidOperationException => ConflictError,
            ArgumentException => BadRequestError,
            _ => InternalServerError
        };
    }

    /// <summary>
    /// Gets the default title for a given problem type URI.
    /// </summary>
    /// <param name="problemTypeUri">The problem type URI</param>
    /// <returns>The default title for the problem type</returns>
    public static string GetTitle(string problemTypeUri)
    {
        return ProblemTypeTitles.TryGetValue(problemTypeUri, out var title) 
            ? title 
            : "An error occurred";
    }

    /// <summary>
    /// Gets the default title for a given exception type.
    /// </summary>
    /// <param name="exceptionType">The exception type</param>
    /// <returns>The default title for the exception type</returns>
    public static string GetTitle(Type exceptionType)
    {
        var problemType = GetProblemType(exceptionType);
        return GetTitle(problemType);
    }

    /// <summary>
    /// Gets the default title for a given exception instance.
    /// </summary>
    /// <param name="exception">The exception instance</param>
    /// <returns>The default title for the exception</returns>
    public static string GetTitle(Exception exception)
    {
        var problemType = GetProblemType(exception);
        return GetTitle(problemType);
    }
}