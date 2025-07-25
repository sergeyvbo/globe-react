using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using GeoQuizApi.Data;
using GeoQuizApi.Models.DTOs.Leaderboard;
using GeoQuizApi.Models.Entities;
using GeoQuizApi.Models;

namespace GeoQuizApi.Services;

public class LeaderboardService : ILeaderboardService
{
    private readonly GeoQuizDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<LeaderboardService> _logger;
    
    private const int CacheExpirationMinutes = 5;
    private const string CacheKeyPrefix = "leaderboard";

    public LeaderboardService(GeoQuizDbContext context, IMemoryCache cache, ILogger<LeaderboardService> logger)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
    }

    public async Task<LeaderboardResponse> GetGlobalLeaderboardAsync(int page = 1, int pageSize = 50, Guid? currentUserId = null)
    {
        return await GetFilteredLeaderboardAsync(null, null, page, pageSize, currentUserId);
    }

    public async Task<LeaderboardResponse> GetLeaderboardByGameTypeAsync(string gameType, int page = 1, int pageSize = 50, Guid? currentUserId = null)
    {
        if (string.IsNullOrWhiteSpace(gameType))
        {
            throw new ArgumentException("Game type is required", nameof(gameType));
        }

        if (!GeoQuizApi.Models.GameTypes.ValidGameTypes.Contains(gameType.ToLowerInvariant()))
        {
            throw new ArgumentException($"Invalid game type. Valid types: {string.Join(", ", GeoQuizApi.Models.GameTypes.ValidGameTypes)}", nameof(gameType));
        }

        return await GetFilteredLeaderboardAsync(gameType.ToLowerInvariant(), null, page, pageSize, currentUserId);
    }

    public async Task<LeaderboardResponse> GetLeaderboardByPeriodAsync(string period, int page = 1, int pageSize = 50, Guid? currentUserId = null)
    {
        if (string.IsNullOrWhiteSpace(period))
        {
            throw new ArgumentException("Period is required", nameof(period));
        }

        if (!GeoQuizApi.Models.LeaderboardPeriods.ValidPeriods.Contains(period.ToLowerInvariant()))
        {
            throw new ArgumentException($"Invalid period. Valid periods: {string.Join(", ", GeoQuizApi.Models.LeaderboardPeriods.ValidPeriods)}", nameof(period));
        }

        return await GetFilteredLeaderboardAsync(null, period.ToLowerInvariant(), page, pageSize, currentUserId);
    }

    public async Task<LeaderboardResponse> GetFilteredLeaderboardAsync(string? gameType = null, string? period = null, int page = 1, int pageSize = 50, Guid? currentUserId = null)
    {
        // Validate parameters
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 50;

        // Generate cache key
        var cacheKey = GenerateCacheKey(gameType, period, page, pageSize);
        
        // Try to get from cache first
        if (_cache.TryGetValue(cacheKey, out LeaderboardResponse? cachedResult) && cachedResult != null)
        {
            _logger.LogDebug("Returning cached leaderboard for key: {CacheKey}", cacheKey);
            
            // Still need to get current user entry if requested
            if (currentUserId.HasValue && cachedResult.CurrentUserEntry == null)
            {
                cachedResult.CurrentUserEntry = await GetCurrentUserEntryAsync(currentUserId.Value, gameType, period);
            }
            
            return cachedResult;
        }

        // Calculate date range for period filtering
        DateTime? fromDate = GetFromDateForPeriod(period);

        // Build the query for leaderboard entries
        var leaderboardData = await GetLeaderboardDataAsync(gameType, fromDate);

        // Calculate total count
        var totalPlayers = leaderboardData.Count;
        var totalPages = (int)Math.Ceiling((double)totalPlayers / pageSize);

        // Apply pagination
        var pagedEntries = leaderboardData
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        // Create response
        var response = new LeaderboardResponse
        {
            Entries = pagedEntries,
            TotalPlayers = totalPlayers,
            Page = page,
            PageSize = pageSize,
            TotalPages = totalPages
        };

        // Get current user entry if requested
        if (currentUserId.HasValue)
        {
            response.CurrentUserEntry = await GetCurrentUserEntryAsync(currentUserId.Value, gameType, period);
        }

        // Cache the result (without current user entry to make it reusable)
        var cacheOptions = new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(CacheExpirationMinutes),
            SlidingExpiration = TimeSpan.FromMinutes(2)
        };

        var cacheableResponse = new LeaderboardResponse
        {
            Entries = response.Entries,
            TotalPlayers = response.TotalPlayers,
            Page = response.Page,
            PageSize = response.PageSize,
            TotalPages = response.TotalPages
            // Don't cache CurrentUserEntry as it's user-specific
        };

        _cache.Set(cacheKey, cacheableResponse, cacheOptions);
        _logger.LogDebug("Cached leaderboard for key: {CacheKey}", cacheKey);

        return response;
    }

    public void ClearCache()
    {
        // Unfortunately, IMemoryCache doesn't have a clear all method
        // We would need to track cache keys or use a different caching solution
        // For now, we'll log that cache clearing was requested
        _logger.LogInformation("Leaderboard cache clear requested. Note: Individual entries will expire naturally.");
    }

    private async Task<List<LeaderboardEntry>> GetLeaderboardDataAsync(string? gameType, DateTime? fromDate)
    {
        // Build query for game sessions with user data
        var query = _context.GameSessions
            .Include(gs => gs.User)
            .AsQueryable();

        // Apply game type filter
        if (!string.IsNullOrWhiteSpace(gameType))
        {
            query = query.Where(gs => gs.GameType == gameType);
        }

        // Apply date filter - use SessionStartTime for more accurate filtering
        if (fromDate.HasValue)
        {
            query = query.Where(gs => gs.SessionStartTime >= fromDate.Value);
        }

        // Group by user and calculate aggregated stats
        var userStats = await query
            .GroupBy(gs => new { gs.UserId, gs.User.Name, gs.User.Email })
            .Select(g => new
            {
                UserId = g.Key.UserId,
                Name = g.Key.Name,
                Email = g.Key.Email,
                TotalGames = g.Count(),
                TotalCorrectAnswers = g.Sum(gs => gs.CorrectAnswers),
                TotalWrongAnswers = g.Sum(gs => gs.WrongAnswers),
                LastPlayedAt = g.Max(gs => gs.SessionStartTime),
                Sessions = g.OrderBy(gs => gs.SessionStartTime).ToList()
            })
            .ToListAsync();

        // Calculate derived metrics and create leaderboard entries
        var leaderboardEntries = new List<LeaderboardEntry>();

        foreach (var userStat in userStats)
        {
            var totalAnswers = userStat.TotalCorrectAnswers + userStat.TotalWrongAnswers;
            var accuracy = totalAnswers > 0 ? Math.Round((double)userStat.TotalCorrectAnswers / totalAnswers * 100, 2) : 0;
            
            // Calculate best streak
            var bestStreak = CalculateBestStreak(userStat.Sessions);
            
            // Calculate total score (weighted combination of correct answers and accuracy)
            var totalScore = CalculateTotalScore(userStat.TotalCorrectAnswers, accuracy, bestStreak);

            var displayName = !string.IsNullOrWhiteSpace(userStat.Name) 
                ? userStat.Name 
                : userStat.Email.Split('@')[0];

            leaderboardEntries.Add(new LeaderboardEntry
            {
                UserId = userStat.UserId.ToString(),
                DisplayName = displayName,
                TotalScore = totalScore,
                TotalGames = userStat.TotalGames,
                Accuracy = accuracy,
                BestStreak = bestStreak,
                LastPlayedAt = userStat.LastPlayedAt
            });
        }

        // Sort by total score (descending) and assign ranks
        var sortedEntries = leaderboardEntries
            .OrderByDescending(e => e.TotalScore)
            .ThenByDescending(e => e.Accuracy)
            .ThenByDescending(e => e.BestStreak)
            .ThenByDescending(e => e.LastPlayedAt)
            .ToList();

        // Assign ranks
        for (int i = 0; i < sortedEntries.Count; i++)
        {
            sortedEntries[i].Rank = i + 1;
        }

        return sortedEntries;
    }

    private async Task<LeaderboardEntry?> GetCurrentUserEntryAsync(Guid userId, string? gameType, string? period)
    {
        DateTime? fromDate = GetFromDateForPeriod(period);

        var query = _context.GameSessions
            .Include(gs => gs.User)
            .Where(gs => gs.UserId == userId);

        if (!string.IsNullOrWhiteSpace(gameType))
        {
            query = query.Where(gs => gs.GameType == gameType);
        }

        if (fromDate.HasValue)
        {
            query = query.Where(gs => gs.SessionStartTime >= fromDate.Value);
        }

        var userSessions = await query.OrderBy(gs => gs.SessionStartTime).ToListAsync();

        if (!userSessions.Any())
        {
            return null;
        }

        var user = userSessions.First().User;
        var totalCorrect = userSessions.Sum(s => s.CorrectAnswers);
        var totalWrong = userSessions.Sum(s => s.WrongAnswers);
        var totalAnswers = totalCorrect + totalWrong;
        var accuracy = totalAnswers > 0 ? Math.Round((double)totalCorrect / totalAnswers * 100, 2) : 0;
        var bestStreak = CalculateBestStreak(userSessions);
        var totalScore = CalculateTotalScore(totalCorrect, accuracy, bestStreak);

        // Get user's rank by counting users with higher scores
        var allUserStats = await GetLeaderboardDataAsync(gameType, fromDate);
        var userRank = allUserStats.FindIndex(e => e.UserId == userId.ToString()) + 1;

        return new LeaderboardEntry
        {
            UserId = userId.ToString(),
            DisplayName = !string.IsNullOrWhiteSpace(user.Name) ? user.Name : user.Email.Split('@')[0],
            TotalScore = totalScore,
            TotalGames = userSessions.Count,
            Accuracy = accuracy,
            BestStreak = bestStreak,
            LastPlayedAt = userSessions.Max(s => s.SessionStartTime),
            Rank = userRank > 0 ? userRank : allUserStats.Count + 1
        };
    }

    private int CalculateBestStreak(List<GameSession> sessions)
    {
        if (!sessions.Any())
        {
            return 0;
        }

        int currentStreak = 0;
        int bestStreak = 0;

        foreach (var session in sessions.OrderBy(s => s.SessionStartTime))
        {
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

    private int CalculateTotalScore(int correctAnswers, double accuracy, int bestStreak)
    {
        // Weighted scoring system:
        // - Base score from correct answers
        // - Bonus for high accuracy
        // - Bonus for streaks
        var baseScore = correctAnswers;
        var accuracyBonus = (int)(accuracy * 0.1); // 10% of accuracy as bonus points
        var streakBonus = bestStreak * 5; // 5 points per streak

        return baseScore + accuracyBonus + streakBonus;
    }

    private DateTime? GetFromDateForPeriod(string? period)
    {
        if (string.IsNullOrWhiteSpace(period) || period == LeaderboardPeriods.AllTime)
        {
            return null;
        }

        var now = DateTime.UtcNow;
        return period.ToLowerInvariant() switch
        {
            LeaderboardPeriods.Week => now.AddDays(-7),
            LeaderboardPeriods.Month => now.AddMonths(-1),
            LeaderboardPeriods.Year => now.AddYears(-1),
            _ => null
        };
    }

    private string GenerateCacheKey(string? gameType, string? period, int page, int pageSize)
    {
        var keyParts = new List<string> { CacheKeyPrefix };
        
        if (!string.IsNullOrWhiteSpace(gameType))
        {
            keyParts.Add($"type:{gameType}");
        }
        
        if (!string.IsNullOrWhiteSpace(period))
        {
            keyParts.Add($"period:{period}");
        }
        
        keyParts.Add($"page:{page}");
        keyParts.Add($"size:{pageSize}");
        
        return string.Join(":", keyParts);
    }
}