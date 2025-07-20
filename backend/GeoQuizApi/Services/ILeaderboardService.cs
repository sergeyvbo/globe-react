using GeoQuizApi.Models.DTOs.Leaderboard;

namespace GeoQuizApi.Services;

public interface ILeaderboardService
{
    /// <summary>
    /// Get global leaderboard with all players
    /// </summary>
    Task<LeaderboardResponse> GetGlobalLeaderboardAsync(int page = 1, int pageSize = 50, Guid? currentUserId = null);
    
    /// <summary>
    /// Get leaderboard filtered by game type
    /// </summary>
    Task<LeaderboardResponse> GetLeaderboardByGameTypeAsync(string gameType, int page = 1, int pageSize = 50, Guid? currentUserId = null);
    
    /// <summary>
    /// Get leaderboard filtered by time period
    /// </summary>
    Task<LeaderboardResponse> GetLeaderboardByPeriodAsync(string period, int page = 1, int pageSize = 50, Guid? currentUserId = null);
    
    /// <summary>
    /// Get leaderboard with both game type and period filters
    /// </summary>
    Task<LeaderboardResponse> GetFilteredLeaderboardAsync(string? gameType = null, string? period = null, int page = 1, int pageSize = 50, Guid? currentUserId = null);
    
    /// <summary>
    /// Clear leaderboard cache
    /// </summary>
    void ClearCache();
}

/// <summary>
/// Supported time periods for leaderboard filtering
/// </summary>
public static class LeaderboardPeriods
{
    public const string AllTime = "all-time";
    public const string Week = "week";
    public const string Month = "month";
    public const string Year = "year";
    
    public static readonly string[] ValidPeriods = { AllTime, Week, Month, Year };
}

/// <summary>
/// Supported game types for leaderboard filtering
/// </summary>
public static class GameTypes
{
    public const string Countries = "countries";
    public const string Flags = "flags";
    public const string States = "states";
    
    public static readonly string[] ValidGameTypes = { Countries, Flags, States };
}