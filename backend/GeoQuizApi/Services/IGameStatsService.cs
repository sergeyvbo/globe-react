using GeoQuizApi.Models.Entities;

namespace GeoQuizApi.Services;

public interface IGameStatsService
{
    // Save game session
    Task<GameSession> SaveGameSessionAsync(Guid userId, string gameType, int correctAnswers, int wrongAnswers, 
        DateTime sessionStartTime, DateTime? sessionEndTime = null);
    
    // Get aggregated statistics for a user
    Task<GameStatsResult> GetUserStatsAsync(Guid userId);
    
    // Get game history for a user
    Task<List<GameSession>> GetUserGameHistoryAsync(Guid userId, int page = 1, int pageSize = 20);
    
    // Get statistics by game type
    Task<GameTypeStatsResult> GetUserStatsByGameTypeAsync(Guid userId, string gameType);
    
    // Migrate anonymous progress (from localStorage to user account)
    Task<bool> MigrateAnonymousProgressAsync(Guid userId, List<AnonymousGameSession> anonymousSessions);
    
    // Calculate accuracy percentage
    double CalculateAccuracy(int correctAnswers, int totalAnswers);
    
    // Calculate best streak from game sessions
    Task<int> CalculateBestStreakAsync(Guid userId, string? gameType = null);
}

// Result classes for aggregated data
public class GameStatsResult
{
    public int TotalGames { get; set; }
    public int TotalCorrectAnswers { get; set; }
    public int TotalWrongAnswers { get; set; }
    public int BestStreak { get; set; }
    public double AverageAccuracy { get; set; }
    public DateTime? LastPlayedAt { get; set; }
    public Dictionary<string, GameTypeStatsResult> GameTypeStats { get; set; } = new();
}

public class GameTypeStatsResult
{
    public int Games { get; set; }
    public int CorrectAnswers { get; set; }
    public int WrongAnswers { get; set; }
    public double Accuracy { get; set; }
    public int BestStreak { get; set; }
}

// For migrating anonymous sessions
public class AnonymousGameSession
{
    public string GameType { get; set; } = string.Empty;
    public int CorrectAnswers { get; set; }
    public int WrongAnswers { get; set; }
    public DateTime SessionStartTime { get; set; }
    public DateTime? SessionEndTime { get; set; }
}