using System.ComponentModel.DataAnnotations;

namespace GeoQuizApi.Models.DTOs.Auth;

/// <summary>
/// Request for user login
/// </summary>
public class LoginRequest
{
    /// <summary>
    /// User email address
    /// </summary>
    /// <example>user@example.com</example>
    [Required(ErrorMessage = "Email is required")]
    [EmailAddress(ErrorMessage = "Invalid email format")]
    [MaxLength(254, ErrorMessage = "Email cannot exceed 254 characters")]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// User password
    /// </summary>
    /// <example>MySecurePassword123</example>
    [Required(ErrorMessage = "Password is required")]
    [MaxLength(128, ErrorMessage = "Password cannot exceed 128 characters")]
    public string Password { get; set; } = string.Empty;
}