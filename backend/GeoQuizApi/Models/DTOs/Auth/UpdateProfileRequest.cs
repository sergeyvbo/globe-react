using System.ComponentModel.DataAnnotations;

namespace GeoQuizApi.Models.DTOs.Auth;

public class UpdateProfileRequest : IValidatableObject
{
    [MaxLength(100, ErrorMessage = "Name cannot exceed 100 characters")]
    [RegularExpression(@"^[a-zA-Z0-9\s\-_\.]*$", ErrorMessage = "Name contains invalid characters")]
    public string? Name { get; set; }

    [MaxLength(500, ErrorMessage = "Avatar URL cannot exceed 500 characters")]
    [Url(ErrorMessage = "Avatar must be a valid URL")]
    public string? Avatar { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        // Additional validation for name
        if (!string.IsNullOrEmpty(Name))
        {
            if (Name.Trim().Length == 0)
            {
                yield return new ValidationResult(
                    "Name cannot be empty or contain only whitespace",
                    new[] { nameof(Name) });
            }
        }

        // Additional validation for avatar URL
        if (!string.IsNullOrEmpty(Avatar))
        {
            if (!Uri.TryCreate(Avatar, UriKind.Absolute, out var uri) || 
                (uri.Scheme != "http" && uri.Scheme != "https"))
            {
                yield return new ValidationResult(
                    "Avatar must be a valid HTTP or HTTPS URL",
                    new[] { nameof(Avatar) });
            }
        }
    }
}