namespace GeoQuizApi.Models.DTOs.Leaderboard;

public class LeaderboardEntry
{
    public string? UserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public int TotalScore { get; set; }
    public int TotalGames { get; set; }
    public double Accuracy { get; set; }
    public int BestStreak { get; set; }
    public DateTime? LastPlayedAt { get; set; }
    public int Rank { get; set; }
}