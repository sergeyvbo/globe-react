using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace GeoQuizApi.Models.DTOs.Auth;

public class ChangePasswordRequest : IValidatableObject
{
    [Required(ErrorMessage = "Current password is required")]
    [MaxLength(128, ErrorMessage = "Current password cannot exceed 128 characters")]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "New password is required")]
    [MinLength(8, ErrorMessage = "New password must be at least 8 characters long")]
    [MaxLength(128, ErrorMessage = "New password cannot exceed 128 characters")]
    public string NewPassword { get; set; } = string.Empty;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        // Password complexity validation
        if (!string.IsNullOrEmpty(NewPassword))
        {
            if (!Regex.IsMatch(NewPassword, @"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$"))
            {
                yield return new ValidationResult(
                    "New password must contain at least one lowercase letter, one uppercase letter, and one digit",
                    new[] { nameof(NewPassword) });
            }
        }

        // Ensure new password is different from current password
        if (!string.IsNullOrEmpty(CurrentPassword) && !string.IsNullOrEmpty(NewPassword) && 
            CurrentPassword == NewPassword)
        {
            yield return new ValidationResult(
                "New password must be different from current password",
                new[] { nameof(NewPassword) });
        }
    }
}