using GeoQuizApi.Models.Entities;

namespace GeoQuizApi.Services;

public interface IAuthService
{
    Task<(User user, string accessToken, string refreshToken)> RegisterAsync(string email, string password, string? name = null);
    Task<(User user, string accessToken, string refreshToken)> LoginAsync(string email, string password);
    Task<(User user, string accessToken, string refreshToken)> RefreshTokenAsync(string refreshToken);
    Task<bool> RevokeRefreshTokenAsync(string refreshToken);
    Task<bool> RevokeAllUserTokensAsync(Guid userId);
    Task<User?> GetUserByIdAsync(Guid userId);
    Task<User?> GetUserByEmailAsync(string email);
    Task<bool> UpdateUserProfileAsync(Guid userId, string? name, string? avatar);
    Task<bool> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword);
    bool ValidateEmail(string email);
    bool ValidatePassword(string password);
}