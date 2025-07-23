using Microsoft.EntityFrameworkCore;
using GeoQuizApi.Data;
using GeoQuizApi.Models.Entities;
using GeoQuizApi.Models;
using GeoQuizApi.Middleware;

namespace GeoQuizApi.Services;

public class GameStatsService : IGameStatsService
{
    private readonly GeoQuizDbContext _context;
    private readonly ILogger<GameStatsService> _logger;

    public GameStatsService(GeoQuizDbContext context, ILogger<GameStatsService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<GameSession> SaveGameSessionAsync(Guid userId, string gameType, int correctAnswers, 
        int wrongAnswers, DateTime sessionStartTime, DateTime? sessionEndTime = null)
    {
        // Validate input
        if (string.IsNullOrWhiteSpace(gameType))
        {
            throw new ValidationException("gameType", "Game type is required");
        }

        if (!GeoQuizApi.Models.GameTypes.IsValid(gameType))
        {
            throw new ValidationException("gameType", $"Invalid game type. Valid types: {string.Join(", ", GeoQuizApi.Models.GameTypes.ValidGameTypes)}");
        }

        if (correctAnswers < 0 || wrongAnswers < 0)
        {
            throw new ValidationException("answers", "Answer counts cannot be negative");
        }

        // Verify user exists
        var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
        if (!userExists)
        {
            throw new ArgumentException("User not found", nameof(userId));
        }

        // Calculate session duration if end time is provided
        int? sessionDurationMs = null;
        if (sessionEndTime.HasValue)
        {
            var duration = sessionEndTime.Value - sessionStartTime;
            sessionDurationMs = (int)duration.TotalMilliseconds;
        }

        var gameSession = new GameSession
        {
            UserId = userId,
            GameType = gameType.ToLowerInvariant(),
            CorrectAnswers = correctAnswers,
            WrongAnswers = wrongAnswers,
            SessionStartTime = sessionStartTime,
            SessionEndTime = sessionEndTime,
            SessionDurationMs = sessionDurationMs,
            CreatedAt = DateTime.UtcNow
        };

        _context.GameSessions.Add(gameSession);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Game session saved for user {UserId}, game type {GameType}, score {Correct}/{Total}", 
            userId, gameType, correctAnswers, correctAnswers + wrongAnswers);

        return gameSession;
    }

    public async Task<GameStatsResult> GetUserStatsAsync(Guid userId)
    {
        var sessions = await _context.GameSessions
            .Where(gs => gs.UserId == userId)
            .OrderBy(gs => gs.CreatedAt)
            .ToListAsync();

        if (!sessions.Any())
        {
            return new GameStatsResult
            {
                TotalGames = 0,
                TotalCorrectAnswers = 0,
                TotalWrongAnswers = 0,
                BestStreak = 0,
                AverageAccuracy = 0,
                LastPlayedAt = null,
                GameTypeStats = new Dictionary<string, GameTypeStatsResult>()
            };
        }

        var totalCorrect = sessions.Sum(s => s.CorrectAnswers);
        var totalWrong = sessions.Sum(s => s.WrongAnswers);
        var totalAnswers = totalCorrect + totalWrong;

        // Calculate best streak across all games
        var bestStreak = await CalculateBestStreakAsync(userId);

        // Group by game type for detailed stats
        var gameTypeStats = sessions
            .GroupBy(s => s.GameType)
            .ToDictionary(g => g.Key, g => CalculateGameTypeStats(g.ToList()));

        return new GameStatsResult
        {
            TotalGames = sessions.Count,
            TotalCorrectAnswers = totalCorrect,
            TotalWrongAnswers = totalWrong,
            BestStreak = bestStreak,
            AverageAccuracy = CalculateAccuracy(totalCorrect, totalAnswers),
            LastPlayedAt = sessions.Max(s => s.CreatedAt),
            GameTypeStats = gameTypeStats
        };
    }

    public async Task<List<GameSession>> GetUserGameHistoryAsync(Guid userId, int page = 1, int pageSize = 20)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 20;

