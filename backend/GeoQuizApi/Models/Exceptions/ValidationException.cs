namespace GeoQuizApi.Models.Exceptions;

/// <summary>
/// Exception thrown when validation errors occur.
/// Contains field-specific error messages that can be used with ValidationProblemDetails.
/// </summary>
public class ValidationException : Exception
{
    /// <summary>
    /// Gets the validation errors organized by field name.
    /// Each field can have multiple error messages.
    /// </summary>
    public Dictionary<string, string[]> Errors { get; }

    /// <summary>
    /// Initializes a new instance of ValidationException with a dictionary of field errors.
    /// </summary>
    /// <param name="errors">Dictionary where keys are field names and values are arrays of error messages</param>
    public ValidationException(Dictionary<string, string[]> errors) : base("Validation failed")
    {
        Errors = errors;
    }

    /// <summary>
    /// Initializes a new instance of ValidationException with a single field error.
    /// </summary>
    /// <param name="field">The field name that has the validation error</param>
    /// <param name="message">The validation error message</param>
    public ValidationException(string field, string message) : base("Validation failed")
    {
        Errors = new Dictionary<string, string[]> { [field] = new[] { message } };
    }

    /// <summary>
    /// Initializes a new instance of ValidationException with multiple messages for a single field.
    /// </summary>
    /// <param name="field">The field name that has the validation errors</param>
    /// <param name="messages">Array of validation error messages for the field</param>
    public ValidationException(string field, string[] messages) : base("Validation failed")
    {
        Errors = new Dictionary<string, string[]> { [field] = messages };
    }

    /// <summary>
    /// Convenience constructor for backward compatibility with Dictionary&lt;string, object&gt;.
    /// Converts various object types to string arrays for ValidationProblemDetails compatibility.
    /// </summary>
    /// <param name="errors">Dictionary where keys are field names and values can be strings, string arrays, or other objects</param>
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