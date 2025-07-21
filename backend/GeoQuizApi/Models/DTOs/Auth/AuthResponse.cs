namespace GeoQuizApi.Models.DTOs.Auth;

/// <summary>
/// Authentication response data
/// </summary>
public class AuthResponse
{
    /// <summary>
    /// User information
    /// </summary>
    public UserDto User { get; set; } = null!;

    /// <summary>
    /// JWT access token
    /// </summary>
    /// <example>eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</example>
    public string AccessToken { get; set; } = string.Empty;

    /// <summary>
    /// Refresh token for renewing access token
    /// </summary>
    /// <example>550e8400-e29b-41d4-a716-446655440000</example>
    public string RefreshToken { get; set; } = string.Empty;

    /// <summary>
    /// Access token lifetime in seconds
    /// </summary>
    /// <example>900</example>
    public int ExpiresIn { get; set; }
}