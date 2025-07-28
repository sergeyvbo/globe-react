using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using GeoQuizApi.Configuration;
using GeoQuizApi.Models.DTOs.Auth;
using GeoQuizApi.Models.Entities;
using GeoQuizApi.Services;

namespace GeoQuizApi.Controllers;

/// <summary>
/// Controller for managing user authentication and profile
/// </summary>
[ApiController]
[Route("api/auth")]
[Produces("application/json")]
[Tags("Authentication")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly JwtSettings _jwtSettings;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IAuthService authService,
        IOptions<JwtSettings> jwtSettings,
        ILogger<AuthController> logger)
    {
        _authService = authService;
        _jwtSettings = jwtSettings.Value;
        _logger = logger;
    }

    /// <summary>
    /// Register a new user
    /// </summary>
    /// <param name="request">User registration data</param>
    /// <returns>User information and access tokens</returns>
    /// <response code="201">User successfully registered</response>
    /// <response code="400">Invalid request data</response>
    /// <response code="409">User with this email already exists</response>
    /// <response code="422">Data validation error</response>
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
    {
        var (user, accessToken, refreshToken) = await _authService.RegisterAsync(
            request.Email, 
            request.Password, 
            request.Name);

        var response = new AuthResponse
        {
            User = MapToUserDto(user),
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresIn = _jwtSettings.AccessTokenExpirationMinutes * 60
        };

        _logger.LogInformation("Registration successful for {Email}, AccessToken length: {TokenLength}", 
            request.Email, accessToken?.Length ?? 0);

        return StatusCode(201, response);
    }

    /// <summary>
    /// Test endpoint for debugging
    /// </summary>
    [HttpGet("test")]
    public ActionResult<object> Test()
    {
        return Ok(new { message = "API is working", timestamp = DateTime.UtcNow });
    }

    /// <summary>
    /// User login
    /// </summary>
    /// <param name="request">Login data (email and password)</param>
    /// <returns>User information and access tokens</returns>
    /// <response code="200">Successful login</response>
    /// <response code="400">Invalid request data</response>
    /// <response code="401">Invalid credentials</response>
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        _logger.LogInformation("Login attempt for email: {Email}", request.Email);
        
        var (user, accessToken, refreshToken) = await _authService.LoginAsync(
            request.Email, 
            request.Password);

        var response = new AuthResponse
        {
            User = MapToUserDto(user),
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresIn = _jwtSettings.AccessTokenExpirationMinutes * 60
        };

        _logger.LogInformation("Login response created for user: {UserId}, AccessToken length: {TokenLength}", 
            user.Id, accessToken?.Length ?? 0);

        return Ok(response);
    }

    /// <summary>
    /// Refresh access tokens
    /// </summary>
    /// <param name="request">Refresh token for renewal</param>
    /// <returns>New access tokens</returns>
    /// <response code="200">Tokens successfully refreshed</response>
    /// <response code="400">Invalid request data</response>
    /// <response code="401">Invalid refresh token</response>
    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        var (user, accessToken, refreshToken) = await _authService.RefreshTokenAsync(request.RefreshToken);

        var response = new AuthResponse
        {
            User = MapToUserDto(user),
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresIn = _jwtSettings.AccessTokenExpirationMinutes * 60
        };

        return Ok(response);
    }

    /// <summary>
    /// User logout
    /// </summary>
    /// <param name="request">Refresh token to revoke</param>
    /// <returns>Confirmation of successful logout</returns>
    /// <response code="200">Successfully logged out</response>
    /// <response code="401">User not authenticated</response>
    [HttpPost("logout")]
    [Authorize]
    public async Task<ActionResult> Logout([FromBody] RefreshTokenRequest request)
    {
        await _authService.RevokeRefreshTokenAsync(request.RefreshToken);
        return Ok(new { message = "Logged out successfully" });
    }

    /// <summary>
    /// Get current user information
    /// </summary>
    /// <returns>Information about the current authenticated user</returns>
    /// <response code="200">User information retrieved successfully</response>
    /// <response code="401">User not authenticated</response>
    /// <response code="404">User not found</response>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> GetMe()
    {
        var userId = GetCurrentUserId();
        var user = await _authService.GetUserByIdAsync(userId);

        if (user == null)
        {
            throw new KeyNotFoundException("User not found");
        }

        return Ok(MapToUserDto(user));
    }

    /// <summary>
    /// Update user profile
    /// </summary>
    /// <param name="request">Profile update data</param>
    /// <returns>Updated user information</returns>
    /// <response code="200">Profile successfully updated</response>
    /// <response code="401">User not authenticated</response>
    /// <response code="404">User not found</response>
    [HttpPut("profile")]
    [Authorize]
    public async Task<ActionResult<UserDto>> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = GetCurrentUserId();
        var success = await _authService.UpdateUserProfileAsync(userId, request.Name, request.Avatar);

        if (!success)
        {
            throw new KeyNotFoundException("User not found");
        }

        var user = await _authService.GetUserByIdAsync(userId);
        return Ok(MapToUserDto(user!));
    }

    /// <summary>
    /// Change user password
    /// </summary>
    /// <param name="request">Password change data (current and new password)</param>
    /// <returns>Confirmation of successful password change</returns>
    /// <response code="200">Password successfully changed</response>
    /// <response code="400">Invalid request data</response>
    /// <response code="401">Invalid current password or user not authenticated</response>
    /// <response code="404">User not found</response>
    [HttpPut("change-password")]
    [Authorize]
    public async Task<ActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = GetCurrentUserId();
        var success = await _authService.ChangePasswordAsync(userId, request.CurrentPassword, request.NewPassword);

        if (!success)
        {
            throw new KeyNotFoundException("User not found");
        }

        return Ok(new { message = "Password changed successfully" });
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Invalid user token");
        }
        return userId;
    }

    private static UserDto MapToUserDto(User user)
    {
        return new UserDto
        {
            Id = user.Id.ToString(),
            Email = user.Email,
            Name = user.Name,
            Avatar = user.Avatar,
            Provider = user.Provider,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt
        };
    }
}