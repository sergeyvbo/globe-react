using FluentAssertions;
using GeoQuizApi.Configuration;
using GeoQuizApi.Data;
using GeoQuizApi.Models.Entities;
using GeoQuizApi.Services;
using GeoQuizApi.Tests.TestUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;

namespace GeoQuizApi.Tests.Unit.Services;

[Trait("Category", "Unit")]
public class AuthServiceTests : BaseUnitTest
{
    private readonly Mock<IJwtService> _mockJwtService;
    private readonly Mock<ILogger<AuthService>> _mockLogger;
    private readonly Mock<IOptions<JwtSettings>> _mockJwtSettings;
    private readonly AuthService _authService;

    public AuthServiceTests()
    {
        _mockJwtService = new Mock<IJwtService>();
        _mockLogger = CreateMockLogger<AuthService>();
        
        // Setup JWT settings mock
        _mockJwtSettings = new Mock<IOptions<JwtSettings>>();
        _mockJwtSettings.Setup(x => x.Value).Returns(new JwtSettings
        {
            SecretKey = "test-secret-key-that-is-long-enough-for-jwt-signing",
            Issuer = "test-issuer",
            Audience = "test-audience",
            AccessTokenExpirationMinutes = 15,
            RefreshTokenExpirationDays = 7
        });
        
        _authService = new AuthService(_context, _mockJwtService.Object, _mockJwtSettings.Object, _mockLogger.Object);
    }

    [Fact]
    public async Task RegisterAsync_WithValidData_ShouldCreateUserAndReturnTokens()
    {
        // Arrange
        var email = TestDataBuilder.GenerateUniqueEmail();
        var password = "TestPassword123";
        var name = "Test User";
        var expectedAccessToken = "access_token";
        var expectedRefreshToken = "refresh_token";

        _mockJwtService.Setup(x => x.GenerateAccessToken(It.IsAny<User>()))
            .Returns(expectedAccessToken);
        _mockJwtService.Setup(x => x.GenerateRefreshToken())
            .Returns(expectedRefreshToken);

        // Act
        var result = await _authService.RegisterAsync(email, password, name);

        // Assert
        result.user.Should().NotBeNull();
        result.user.Email.Should().Be(email);
        result.user.Name.Should().Be(name);
        result.accessToken.Should().Be(expectedAccessToken);
        result.refreshToken.Should().Be(expectedRefreshToken);

        // Verify user was saved to database
        var savedUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        savedUser.Should().NotBeNull();
        savedUser!.Email.Should().Be(email);
        savedUser.Name.Should().Be(name);
        
        // Verify password was hashed
        BCrypt.Net.BCrypt.Verify(password, savedUser.PasswordHash).Should().BeTrue();
    }

