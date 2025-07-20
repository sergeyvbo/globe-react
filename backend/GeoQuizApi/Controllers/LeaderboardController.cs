using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Swashbuckle.AspNetCore.Annotations;
using GeoQuizApi.Services;
using GeoQuizApi.Models.DTOs.Leaderboard;

namespace GeoQuizApi.Controllers;

/// <summary>
/// Контроллер для управления списками лидеров
/// </summary>
[ApiController]
[Route("api/leaderboard")]
[Produces("application/json")]
[Tags("Leaderboard")]
public class LeaderboardController : ControllerBase
{
    private readonly ILeaderboardService _leaderboardService;
    private readonly ILogger<LeaderboardController> _logger;

    public LeaderboardController(ILeaderboardService leaderboardService, ILogger<LeaderboardController> logger)
    {
        _leaderboardService = leaderboardService;
        _logger = logger;
    }

    /// <summary>
    /// Получение глобального списка лидеров
    /// </summary>
    /// <param name="page">Номер страницы (по умолчанию 1)</param>
    /// <param name="pageSize">Количество записей на странице (по умолчанию 50, максимум 100)</param>
    /// <returns>Список лидеров с лучшими игроками</returns>
    /// <response code="200">Список лидеров успешно получен</response>
    /// <response code="400">Некорректные параметры запроса</response>
    [HttpGet]
    [SwaggerOperation(
        Summary = "Получение глобального списка лидеров",
        Description = "Возвращает список лучших игроков по всем типам игр с поддержкой пагинации",
        OperationId = "GetGlobalLeaderboard",
        Tags = new[] { "Leaderboard" }
    )]
    [SwaggerResponse(200, "Список лидеров успешно получен", typeof(LeaderboardResponse))]
    [SwaggerResponse(400, "Некорректные параметры запроса")]
    public async Task<ActionResult<LeaderboardResponse>> GetGlobalLeaderboard(
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 50)
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            var leaderboard = await _leaderboardService.GetGlobalLeaderboardAsync(page, pageSize, currentUserId);
            
            _logger.LogInformation("Retrieved global leaderboard - Page: {Page}, Size: {PageSize}, Total: {Total}", 
                page, pageSize, leaderboard.TotalPlayers);
            
