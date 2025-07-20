using System.ComponentModel.DataAnnotations;

namespace GeoQuizApi.Models.DTOs.Leaderboard;

/// <summary>
/// Request model for leaderboard filtering
/// </summary>
public class LeaderboardFiltersRequest
{
    /// <summary>
    /// Game type filter (countries, flags, states)
    /// </summary>
    public string? GameType { get; set; }
    
    /// <summary>
    /// Time period filter (all-time, week, month, year)
    /// </summary>
    public string? Period { get; set; }
    
    /// <summary>
    /// Page number (minimum: 1)
    /// </summary>
    [Range(1, int.MaxValue, ErrorMessage = "Page must be greater than 0")]
    public int Page { get; set; } = 1;
    
    /// <summary>
    /// Page size (minimum: 1, maximum: 100)
    /// </summary>
    [Range(1, 100, ErrorMessage = "Page size must be between 1 and 100")]
    public int PageSize { get; set; } = 50;
}

/// <summary>
/// Response model for available filter options
/// </summary>
public class LeaderboardFiltersResponse
{
    public string[] GameTypes { get; set; } = Array.Empty<string>();
    public string[] Periods { get; set; } = Array.Empty<string>();
    public string Description { get; set; } = string.Empty;
}