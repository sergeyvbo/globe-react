using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using GeoQuizApi.Services;
using GeoQuizApi.Models.DTOs.Leaderboard;

namespace GeoQuizApi.Controllers;

/// <summary>
/// Controller for managing leaderboards
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
    /// Get global leaderboard
    /// </summary>
    /// <param name="page">Page number (default 1)</param>
    /// <param name="pageSize">Number of entries per page (default 50, maximum 100)</param>
    /// <returns>Leaderboard with top players</returns>
    /// <response code="200">Leaderboard successfully retrieved</response>
    /// <response code="400">Invalid request parameters</response>
    [HttpGet]
    public async Task<ActionResult<LeaderboardResponse>> GetGlobalLeaderboard(
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 50)
    {
        var currentUserId = GetCurrentUserId();
        var leaderboard = await _leaderboardService.GetGlobalLeaderboardAsync(page, pageSize, currentUserId);
        
        _logger.LogInformation("Retrieved global leaderboard - Page: {Page}, Size: {PageSize}, Total: {Total}", 
            page, pageSize, leaderboard.TotalPlayers);
        
        return Ok(leaderboard);
    }

    /// <summary>
    /// Get leaderboard by game type
    /// </summary>
    /// <param name="gameType">Game type (countries, flags, states)</param>
    /// <param name="page">Page number (default 1)</param>
    /// <param name="pageSize">Number of entries per page (default 50, maximum 100)</param>
    /// <returns>Leaderboard filtered by game type</returns>
    /// <response code="200">Leaderboard successfully retrieved</response>
    /// <response code="400">Invalid request parameters or unknown game type</response>
    [HttpGet("game-type/{gameType}")]
    public async Task<ActionResult<LeaderboardResponse>> GetLeaderboardByGameType(
        string gameType,
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 50)
    {
        var currentUserId = GetCurrentUserId();
        var leaderboard = await _leaderboardService.GetLeaderboardByGameTypeAsync(gameType, page, pageSize, currentUserId);
        
        _logger.LogInformation("Retrieved leaderboard for game type {GameType} - Page: {Page}, Size: {PageSize}, Total: {Total}", 
            gameType, page, pageSize, leaderboard.TotalPlayers);
        
        return Ok(leaderboard);
    }

    /// <summary>
    /// Get leaderboard by time period
    /// </summary>
    /// <param name="period">Time period (all-time, week, month, year)</param>
    /// <param name="page">Page number (default 1)</param>
    /// <param name="pageSize">Number of entries per page (default 50, maximum 100)</param>
    /// <returns>Leaderboard filtered by time period</returns>
    /// <response code="200">Leaderboard successfully retrieved</response>
    /// <response code="400">Invalid request parameters or unknown period</response>
    [HttpGet("period/{period}")]
    public async Task<ActionResult<LeaderboardResponse>> GetLeaderboardByPeriod(
        string period,
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 50)
    {
        var currentUserId = GetCurrentUserId();
        var leaderboard = await _leaderboardService.GetLeaderboardByPeriodAsync(period, page, pageSize, currentUserId);
        
        _logger.LogInformation("Retrieved leaderboard for period {Period} - Page: {Page}, Size: {PageSize}, Total: {Total}", 
            period, page, pageSize, leaderboard.TotalPlayers);
        
        return Ok(leaderboard);
    }

    /// <summary>
    /// Get leaderboard with combined filters
    /// </summary>
    /// <param name="gameType">Game type filter (optional)</param>
    /// <param name="period">Time period filter (optional)</param>
    /// <param name="page">Page number (default 1)</param>
    /// <param name="pageSize">Number of entries per page (default 50, maximum 100)</param>
    /// <returns>Filtered leaderboard</returns>
    /// <response code="200">Leaderboard successfully retrieved</response>
    /// <response code="400">Invalid request parameters</response>
    [HttpGet("filtered")]
    public async Task<ActionResult<LeaderboardResponse>> GetFilteredLeaderboard(
        [FromQuery] string? gameType = null,
        [FromQuery] string? period = null,
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 50)
    {
        var currentUserId = GetCurrentUserId();
        var leaderboard = await _leaderboardService.GetFilteredLeaderboardAsync(gameType, period, page, pageSize, currentUserId);
        
        _logger.LogInformation("Retrieved filtered leaderboard - GameType: {GameType}, Period: {Period}, Page: {Page}, Size: {PageSize}, Total: {Total}", 
            gameType ?? "all", period ?? "all-time", page, pageSize, leaderboard.TotalPlayers);
        
        return Ok(leaderboard);
    }

    /// <summary>
    /// Clear leaderboard cache
    /// </summary>
    /// <returns>Success message</returns>
    /// <response code="200">Cache successfully cleared</response>
    /// <response code="401">User not authenticated</response>
    [HttpPost("clear-cache")]
    [Authorize]
    public ActionResult ClearLeaderboardCache()
    {
        _leaderboardService.ClearCache();
        _logger.LogInformation("Leaderboard cache cleared by user {UserId}", GetCurrentUserId());
        return Ok(new { message = "Leaderboard cache cleared successfully" });
    }

    /// <summary>
    /// Get available game types for filtering
    /// </summary>
    /// <returns>List of valid game types</returns>
    /// <response code="200">Game types list successfully retrieved</response>
    [HttpGet("game-types")]
    public ActionResult<object> GetGameTypes()
    {
        return Ok(new
        {
            gameTypes = GeoQuizApi.Models.GameTypes.ValidGameTypes,
            description = "Valid game types for leaderboard filtering"
        });
    }

    /// <summary>
    /// Get available time periods for filtering
    /// </summary>
    /// <returns>List of valid time periods</returns>
    /// <response code="200">Time periods list successfully retrieved</response>
    [HttpGet("periods")]
    public ActionResult<object> GetPeriods()
    {
        return Ok(new
        {
            periods = GeoQuizApi.Models.LeaderboardPeriods.ValidPeriods,
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