            return Ok(leaderboard);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Invalid parameters for global leaderboard: {Message}", ex.Message);
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving global leaderboard");
            return StatusCode(500, new { error = "An error occurred while retrieving the leaderboard" });
        }
    }

    /// <summary>
    /// Получение списка лидеров по типу игры
    /// </summary>
    /// <param name="gameType">Тип игры (countries, flags, states)</param>
    /// <param name="page">Номер страницы (по умолчанию 1)</param>
    /// <param name="pageSize">Количество записей на странице (по умолчанию 50, максимум 100)</param>
    /// <returns>Список лидеров, отфильтрованный по типу игры</returns>
    /// <response code="200">Список лидеров успешно получен</response>
    /// <response code="400">Некорректные параметры запроса или неизвестный тип игры</response>
    [HttpGet("game-type/{gameType}")]
    [SwaggerOperation(
        Summary = "Получение списка лидеров по типу игры",
        Description = "Возвращает список лучших игроков для конкретного типа игры (countries, flags, states)",
        OperationId = "GetLeaderboardByGameType",
        Tags = new[] { "Leaderboard" }
    )]
    [SwaggerResponse(200, "Список лидеров успешно получен", typeof(LeaderboardResponse))]
    [SwaggerResponse(400, "Некорректные параметры запроса или неизвестный тип игры")]
    public async Task<ActionResult<LeaderboardResponse>> GetLeaderboardByGameType(
        string gameType,
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 50)
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            var leaderboard = await _leaderboardService.GetLeaderboardByGameTypeAsync(gameType, page, pageSize, currentUserId);
            
            _logger.LogInformation("Retrieved leaderboard for game type {GameType} - Page: {Page}, Size: {PageSize}, Total: {Total}", 
                gameType, page, pageSize, leaderboard.TotalPlayers);
            
            return Ok(leaderboard);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Invalid parameters for game type leaderboard: {Message}", ex.Message);
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving leaderboard for game type {GameType}", gameType);
            return StatusCode(500, new { error = "An error occurred while retrieving the leaderboard" });
        }
    }

    /// <summary>
    /// Получение списка лидеров по временному периоду
    /// </summary>
    /// <param name="period">Временной период (all-time, week, month, year)</param>
    /// <param name="page">Номер страницы (по умолчанию 1)</param>
    /// <param name="pageSize">Количество записей на странице (по умолчанию 50, максимум 100)</param>
    /// <returns>Список лидеров, отфильтрованный по временному периоду</returns>
    /// <response code="200">Список лидеров успешно получен</response>
    /// <response code="400">Некорректные параметры запроса или неизвестный период</response>
    [HttpGet("period/{period}")]
    [SwaggerOperation(
        Summary = "Получение списка лидеров по временному периоду",
        Description = "Возвращает список лучших игроков за указанный временной период (all-time, week, month, year)",
        OperationId = "GetLeaderboardByPeriod",
        Tags = new[] { "Leaderboard" }
    )]
    [SwaggerResponse(200, "Список лидеров успешно получен", typeof(LeaderboardResponse))]
    [SwaggerResponse(400, "Некорректные параметры запроса или неизвестный период")]
    public async Task<ActionResult<LeaderboardResponse>> GetLeaderboardByPeriod(
        string period,
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 50)
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            var leaderboard = await _leaderboardService.GetLeaderboardByPeriodAsync(period, page, pageSize, currentUserId);
            
            _logger.LogInformation("Retrieved leaderboard for period {Period} - Page: {Page}, Size: {PageSize}, Total: {Total}", 
                period, page, pageSize, leaderboard.TotalPlayers);
            
            return Ok(leaderboard);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Invalid parameters for period leaderboard: {Message}", ex.Message);
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving leaderboard for period {Period}", period);
            return StatusCode(500, new { error = "An error occurred while retrieving the leaderboard" });
        }
    }

    /// <summary>
    /// Получение списка лидеров с комбинированными фильтрами
    /// </summary>
    /// <param name="gameType">Фильтр по типу игры (опционально)</param>
    /// <param name="period">Фильтр по временному периоду (опционально)</param>
    /// <param name="page">Номер страницы (по умолчанию 1)</param>
    /// <param name="pageSize">Количество записей на странице (по умолчанию 50, максимум 100)</param>
    /// <returns>Отфильтрованный список лидеров</returns>
    /// <response code="200">Список лидеров успешно получен</response>
    /// <response code="400">Некорректные параметры запроса</response>
    [HttpGet("filtered")]
    [SwaggerOperation(
        Summary = "Получение списка лидеров с комбинированными фильтрами",
        Description = "Возвращает список лидеров с возможностью фильтрации по типу игры и временному периоду одновременно",
        OperationId = "GetFilteredLeaderboard",
        Tags = new[] { "Leaderboard" }
    )]
    [SwaggerResponse(200, "Список лидеров успешно получен", typeof(LeaderboardResponse))]
    [SwaggerResponse(400, "Некорректные параметры запроса")]
    public async Task<ActionResult<LeaderboardResponse>> GetFilteredLeaderboard(
        [FromQuery] string? gameType = null,
        [FromQuery] string? period = null,
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 50)
    {
        try
        {
            var currentUserId = GetCurrentUserId();
            var leaderboard = await _leaderboardService.GetFilteredLeaderboardAsync(gameType, period, page, pageSize, currentUserId);
            
            _logger.LogInformation("Retrieved filtered leaderboard - GameType: {GameType}, Period: {Period}, Page: {Page}, Size: {PageSize}, Total: {Total}", 
                gameType ?? "all", period ?? "all-time", page, pageSize, leaderboard.TotalPlayers);
            
            return Ok(leaderboard);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Invalid parameters for filtered leaderboard: {Message}", ex.Message);
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving filtered leaderboard");
            return StatusCode(500, new { error = "An error occurred while retrieving the leaderboard" });
        }
    }

    /// <summary>
    /// Очистка кэша списка лидеров
    /// </summary>
    /// <returns>Сообщение об успешной очистке</returns>
    /// <response code="200">Кэш успешно очищен</response>
    /// <response code="401">Пользователь не аутентифицирован</response>
    [HttpPost("clear-cache")]
    [Authorize]
    [SwaggerOperation(
        Summary = "Очистка кэша списка лидеров",
        Description = "Очищает кэш списка лидеров для принудительного обновления данных",
        OperationId = "ClearLeaderboardCache",
        Tags = new[] { "Leaderboard" }
    )]
    [SwaggerResponse(200, "Кэш успешно очищен")]
    [SwaggerResponse(401, "Пользователь не аутентифицирован")]
    public ActionResult ClearLeaderboardCache()
    {
        try
        {
            _leaderboardService.ClearCache();
            _logger.LogInformation("Leaderboard cache cleared by user {UserId}", GetCurrentUserId());
            return Ok(new { message = "Leaderboard cache cleared successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing leaderboard cache");
            return StatusCode(500, new { error = "An error occurred while clearing the cache" });
        }
    }

    /// <summary>
    /// Получение доступных типов игр для фильтрации
    /// </summary>
    /// <returns>Список допустимых типов игр</returns>
    /// <response code="200">Список типов игр успешно получен</response>
    [HttpGet("game-types")]
    [SwaggerOperation(
        Summary = "Получение доступных типов игр для фильтрации",
        Description = "Возвращает список всех допустимых типов игр, которые можно использовать для фильтрации списка лидеров",
        OperationId = "GetGameTypes",
        Tags = new[] { "Leaderboard" }
    )]
    [SwaggerResponse(200, "Список типов игр успешно получен")]
    public ActionResult<object> GetGameTypes()
    {
        return Ok(new
        {
            gameTypes = GameTypes.ValidGameTypes,
            description = "Valid game types for leaderboard filtering"
        });
    }

    /// <summary>
    /// Получение доступных временных периодов для фильтрации
    /// </summary>
    /// <returns>Список допустимых временных периодов</returns>
    /// <response code="200">Список временных периодов успешно получен</response>
    [HttpGet("periods")]
    [SwaggerOperation(
        Summary = "Получение доступных временных периодов для фильтрации",
        Description = "Возвращает список всех допустимых временных периодов, которые можно использовать для фильтрации списка лидеров",
        OperationId = "GetPeriods",
        Tags = new[] { "Leaderboard" }
    )]
    [SwaggerResponse(200, "Список временных периодов успешно получен")]
    public ActionResult<object> GetPeriods()
    {
        return Ok(new
        {
            periods = LeaderboardPeriods.ValidPeriods,
            description = "Valid time periods for leaderboard filtering"
        });
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return null;
        }
        return userId;
    }
}