using System.ComponentModel.DataAnnotations;
using Swashbuckle.AspNetCore.Annotations;

namespace GeoQuizApi.Models.DTOs.Auth;

/// <summary>
/// Запрос для входа пользователя в систему
/// </summary>
[SwaggerSchema(Description = "Данные для аутентификации пользователя")]
public class LoginRequest
{
    /// <summary>
    /// Email адрес пользователя
    /// </summary>
    /// <example>user@example.com</example>
    [Required(ErrorMessage = "Email is required")]
    [EmailAddress(ErrorMessage = "Invalid email format")]
    [MaxLength(254, ErrorMessage = "Email cannot exceed 254 characters")]
    [SwaggerSchema(Description = "Email адрес пользователя для входа в систему")]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Пароль пользователя
    /// </summary>
    /// <example>MySecurePassword123</example>
    [Required(ErrorMessage = "Password is required")]
    [MaxLength(128, ErrorMessage = "Password cannot exceed 128 characters")]
    [SwaggerSchema(Description = "Пароль пользователя")]
    public string Password { get; set; } = string.Empty;
}