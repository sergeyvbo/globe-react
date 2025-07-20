namespace GeoQuizApi.Models.DTOs.Leaderboard;

public class LeaderboardResponse
{
    public List<LeaderboardEntry> Entries { get; set; } = new();
    public int TotalPlayers { get; set; }
    public LeaderboardEntry? CurrentUserEntry { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public int TotalPages { get; set; }
}