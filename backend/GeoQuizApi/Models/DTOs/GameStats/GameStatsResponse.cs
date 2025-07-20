namespace GeoQuizApi.Models.DTOs.GameStats;

public class GameStatsResponse
{
    public int TotalGames { get; set; }
    public int TotalCorrectAnswers { get; set; }
    public int TotalWrongAnswers { get; set; }
    public int BestStreak { get; set; }
    public double AverageAccuracy { get; set; }
    public DateTime? LastPlayedAt { get; set; }
    public Dictionary<string, GameTypeStatsDto> GameTypeStats { get; set; } = new();
}

public class GameTypeStatsDto
{
    public int Games { get; set; }
    public int CorrectAnswers { get; set; }
    public int WrongAnswers { get; set; }
    public double Accuracy { get; set; }
    public int BestStreak { get; set; }
}