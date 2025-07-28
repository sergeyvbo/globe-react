using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using BCrypt.Net;
using GeoQuizApi.Data;
using GeoQuizApi.Models.Entities;
using GeoQuizApi.Configuration;
using GeoQuizApi.Middleware;

namespace GeoQuizApi.Services;

public class AuthService : IAuthService
{
    private readonly GeoQuizDbContext _context;
    private readonly IJwtService _jwtService;
    private readonly JwtSettings _jwtSettings;
    private readonly ILogger<AuthService> _logger;
    
    // Semaphore to prevent concurrent registration attempts
    private static readonly SemaphoreSlim _registrationSemaphore = new(1, 1);

    public AuthService(
        GeoQuizDbContext context,
        IJwtService jwtService,
        IOptions<JwtSettings> jwtSettings,
        ILogger<AuthService> logger)
    {
        _context = context;
        _jwtService = jwtService;
        _jwtSettings = jwtSettings.Value;
        _logger = logger;
    }

    public async Task<(User user, string accessToken, string refreshToken)> RegisterAsync(string email, string password, string? name = null)
    {
        // Validate input
        var validationErrors = new Dictionary<string, string[]>();
        
        if (!ValidateEmail(email))
        {
            validationErrors["email"] = new[] { "Invalid email format" };
        }

        if (!ValidatePassword(password))
        {
            validationErrors["password"] = new[] { "Password must be at least 8 characters long and contain letters and numbers" };
        }

        if (validationErrors.Any())
        {
            throw new ValidationException(validationErrors);
        }

        // Use retry logic to handle race conditions
        return await ConcurrencyUtilities.ExecuteWithRetryAsync(async () =>
        {
            // Use semaphore to prevent concurrent registrations with same email
            await _registrationSemaphore.WaitAsync();
            try
            {
                // Check if user already exists
                var existingUser = await GetUserByEmailAsync(email);
                if (existingUser != null)
                {
                    throw new InvalidOperationException("User with this email already exists");
                }

                // Create new user with unique timestamp
                var user = new User
                {
                    Email = email.ToLowerInvariant(),
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                    Name = name?.Trim(),
                    CreatedAt = TimestampManager.GetUniqueTimestamp()
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                _logger.LogInformation("New user registered successfully. Email: {Email}, UserId: {UserId}", email, user.Id);

                // Generate tokens
                var accessToken = _jwtService.GenerateAccessToken(user);
                var refreshToken = await CreateRefreshTokenAsync(user.Id);

                return (user, accessToken, refreshToken);
            }
            finally
            {
                _registrationSemaphore.Release();
            }
        }, maxRetries: 3, logger: _logger);
    }

    public async Task<(User user, string accessToken, string refreshToken)> LoginAsync(string email, string password)
    {
        // Validate input
        var validationErrors = new Dictionary<string, string[]>();
        
        if (!ValidateEmail(email))
        {
            validationErrors["email"] = new[] { "Invalid email format" };
        }

        if (string.IsNullOrWhiteSpace(password))
        {
            validationErrors["password"] = new[] { "Password is required" };
        }

        if (validationErrors.Any())
        {
            throw new ValidationException(validationErrors);
        }

        // Find user
        var user = await GetUserByEmailAsync(email);
        if (user == null)
        {
            _logger.LogWarning("Login attempt with non-existent email: {Email}", email);
            throw new UnauthorizedAccessException("Invalid email or password");
        }

        // Verify password
        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
        {
            _logger.LogWarning("Failed login attempt - incorrect password for email: {Email}, UserId: {UserId}", email, user.Id);
            throw new UnauthorizedAccessException("Invalid email or password");
        }

        // Update last login with retry logic for concurrency
        await ConcurrencyUtilities.ExecuteWithRetryAsync(async () =>
        {
            user.LastLoginAt = TimestampManager.GetUniqueTimestamp();
            await _context.SaveChangesAsync();
            return true;
        }, logger: _logger);

        _logger.LogInformation("User logged in successfully. Email: {Email}, UserId: {UserId}", email, user.Id);

        // Generate tokens
        var accessToken = _jwtService.GenerateAccessToken(user);
        var refreshToken = await CreateRefreshTokenAsync(user.Id);

        return (user, accessToken, refreshToken);
    }

    public async Task<(User user, string accessToken, string refreshToken)> RefreshTokenAsync(string refreshToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            throw new ArgumentException("Refresh token is required", nameof(refreshToken));
        }

        // Use transaction to ensure atomic token refresh
        return await ConcurrencyUtilities.ExecuteWithRetryAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Find refresh token with row-level locking (if supported by database)
                var storedToken = await _context.RefreshTokens
                    .Include(rt => rt.User)
                    .FirstOrDefaultAsync(rt => rt.Token == refreshToken && !rt.IsRevoked);

                if (storedToken == null)
                {
                    _logger.LogWarning("Token refresh attempt with invalid refresh token");
                    throw new UnauthorizedAccessException("Invalid or expired refresh token");
                }

                if (storedToken.ExpiresAt <= DateTime.UtcNow)
                {
                    _logger.LogWarning("Token refresh attempt with expired refresh token for user: {UserId}", storedToken.UserId);
                    throw new UnauthorizedAccessException("Invalid or expired refresh token");
                }

                // Atomically revoke old token and create new one
                storedToken.IsRevoked = true;
                
                var accessToken = _jwtService.GenerateAccessToken(storedToken.User);
                var newRefreshToken = await CreateRefreshTokenAsync(storedToken.UserId);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Tokens refreshed successfully for user: {UserId}", storedToken.UserId);

                return (storedToken.User, accessToken, newRefreshToken);
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }, logger: _logger);
    }

    public async Task<bool> RevokeRefreshTokenAsync(string refreshToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return false;
        }

        return await ConcurrencyUtilities.ExecuteWithRetryAsync(async () =>
        {
            var storedToken = await _context.RefreshTokens
                .FirstOrDefaultAsync(rt => rt.Token == refreshToken && !rt.IsRevoked);

            if (storedToken == null)
            {
                return false;
            }

            storedToken.IsRevoked = true;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Refresh token revoked successfully for user: {UserId}", storedToken.UserId);
            return true;
        }, logger: _logger);
    }

    public async Task<bool> RevokeAllUserTokensAsync(Guid userId)
    {
        return await ConcurrencyUtilities.ExecuteWithRetryAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var userTokens = await _context.RefreshTokens
                    .Where(rt => rt.UserId == userId && !rt.IsRevoked)
                    .ToListAsync();

                if (!userTokens.Any())
                {
                    return false;
                }

                foreach (var token in userTokens)
                {
                    token.IsRevoked = true;
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("All refresh tokens revoked for user: {UserId}", userId);
                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }, logger: _logger);
    }

    public async Task<User?> GetUserByIdAsync(Guid userId)
    {
        return await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId);
    }

    public async Task<User?> GetUserByEmailAsync(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return null;
        }

        return await _context.Users
            .FirstOrDefaultAsync(u => u.Email == email.ToLowerInvariant());
    }

    public async Task<bool> UpdateUserProfileAsync(Guid userId, string? name, string? avatar)
    {
        return await ConcurrencyUtilities.ExecuteWithRetryAsync(async () =>
        {
            var user = await GetUserByIdAsync(userId);
            if (user == null)
            {
                return false;
            }

            user.Name = name?.Trim();
            user.Avatar = avatar?.Trim();

            await _context.SaveChangesAsync();

            _logger.LogInformation("Profile updated for user: {UserId}", userId);
            return true;
        }, logger: _logger);
    }

    public async Task<bool> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword)
    {
        var validationErrors = new Dictionary<string, string[]>();
        
        if (string.IsNullOrWhiteSpace(currentPassword))
        {
            validationErrors["currentPassword"] = new[] { "Current password is required" };
        }

        if (string.IsNullOrWhiteSpace(newPassword))
        {
            validationErrors["newPassword"] = new[] { "New password is required" };
        }
        else if (!ValidatePassword(newPassword))
        {
            validationErrors["newPassword"] = new[] { "New password must be at least 8 characters long and contain letters and numbers" };
        }

        if (validationErrors.Any())
        {
            throw new ValidationException(validationErrors);
        }

        return await ConcurrencyUtilities.ExecuteWithRetryAsync(async () =>
        {
            var user = await GetUserByIdAsync(userId);
            if (user == null)
            {
                return false;
            }

            // Verify current password
            if (!BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash))
            {
                _logger.LogWarning("Failed password change attempt - incorrect current password for user: {UserId}", userId);
                throw new UnauthorizedAccessException("Current password is incorrect");
            }

            // Update password
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Password changed successfully for user: {UserId}", userId);
            return true;
        }, logger: _logger);
    }

    public bool ValidateEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return false;
        }

        try
        {
            var emailRegex = new Regex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.IgnoreCase);
            return emailRegex.IsMatch(email) && email.Length <= 255;
        }
        catch
        {
            return false;
        }
    }

    public bool ValidatePassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            return false;
        }

        // Password must be at least 8 characters long and contain both letters and numbers
        return password.Length >= 8 &&
               password.Any(char.IsLetter) &&
               password.Any(char.IsDigit);
    }

    private async Task<string> CreateRefreshTokenAsync(Guid userId)
    {
        var refreshToken = new RefreshToken
        {
            Token = _jwtService.GenerateRefreshToken(),
            UserId = userId,
            ExpiresAt = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpirationDays),
            CreatedAt = TimestampManager.GetUniqueTimestamp()
        };

        _context.RefreshTokens.Add(refreshToken);
        await _context.SaveChangesAsync();

        return refreshToken.Token;
    }
}