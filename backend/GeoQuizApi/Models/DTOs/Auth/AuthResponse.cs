using Swashbuckle.AspNetCore.Annotations;

namespace GeoQuizApi.Models.DTOs.Auth;

/// <summary>
/// Ответ с данными аутентификации
/// </summary>
[SwaggerSchema(Description = "Результат успешной аутентификации пользователя")]
public class AuthResponse
{
    /// <summary>
    /// Информация о пользователе
    /// </summary>
    [SwaggerSchema(Description = "Данные профиля аутентифицированного пользователя")]
    public UserDto User { get; set; } = null!;

    /// <summary>
    /// JWT токен доступа
    /// </summary>
    /// <example>eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</example>
    [SwaggerSchema(Description = "JWT токен для доступа к защищенным endpoints")]
    public string AccessToken { get; set; } = string.Empty;

    /// <summary>
    /// Refresh токен для обновления access токена
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    [SwaggerSchema(Description = "Токен для обновления access токена")]
    public string RefreshToken { get; set; } = string.Empty;

    /// <summary>
    /// Время жизни access токена в секундах
    /// </summary>
    /// <example>900</example>
    [SwaggerSchema(Description = "Время жизни access токена в секундах")]
    public int ExpiresIn { get; set; }
}