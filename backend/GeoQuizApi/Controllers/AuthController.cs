using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Swashbuckle.AspNetCore.Annotations;
using GeoQuizApi.Configuration;
using GeoQuizApi.Models.DTOs.Auth;
using GeoQuizApi.Models.Entities;
using GeoQuizApi.Services;

namespace GeoQuizApi.Controllers;

/// <summary>
/// Контроллер для управления аутентификацией и профилем пользователя
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
    /// Регистрация нового пользователя
    /// </summary>
    /// <param name="request">Данные для регистрации пользователя</param>
    /// <returns>Информация о пользователе и токены доступа</returns>
    /// <response code="201">Пользователь успешно зарегистрирован</response>
    /// <response code="400">Некорректные данные запроса</response>
    /// <response code="409">Пользователь с таким email уже существует</response>
    /// <response code="422">Ошибка валидации данных</response>
    [HttpPost("register")]
    [SwaggerOperation(
        Summary = "Регистрация нового пользователя",
        Description = "Создает новый аккаунт пользователя и возвращает JWT токены для аутентификации",
        OperationId = "RegisterUser",
        Tags = new[] { "Authentication" }
    )]
    [SwaggerResponse(201, "Пользователь успешно зарегистрирован", typeof(AuthResponse))]
    [SwaggerResponse(400, "Некорректные данные запроса")]
    [SwaggerResponse(409, "Пользователь с таким email уже существует")]
    [SwaggerResponse(422, "Ошибка валидации данных")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
    {
        try
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

            return CreatedAtAction(nameof(GetMe), response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during user registration");
            return StatusCode(500, new { error = "An error occurred during registration" });
        }
    }

    /// <summary>
    /// Вход пользователя в систему
    /// </summary>
    /// <param name="request">Данные для входа (email и пароль)</param>
    /// <returns>Информация о пользователе и токены доступа</returns>
    /// <response code="200">Успешный вход в систему</response>
    /// <response code="400">Некорректные данные запроса</response>
    /// <response code="401">Неверные учетные данные</response>
    [HttpPost("login")]
    [SwaggerOperation(
        Summary = "Вход пользователя в систему",
        Description = "Аутентифицирует пользователя по email и паролю, возвращает JWT токены",
        OperationId = "LoginUser",
        Tags = new[] { "Authentication" }
    )]
    [SwaggerResponse(200, "Успешный вход в систему", typeof(AuthResponse))]
    [SwaggerResponse(400, "Некорректные данные запроса")]
    [SwaggerResponse(401, "Неверные учетные данные")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        try
        {
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

            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during user login");
            return StatusCode(500, new { error = "An error occurred during login" });
        }
    }

    /// <summary>
    /// Обновление токенов доступа
    /// </summary>
    /// <param name="request">Refresh токен для обновления</param>
    /// <returns>Новые токены доступа</returns>
    /// <response code="200">Токены успешно обновлены</response>
    /// <response code="400">Некорректные данные запроса</response>
    /// <response code="401">Недействительный refresh токен</response>
    [HttpPost("refresh")]
    [SwaggerOperation(
        Summary = "Обновление токенов доступа",
        Description = "Обновляет access и refresh токены используя действующий refresh токен",
        OperationId = "RefreshToken",
        Tags = new[] { "Authentication" }
    )]
    [SwaggerResponse(200, "Токены успешно обновлены", typeof(AuthResponse))]
    [SwaggerResponse(400, "Некорректные данные запроса")]
    [SwaggerResponse(401, "Недействительный refresh токен")]
    public async Task<ActionResult<AuthResponse>> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        try
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
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during token refresh");
            return StatusCode(500, new { error = "An error occurred during token refresh" });
        }
    }

    /// <summary>
    /// Выход пользователя из системы
    /// </summary>
    /// <param name="request">Refresh токен для отзыва</param>
    /// <returns>Подтверждение успешного выхода</returns>
    /// <response code="200">Успешный выход из системы</response>
    /// <response code="401">Пользователь не аутентифицирован</response>
    [HttpPost("logout")]
    [Authorize]
    [SwaggerOperation(
        Summary = "Выход пользователя из системы",
        Description = "Отзывает refresh токен и завершает сессию пользователя",
        OperationId = "LogoutUser",
        Tags = new[] { "Authentication" }
    )]
    [SwaggerResponse(200, "Успешный выход из системы")]
    [SwaggerResponse(401, "Пользователь не аутентифицирован")]
    public async Task<ActionResult> Logout([FromBody] RefreshTokenRequest request)
    {
        try
        {
            await _authService.RevokeRefreshTokenAsync(request.RefreshToken);
            return Ok(new { message = "Logged out successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during logout");
            return StatusCode(500, new { error = "An error occurred during logout" });
        }
    }

    /// <summary>
    /// Получение информации о текущем пользователе
    /// </summary>
    /// <returns>Информация о текущем аутентифицированном пользователе</returns>
    /// <response code="200">Информация о пользователе получена успешно</response>
    /// <response code="401">Пользователь не аутентифицирован</response>
    /// <response code="404">Пользователь не найден</response>
    [HttpGet("me")]
    [Authorize]
    [SwaggerOperation(
        Summary = "Получение информации о текущем пользователе",
        Description = "Возвращает профиль текущего аутентифицированного пользователя",
        OperationId = "GetCurrentUser",
        Tags = new[] { "Authentication" }
    )]
    [SwaggerResponse(200, "Информация о пользователе получена успешно", typeof(UserDto))]
    [SwaggerResponse(401, "Пользователь не аутентифицирован")]
    [SwaggerResponse(404, "Пользователь не найден")]
    public async Task<ActionResult<UserDto>> GetMe()
    {
        try
        {
            var userId = GetCurrentUserId();
            var user = await _authService.GetUserByIdAsync(userId);

            if (user == null)
            {
                return NotFound(new { error = "User not found" });
            }

            return Ok(MapToUserDto(user));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting current user");
            return StatusCode(500, new { error = "An error occurred while getting user information" });
        }
    }

    /// <summary>
    /// Обновление профиля пользователя
    /// </summary>
    /// <param name="request">Данные для обновления профиля</param>
    /// <returns>Обновленная информация о пользователе</returns>
    /// <response code="200">Профиль успешно обновлен</response>
    /// <response code="401">Пользователь не аутентифицирован</response>
    /// <response code="404">Пользователь не найден</response>
    [HttpPut("profile")]
    [Authorize]
    [SwaggerOperation(
        Summary = "Обновление профиля пользователя",
        Description = "Обновляет имя и аватар текущего пользователя",
        OperationId = "UpdateUserProfile",
        Tags = new[] { "Authentication" }
    )]
    [SwaggerResponse(200, "Профиль успешно обновлен", typeof(UserDto))]
    [SwaggerResponse(401, "Пользователь не аутентифицирован")]
    [SwaggerResponse(404, "Пользователь не найден")]
    public async Task<ActionResult<UserDto>> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var success = await _authService.UpdateUserProfileAsync(userId, request.Name, request.Avatar);

            if (!success)
            {
                return NotFound(new { error = "User not found" });
            }

            var user = await _authService.GetUserByIdAsync(userId);
            return Ok(MapToUserDto(user!));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user profile");
            return StatusCode(500, new { error = "An error occurred while updating profile" });
        }
    }

    /// <summary>
    /// Смена пароля пользователя
    /// </summary>
    /// <param name="request">Данные для смены пароля (текущий и новый пароль)</param>
    /// <returns>Подтверждение успешной смены пароля</returns>
    /// <response code="200">Пароль успешно изменен</response>
    /// <response code="400">Некорректные данные запроса</response>
    /// <response code="401">Неверный текущий пароль или пользователь не аутентифицирован</response>
    /// <response code="404">Пользователь не найден</response>
    [HttpPut("change-password")]
    [Authorize]
    [SwaggerOperation(
        Summary = "Смена пароля пользователя",
        Description = "Изменяет пароль текущего пользователя после проверки текущего пароля",
        OperationId = "ChangeUserPassword",
        Tags = new[] { "Authentication" }
    )]
    [SwaggerResponse(200, "Пароль успешно изменен")]
    [SwaggerResponse(400, "Некорректные данные запроса")]
    [SwaggerResponse(401, "Неверный текущий пароль или пользователь не аутентифицирован")]
    [SwaggerResponse(404, "Пользователь не найден")]
    public async Task<ActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var success = await _authService.ChangePasswordAsync(userId, request.CurrentPassword, request.NewPassword);

            if (!success)
            {
                return NotFound(new { error = "User not found" });
            }

            return Ok(new { message = "Password changed successfully" });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error changing password");
            return StatusCode(500, new { error = "An error occurred while changing password" });
        }
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