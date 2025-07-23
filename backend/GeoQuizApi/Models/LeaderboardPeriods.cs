namespace GeoQuizApi.Models;

/// <summary>
/// Constants for valid leaderboard time periods
/// </summary>
public static class LeaderboardPeriods
{
    public const string AllTime = "all-time";
    public const string Week = "week";
    public const string Month = "month";
    public const string Year = "year";

    /// <summary>
    /// List of all valid time periods
    /// </summary>
    public static readonly string[] ValidPeriods = { AllTime, Week, Month, Year };

    /// <summary>
    /// Check if a period is valid
    /// </summary>
    /// <param name="period">Period to validate</param>
    /// <returns>True if valid, false otherwise</returns>
    public static bool IsValid(string? period)
    {
        return !string.IsNullOrWhiteSpace(period) && 
               ValidPeriods.Contains(period.ToLowerInvariant());
    }
}