        return await _context.GameSessions
            .Where(gs => gs.UserId == userId)
            .OrderByDescending(gs => gs.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<GameTypeStatsResult> GetUserStatsByGameTypeAsync(Guid userId, string gameType)
    {
        if (string.IsNullOrWhiteSpace(gameType))
        {
            throw new ArgumentException("Game type is required", nameof(gameType));
        }

        var sessions = await _context.GameSessions
            .Where(gs => gs.UserId == userId && gs.GameType == gameType.ToLowerInvariant())
            .OrderBy(gs => gs.CreatedAt)
            .ToListAsync();

        if (!sessions.Any())
        {
            return new GameTypeStatsResult
            {
                Games = 0,
                CorrectAnswers = 0,
                WrongAnswers = 0,
                Accuracy = 0,
                BestStreak = 0
            };
        }

        return CalculateGameTypeStats(sessions);
    }

    public async Task<bool> MigrateAnonymousProgressAsync(Guid userId, List<AnonymousGameSession> anonymousSessions)
    {
        if (anonymousSessions == null || !anonymousSessions.Any())
        {
            return false;
        }

        // Verify user exists
        var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
        if (!userExists)
        {
            throw new ArgumentException("User not found", nameof(userId));
        }

        var gameSessions = new List<GameSession>();

        foreach (var anonymousSession in anonymousSessions)
        {
            // Validate anonymous session data
            if (string.IsNullOrWhiteSpace(anonymousSession.GameType) ||
                anonymousSession.CorrectAnswers < 0 ||
                anonymousSession.WrongAnswers < 0)
            {
                _logger.LogWarning("Skipping invalid anonymous session for user {UserId}", userId);
                continue;
            }

            // Calculate session duration if end time is provided
            int? sessionDurationMs = null;
            if (anonymousSession.SessionEndTime.HasValue)
            {
                var duration = anonymousSession.SessionEndTime.Value - anonymousSession.SessionStartTime;
                sessionDurationMs = (int)duration.TotalMilliseconds;
            }

            var gameSession = new GameSession
            {
                UserId = userId,
                GameType = anonymousSession.GameType.ToLowerInvariant(),
                CorrectAnswers = anonymousSession.CorrectAnswers,
                WrongAnswers = anonymousSession.WrongAnswers,
                SessionStartTime = anonymousSession.SessionStartTime,
                SessionEndTime = anonymousSession.SessionEndTime,
                SessionDurationMs = sessionDurationMs,
                CreatedAt = anonymousSession.SessionEndTime ?? anonymousSession.SessionStartTime
            };

            gameSessions.Add(gameSession);
        }

        if (gameSessions.Any())
        {
            _context.GameSessions.AddRange(gameSessions);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Migrated {Count} anonymous game sessions for user {UserId}", 
                gameSessions.Count, userId);
        }

        return gameSessions.Any();
    }

    public double CalculateAccuracy(int correctAnswers, int totalAnswers)
    {
        if (totalAnswers == 0)
        {
            return 0;
        }

        return Math.Round((double)correctAnswers / totalAnswers * 100, 2);
    }

    public async Task<int> CalculateBestStreakAsync(Guid userId, string? gameType = null)
    {
        var query = _context.GameSessions
            .Where(gs => gs.UserId == userId);

        if (!string.IsNullOrWhiteSpace(gameType))
        {
            query = query.Where(gs => gs.GameType == gameType.ToLowerInvariant());
        }

        var sessions = await query
            .OrderBy(gs => gs.CreatedAt)
            .Select(gs => new { gs.CorrectAnswers, gs.WrongAnswers })
            .ToListAsync();

        if (!sessions.Any())
        {
            return 0;
        }

        int currentStreak = 0;
        int bestStreak = 0;

        foreach (var session in sessions)
        {
            // A session contributes to streak if accuracy is above 50%
            var totalAnswers = session.CorrectAnswers + session.WrongAnswers;
            if (totalAnswers > 0 && session.CorrectAnswers > session.WrongAnswers)
            {
                currentStreak++;
                bestStreak = Math.Max(bestStreak, currentStreak);
            }
            else
            {
                currentStreak = 0;
            }
        }

        return bestStreak;
    }

    private GameTypeStatsResult CalculateGameTypeStats(List<GameSession> sessions)
    {
        if (!sessions.Any())
        {
            return new GameTypeStatsResult
            {
                Games = 0,
                CorrectAnswers = 0,
                WrongAnswers = 0,
                Accuracy = 0,
                BestStreak = 0
            };
        }

        var totalCorrect = sessions.Sum(s => s.CorrectAnswers);
        var totalWrong = sessions.Sum(s => s.WrongAnswers);
        var totalAnswers = totalCorrect + totalWrong;

        // Calculate best streak for this game type
        int currentStreak = 0;
        int bestStreak = 0;

        foreach (var session in sessions.OrderBy(s => s.CreatedAt))
        {
            var sessionTotal = session.CorrectAnswers + session.WrongAnswers;
            if (sessionTotal > 0 && session.CorrectAnswers > session.WrongAnswers)
            {
                currentStreak++;
                bestStreak = Math.Max(bestStreak, currentStreak);
            }
            else
            {
                currentStreak = 0;
            }
        }

        return new GameTypeStatsResult
        {
            Games = sessions.Count,
            CorrectAnswers = totalCorrect,
            WrongAnswers = totalWrong,
            Accuracy = CalculateAccuracy(totalCorrect, totalAnswers),
            BestStreak = bestStreak
        };
    }
}