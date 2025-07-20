using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace GeoQuizApi.Models.DTOs.Auth;

public class RegisterRequest : IValidatableObject
{
    [Required(ErrorMessage = "Email is required")]
    [EmailAddress(ErrorMessage = "Invalid email format")]
    [MaxLength(254, ErrorMessage = "Email cannot exceed 254 characters")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required")]
    [MinLength(8, ErrorMessage = "Password must be at least 8 characters long")]
    [MaxLength(128, ErrorMessage = "Password cannot exceed 128 characters")]
    public string Password { get; set; } = string.Empty;

    [MaxLength(100, ErrorMessage = "Name cannot exceed 100 characters")]
    [RegularExpression(@"^[a-zA-Z0-9\s\-_\.]*$", ErrorMessage = "Name contains invalid characters")]
    public string? Name { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        // Password complexity validation
        if (!string.IsNullOrEmpty(Password))
        {
            if (!Regex.IsMatch(Password, @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$"))
            {
                yield return new ValidationResult(
                    "Password must contain at least one lowercase letter, one uppercase letter, and one digit",
                    new[] { nameof(Password) });
            }
        }

        // Email domain validation (basic)
        if (!string.IsNullOrEmpty(Email) && Email.Contains("@"))
        {
            var domain = Email.Split('@').LastOrDefault();
            if (!string.IsNullOrEmpty(domain) && domain.Length < 2)
            {
                yield return new ValidationResult(
                    "Invalid email domain",
                    new[] { nameof(Email) });
            }
        }
    }
}