using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GeoQuizApi.Models.DTOs.GameStats;
using GeoQuizApi.Models.Entities;
using GeoQuizApi.Services;
using GeoQuizApi.Middleware;

namespace GeoQuizApi.Controllers;

/// <summary>
/// Controller for managing user game statistics
/// </summary>
[ApiController]
[Route("api/game-stats")]
[Authorize]
[Produces("application/json")]
[Tags("Game Statistics")]
public class GameStatsController : ControllerBase
{
    private readonly IGameStatsService _gameStatsService;
    private readonly ILogger<GameStatsController> _logger;

    public GameStatsController(
        IGameStatsService gameStatsService,
        ILogger<GameStatsController> logger)
    {
        _gameStatsService = gameStatsService;
        _logger = logger;
    }

    /// <summary>
    /// Save game session results
    /// </summary>
    /// <param name="request">Game session data</param>
    /// <returns>Information about the saved game session</returns>
    /// <response code="201">Game session successfully saved</response>
    /// <response code="400">Invalid request data</response>
    /// <response code="401">User not authenticated</response>
    /// <response code="422">Data validation error</response>
    [HttpPost]
    public async Task<ActionResult<GameSessionDto>> SaveGameSession([FromBody] GameSessionRequest request)
    {
        try
        {
            _logger.LogInformation("SaveGameSession called with GameType: {GameType}, CorrectAnswers: {CorrectAnswers}, WrongAnswers: {WrongAnswers}", 
                request?.GameType, request?.CorrectAnswers, request?.WrongAnswers);

            // Check model state first
            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid model state for SaveGameSession: {Errors}", 
                    string.Join(", ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage)));
                return BadRequest(ModelState);
            }

            var userId = GetCurrentUserId();
            _logger.LogInformation("SaveGameSession for user: {UserId}", userId);
            
            _logger.LogInformation("Calling SaveGameSessionAsync with GameType: {GameType}", request.GameType);
            
            var gameSession = await _gameStatsService.SaveGameSessionAsync(
                userId,
                request.GameType,
                request.CorrectAnswers,
                request.WrongAnswers,
                request.SessionStartTime,
                request.SessionEndTime);

            _logger.LogInformation("SaveGameSessionAsync completed successfully");

            var response = MapToGameSessionDto(gameSession);
            return Ok(response);
        }
        catch (ValidationException ex)
        {
            _logger.LogWarning("Validation error in SaveGameSession: {Message}, Details: {Details}", ex.Message, ex.Errors);
            return UnprocessableEntity(new { error = ex.Message, details = ex.Errors });
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning("Argument error in SaveGameSession: {Message}", ex.Message);
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving game session for user {UserId}", GetCurrentUserId());
            return StatusCode(500, new { error = "An error occurred while saving the game session" });
        }
    }

    /// <summary>
    /// Get user aggregated statistics
    /// </summary>
    /// <returns>Overall user game statistics</returns>
    /// <response code="200">Statistics successfully retrieved</response>
    /// <response code="401">User not authenticated</response>
    [HttpGet("me")]
    public async Task<ActionResult<GameStatsResponse>> GetUserStats()
    {
        try
        {
            var userId = GetCurrentUserId();
            var stats = await _gameStatsService.GetUserStatsAsync(userId);

            var response = new GameStatsResponse
            {
                TotalGames = stats.TotalGames,
                TotalCorrectAnswers = stats.TotalCorrectAnswers,
                TotalWrongAnswers = stats.TotalWrongAnswers,
                BestStreak = stats.BestStreak,
                AverageAccuracy = stats.AverageAccuracy,
                LastPlayedAt = stats.LastPlayedAt,
                GameTypeStats = stats.GameTypeStats.ToDictionary(
                    kvp => kvp.Key,
                    kvp => new GameTypeStatsDto
                    {
                        Games = kvp.Value.Games,
                        CorrectAnswers = kvp.Value.CorrectAnswers,
                        WrongAnswers = kvp.Value.WrongAnswers,
                        Accuracy = kvp.Value.Accuracy,
                        BestStreak = kvp.Value.BestStreak
                    })
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user stats for user {UserId}", GetCurrentUserId());
            return StatusCode(500, new { error = "An error occurred while retrieving user statistics" });
        }
    }

    /// <summary>
    /// Get user game session history
    /// </summary>
    /// <param name="page">Page number (default 1)</param>
    /// <param name="pageSize">Page size (default 20, maximum 100)</param>
    /// <returns>List of game sessions with pagination</returns>
    /// <response code="200">Game history successfully retrieved</response>
    /// <response code="401">User not authenticated</response>
    [HttpGet("me/history")]
    public async Task<ActionResult<GameHistoryResponse>> GetUserGameHistory(
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 20)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            // Validate pagination parameters
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var sessions = await _gameStatsService.GetUserGameHistoryAsync(userId, page, pageSize);
            
            // Get total count for pagination info (this could be optimized with a separate count query)
            var allUserStats = await _gameStatsService.GetUserStatsAsync(userId);
            var totalCount = allUserStats.TotalGames;

            var response = new GameHistoryResponse
            {
                Sessions = sessions.Select(MapToGameSessionDto).ToList(),
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                HasNextPage = (page * pageSize) < totalCount
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting game history for user {UserId}", GetCurrentUserId());
            return StatusCode(500, new { error = "An error occurred while retrieving game history" });
        }
    }

    /// <summary>
    /// Migrate anonymous progress to user account
    /// </summary>
    /// <param name="request">Anonymous game session data for migration</param>
    /// <returns>Confirmation of successful migration</returns>
    /// <response code="200">Anonymous progress successfully migrated</response>
    /// <response code="400">Invalid request data or no sessions to migrate</response>
    /// <response code="401">User not authenticated</response>
    [HttpPost("migrate")]
    public async Task<ActionResult> MigrateAnonymousProgress([FromBody] MigrateProgressRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();

            // Convert DTOs to service models
            var anonymousSessions = request.AnonymousSessions.Select(dto => new AnonymousGameSession
            {
                GameType = dto.GameType,
                CorrectAnswers = dto.CorrectAnswers,
                WrongAnswers = dto.WrongAnswers,
                SessionStartTime = dto.SessionStartTime,
                SessionEndTime = dto.SessionEndTime
            }).ToList();

            var success = await _gameStatsService.MigrateAnonymousProgressAsync(userId, anonymousSessions);

            if (!success)
            {
                return BadRequest(new { error = "No valid sessions to migrate" });
            }

            return Ok(new { 
                message = "Anonymous progress migrated successfully",
                migratedSessions = anonymousSessions.Count
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error migrating anonymous progress for user {UserId}", GetCurrentUserId());
            return StatusCode(500, new { error = "An error occurred while migrating anonymous progress" });
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

    private static GameSessionDto MapToGameSessionDto(GameSession gameSession)
    {
        var totalAnswers = gameSession.CorrectAnswers + gameSession.WrongAnswers;
        var accuracy = totalAnswers > 0 ? Math.Round((double)gameSession.CorrectAnswers / totalAnswers * 100, 2) : 0;

        return new GameSessionDto
        {
            Id = gameSession.Id.ToString(),
            GameType = gameSession.GameType,
            CorrectAnswers = gameSession.CorrectAnswers,
            WrongAnswers = gameSession.WrongAnswers,
            Accuracy = accuracy,
            SessionStartTime = gameSession.SessionStartTime,
            SessionEndTime = gameSession.SessionEndTime,
            SessionDurationMs = gameSession.SessionDurationMs,
            CreatedAt = gameSession.CreatedAt
        };
    }
}