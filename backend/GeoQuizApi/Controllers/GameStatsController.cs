using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GeoQuizApi.Models.DTOs.GameStats;
using GeoQuizApi.Models.Entities;
using GeoQuizApi.Services;

namespace GeoQuizApi.Controllers;

[ApiController]
[Route("api/game-stats")]
[Authorize]
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

    [HttpPost]
    public async Task<ActionResult<GameSessionDto>> SaveGameSession([FromBody] GameSessionRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            var gameSession = await _gameStatsService.SaveGameSessionAsync(
                userId,
                request.GameType,
                request.CorrectAnswers,
                request.WrongAnswers,
                request.SessionStartTime,
                request.SessionEndTime);

            var response = MapToGameSessionDto(gameSession);
            return CreatedAtAction(nameof(GetUserStats), response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving game session for user {UserId}", GetCurrentUserId());
            return StatusCode(500, new { error = "An error occurred while saving the game session" });
        }
    }

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