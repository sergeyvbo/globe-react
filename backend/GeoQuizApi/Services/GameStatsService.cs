using Microsoft.EntityFrameworkCore;
using GeoQuizApi.Data;
using GeoQuizApi.Models.Entities;
using GeoQuizApi.Models;
using GeoQuizApi.Models.Exceptions;

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
            throw new ValidationException("GameType", "Game type is required");
        }

        if (!GeoQuizApi.Models.GameTypes.IsValid(gameType))
        {
            var errorMessage = $"Invalid game type. Valid types: {string.Join(", ", GeoQuizApi.Models.GameTypes.ValidGameTypes)}";
            _logger.LogDebug("Creating ValidationException for GameType with message: {Message}", errorMessage);
            var validationException = new ValidationException("GameType", errorMessage);
            _logger.LogDebug("ValidationException created with {ErrorCount} errors", validationException.Errors.Count);
            foreach (var error in validationException.Errors)
            {
                _logger.LogDebug("ValidationException Error: {Key} = [{Values}]", error.Key, string.Join(", ", error.Value));
            }
            throw validationException;
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

        // Use retry logic to handle potential race conditions
        return await ConcurrencyUtilities.ExecuteWithRetryAsync(async () =>
        {
            // Calculate session duration if end time is provided
            int? sessionDurationMs = null;
            if (sessionEndTime.HasValue)
            {
                var duration = sessionEndTime.Value - sessionStartTime;
                sessionDurationMs = (int)duration.TotalMilliseconds;
            }

            // Use unique timestamp to prevent race conditions
            var uniqueCreatedAt = TimestampManager.GetUniqueTimestamp();
            
            // For SessionStartTime, preserve the original time if it's significantly different from now
            // Only make it unique if it's very close to current time (within 1 minute)
            var uniqueSessionStartTime = Math.Abs((DateTime.UtcNow - sessionStartTime).TotalMinutes) < 1 
                ? TimestampManager.GetUniqueTimestamp(sessionStartTime)
                : sessionStartTime;

            var gameSession = new GameSession
            {
                UserId = userId,
                GameType = gameType.ToLowerInvariant(),
                CorrectAnswers = correctAnswers,
                WrongAnswers = wrongAnswers,
                SessionStartTime = uniqueSessionStartTime,
                SessionEndTime = sessionEndTime,
                SessionDurationMs = sessionDurationMs,
                CreatedAt = uniqueCreatedAt
            };

            _context.GameSessions.Add(gameSession);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Game session saved for user {UserId}, game type {GameType}, score {Correct}/{Total}, CreatedAt: {CreatedAt}", 
                userId, gameType, correctAnswers, correctAnswers + wrongAnswers, uniqueCreatedAt);

            return gameSession;
        }, logger: _logger);
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
            .ThenByDescending(gs => gs.SessionStartTime) // Secondary sort for identical CreatedAt
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
            .ThenBy(gs => gs.SessionStartTime) // Secondary sort for identical CreatedAt
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

        return await ConcurrencyUtilities.ExecuteWithRetryAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
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

                    // Use unique timestamps for migrated sessions
                    var uniqueCreatedAt = TimestampManager.GetUniqueTimestamp(
                        anonymousSession.SessionEndTime ?? anonymousSession.SessionStartTime);
                    
                    // For migrated sessions, preserve the original SessionStartTime if it's significantly different from now
                    var uniqueSessionStartTime = Math.Abs((DateTime.UtcNow - anonymousSession.SessionStartTime).TotalMinutes) < 1 
                        ? TimestampManager.GetUniqueTimestamp(anonymousSession.SessionStartTime)
                        : anonymousSession.SessionStartTime;

                    var gameSession = new GameSession
                    {
                        UserId = userId,
                        GameType = anonymousSession.GameType.ToLowerInvariant(),
                        CorrectAnswers = anonymousSession.CorrectAnswers,
                        WrongAnswers = anonymousSession.WrongAnswers,
                        SessionStartTime = uniqueSessionStartTime,
                        SessionEndTime = anonymousSession.SessionEndTime,
                        SessionDurationMs = sessionDurationMs,
                        CreatedAt = uniqueCreatedAt
                    };

                    gameSessions.Add(gameSession);
                }

                if (gameSessions.Any())
                {
                    _context.GameSessions.AddRange(gameSessions);
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    _logger.LogInformation("Migrated {Count} anonymous game sessions for user {UserId}", 
                        gameSessions.Count, userId);
                }
                else
                {
                    await transaction.RollbackAsync();
                }

                return gameSessions.Any();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }, logger: _logger);
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
            .ThenBy(gs => gs.SessionStartTime) // Secondary sort for identical CreatedAt
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

        // Sort by CreatedAt and then by SessionStartTime for consistent ordering
        var sortedSessions = sessions
            .OrderBy(s => s.CreatedAt)
            .ThenBy(s => s.SessionStartTime);

        foreach (var session in sortedSessions)
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