    [Fact]
    public async Task RegisterAsync_WithExistingEmail_ShouldThrowException()
    {
        // Arrange
        var email = TestDataBuilder.GenerateUniqueEmail();
        var password = "TestPassword123";
        
        // Create existing user using TestDataBuilder
        var existingUser = TestDataBuilder.User()
            .WithEmail(email)
            .WithPassword("OldPassword123")
            .Build();
        _context.Users.Add(existingUser);
        await _context.SaveChangesAsync();

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _authService.RegisterAsync(email, password));
    }

    [Fact]
    public async Task LoginAsync_WithValidCredentials_ShouldReturnUserAndTokens()
    {
        // Arrange
        var email = TestDataBuilder.GenerateUniqueEmail();
        var password = "TestPassword123";
        var expectedAccessToken = "access_token";
        var expectedRefreshToken = "refresh_token";

        var user = TestDataBuilder.User()
            .WithEmail(email)
            .WithPassword(password)
            .WithName("Login User")
            .Build();
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        _mockJwtService.Setup(x => x.GenerateAccessToken(It.IsAny<User>()))
            .Returns(expectedAccessToken);
        _mockJwtService.Setup(x => x.GenerateRefreshToken())
            .Returns(expectedRefreshToken);

        // Act
        var result = await _authService.LoginAsync(email, password);

        // Assert
        result.user.Should().NotBeNull();
        result.user.Email.Should().Be(email);
        result.accessToken.Should().Be(expectedAccessToken);
        result.refreshToken.Should().Be(expectedRefreshToken);

        // Verify LastLoginAt was updated
        var updatedUser = await _context.Users.FindAsync(user.Id);
        updatedUser!.LastLoginAt.Should().NotBeNull();
    }

    [Fact]
    public async Task LoginAsync_WithInvalidEmail_ShouldThrowException()
    {
        // Arrange
        var email = TestDataBuilder.GenerateUniqueEmail();
        var password = "TestPassword123";

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _authService.LoginAsync(email, password));
    }

    [Fact]
    public async Task LoginAsync_WithInvalidPassword_ShouldThrowException()
    {
        // Arrange
        var email = TestDataBuilder.GenerateUniqueEmail();
        var correctPassword = "CorrectPassword123";
        var wrongPassword = "WrongPassword123";

        var user = TestDataBuilder.User()
            .WithEmail(email)
            .WithPassword(correctPassword)
            .Build();
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _authService.LoginAsync(email, wrongPassword));
    }

    [Fact]
    public async Task RefreshTokenAsync_WithValidToken_ShouldReturnNewTokens()
    {
        // Arrange
        var refreshTokenValue = "valid_refresh_token";
        var expectedAccessToken = "new_access_token";
        var expectedRefreshToken = "new_refresh_token";

        var user = TestDataBuilder.User()
            .WithEmail(TestDataBuilder.GenerateUniqueEmail())
            .WithPassword("Password123")
            .Build();
        _context.Users.Add(user);

        var refreshToken = TestDataBuilder.RefreshToken()
            .WithToken(refreshTokenValue)
            .WithUserId(user.Id)
            .WithExpiresAt(TestDataBuilder.GenerateUniqueTimestamp().AddDays(7))
            .Build();
        refreshToken.User = user;
        _context.RefreshTokens.Add(refreshToken);
        await _context.SaveChangesAsync();

        _mockJwtService.Setup(x => x.GenerateAccessToken(It.IsAny<User>()))
            .Returns(expectedAccessToken);
        _mockJwtService.Setup(x => x.GenerateRefreshToken())
            .Returns(expectedRefreshToken);

        // Act
        var result = await _authService.RefreshTokenAsync(refreshTokenValue);

        // Assert
        result.user.Should().NotBeNull();
        result.user.Id.Should().Be(user.Id);
        result.accessToken.Should().Be(expectedAccessToken);
        result.refreshToken.Should().Be(expectedRefreshToken);

        // Verify old token was revoked
        var oldToken = await _context.RefreshTokens.FindAsync(refreshToken.Id);
        oldToken!.IsRevoked.Should().BeTrue();
    }

    [Fact]
    public async Task RefreshTokenAsync_WithInvalidToken_ShouldThrowException()
    {
        // Arrange
        var invalidToken = "invalid_refresh_token";

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _authService.RefreshTokenAsync(invalidToken));
    }

    [Fact]
    public async Task RefreshTokenAsync_WithExpiredToken_ShouldThrowException()
    {
        // Arrange
        var expiredTokenValue = "expired_refresh_token";

        var user = TestDataBuilder.User()
            .WithEmail(TestDataBuilder.GenerateUniqueEmail())
            .WithPassword("Password123")
            .Build();
        _context.Users.Add(user);

        var expiredToken = TestDataBuilder.RefreshToken()
            .WithToken(expiredTokenValue)
            .WithUserId(user.Id)
            .WithExpiresAt(TestDataBuilder.GenerateUniqueTimestamp().AddDays(-1)) // Expired
            .WithCreatedAt(TestDataBuilder.GenerateUniqueTimestamp().AddDays(-8))
            .Build();
        expiredToken.User = user;
        _context.RefreshTokens.Add(expiredToken);
        await _context.SaveChangesAsync();

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _authService.RefreshTokenAsync(expiredTokenValue));
    }

    [Theory]
    [InlineData("valid@example.com", true)]
    [InlineData("another.valid+email@domain.co.uk", true)]
    [InlineData("invalid-email", false)]
    [InlineData("@invalid.com", false)]
    [InlineData("invalid@", false)]
    [InlineData("", false)]
    public void ValidateEmail_ShouldReturnCorrectResult(string email, bool expected)
    {
        // Act
        var result = _authService.ValidateEmail(email);

        // Assert
        result.Should().Be(expected);
    }

    [Theory]
    [InlineData("ValidPass123", true)]
    [InlineData("AnotherValid1", true)]
    [InlineData("short", false)]
    [InlineData("", false)]
    [InlineData("NoNumbers", false)]
    [InlineData("nonumbers123", true)] // Only requires letters and digits, not case mix
    [InlineData("NOLOWERCASE123", true)] // Only requires letters and digits, not case mix
    public void ValidatePassword_ShouldReturnCorrectResult(string password, bool expected)
    {
        // Act
        var result = _authService.ValidatePassword(password);

        // Assert
        result.Should().Be(expected);
    }

    [Fact]
    public async Task UpdateUserProfileAsync_WithValidData_ShouldUpdateUser()
    {
        // Arrange
        var user = TestDataBuilder.User()
            .WithEmail(TestDataBuilder.GenerateUniqueEmail())
            .WithPassword("Password123")
            .WithName("Old Name")
            .Build();
        user.Avatar = "old-avatar.jpg";
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var newName = "New Name";
        var newAvatar = "new-avatar.jpg";

        // Act
        var result = await _authService.UpdateUserProfileAsync(user.Id, newName, newAvatar);

        // Assert
        result.Should().BeTrue();

        var updatedUser = await _context.Users.FindAsync(user.Id);
        updatedUser!.Name.Should().Be(newName);
        updatedUser.Avatar.Should().Be(newAvatar);
    }

    [Fact]
    public async Task ChangePasswordAsync_WithValidCurrentPassword_ShouldUpdatePassword()
    {
        // Arrange
        var currentPassword = "CurrentPassword123";
        var newPassword = "NewPassword123";

        var user = TestDataBuilder.User()
            .WithEmail(TestDataBuilder.GenerateUniqueEmail())
            .WithPassword(currentPassword)
            .Build();
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Act
        var result = await _authService.ChangePasswordAsync(user.Id, currentPassword, newPassword);

        // Assert
        result.Should().BeTrue();

        var updatedUser = await _context.Users.FindAsync(user.Id);
        BCrypt.Net.BCrypt.Verify(newPassword, updatedUser!.PasswordHash).Should().BeTrue();
        BCrypt.Net.BCrypt.Verify(currentPassword, updatedUser.PasswordHash).Should().BeFalse();
    }

    [Fact]
    public async Task ChangePasswordAsync_WithInvalidCurrentPassword_ShouldThrowException()
    {
        // Arrange
        var currentPassword = "CurrentPassword123";
        var wrongCurrentPassword = "WrongPassword123";
        var newPassword = "NewPassword123";

        var user = TestDataBuilder.User()
            .WithEmail(TestDataBuilder.GenerateUniqueEmail())
            .WithPassword(currentPassword)
            .Build();
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _authService.ChangePasswordAsync(user.Id, wrongCurrentPassword, newPassword));

        // Verify password wasn't changed
        var unchangedUser = await _context.Users.FindAsync(user.Id);
        BCrypt.Net.BCrypt.Verify(currentPassword, unchangedUser!.PasswordHash).Should().BeTrue();
    }


}