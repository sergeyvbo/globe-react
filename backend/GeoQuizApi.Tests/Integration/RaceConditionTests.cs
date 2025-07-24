using System.Collections.Concurrent;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using GeoQuizApi.Services;
using GeoQuizApi.Models.Entities;
using GeoQuizApi.Data;
using Microsoft.EntityFrameworkCore;

namespace GeoQuizApi.Tests.Integration;

/// <summary>
/// Tests to verify race condition fixes in production scenarios
/// These tests demonstrate how to test for concurrent access issues
/// </summary>
public class RaceConditionTests : BaseIntegrationTest
{
    private IAuthService _authService = null!;
    private IGameStatsService _gameStatsService = null!;
    private ILogger<RaceConditionTests> _logger = null!;

    public RaceConditionTests(TestWebApplicationFactory<Program> factory) : base(factory)
    {
    }

    public override async Task InitializeAsync()
    {
        await base.InitializeAsync();
        
        using var scope = _factory.Services.CreateScope();
        _authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
        _gameStatsService = scope.ServiceProvider.GetRequiredService<IGameStatsService>();
        _logger = scope.ServiceProvider.GetRequiredService<ILogger<RaceConditionTests>>();
    }

    [Fact]
    public async Task ConcurrentUserRegistration_WithSameEmail_ShouldHandleGracefully()
    {
        // Arrange
        const string email = "concurrent@example.com";
        const string password = "password123";
        const int concurrentRequests = 10;
        
        var results = new ConcurrentBag<(bool Success, Exception? Exception)>();

        // Act - Simulate concurrent registration attempts
        var tasks = Enumerable.Range(0, concurrentRequests)
            .Select(async i =>
            {
                try
                {
                    using var scope = _factory.Services.CreateScope();
                    var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
                    
                    await authService.RegisterAsync(email, password, $"User {i}");
                    results.Add((true, null));
                }
                catch (Exception ex)
                {
                    results.Add((false, ex));
                }
            });

        await Task.WhenAll(tasks);

        // Assert
        var successCount = results.Count(r => r.Success);
        var failureCount = results.Count(r => !r.Success);
        
        Assert.Equal(1, successCount); // "Exactly one registration should succeed"
        Assert.Equal(concurrentRequests - 1, failureCount); // "All other registrations should fail"
        
        // Verify that failures are due to duplicate email, not other errors
        var failures = results.Where(r => !r.Success).ToList();
        foreach (var failure in failures)
        {
            var message = failure.Exception?.Message ?? "";
            Assert.True(message.Contains("already exists") || 
                       message.Contains("unique constraint") || 
                       message.Contains("duplicate"),
                       $"Unexpected error: {failure.Exception?.Message}");
        }

        // Verify only one user exists in database
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<GeoQuizDbContext>();
        var userCount = await context.Users.CountAsync(u => u.Email == email);
        Assert.Equal(1, userCount); // "Only one user should exist in database"
    }

    [Fact]
    public async Task ConcurrentGameSessionCreation_ShouldHaveUniqueTimestamps()
    {
        // Arrange
        var user = await CreateTestUserAsync();
        const int concurrentSessions = 20;
        var sessionStartTime = DateTime.UtcNow.AddMinutes(-10);
        
        var createdSessions = new ConcurrentBag<GameSession>();

        // Act - Create multiple game sessions simultaneously
        var tasks = Enumerable.Range(0, concurrentSessions)
            .Select(async i =>
            {
                try
                {
                    using var scope = _factory.Services.CreateScope();
                    var gameStatsService = scope.ServiceProvider.GetRequiredService<IGameStatsService>();
                    
                    var session = await gameStatsService.SaveGameSessionAsync(
                        user.Id,
                        "countries",
                        i + 1, // Different scores to make sessions unique
                        5,
                        sessionStartTime.AddSeconds(i),
                        sessionStartTime.AddSeconds(i + 30));
                    
                    createdSessions.Add(session);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to create game session {Index}", i);
                    throw;
                }
            });

        await Task.WhenAll(tasks);

        // Assert
        Assert.Equal(concurrentSessions, createdSessions.Count); // "All game sessions should be created successfully"

        var sessions = createdSessions.ToList();
        
        // Verify all CreatedAt timestamps are unique
        var createdAtTimestamps = sessions.Select(s => s.CreatedAt).ToList();
        var uniqueCreatedAtCount = createdAtTimestamps.Distinct().Count();
        Assert.Equal(concurrentSessions, uniqueCreatedAtCount); // "All CreatedAt timestamps should be unique"

        // Verify timestamps are in ascending order (due to TimestampManager)
        var sortedTimestamps = createdAtTimestamps.OrderBy(t => t).ToList();
        Assert.Equal(sortedTimestamps, createdAtTimestamps); // "CreatedAt timestamps should be in ascending order"

        // Verify database consistency
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<GeoQuizDbContext>();
        var dbSessionCount = await context.GameSessions.CountAsync(gs => gs.UserId == user.Id);
        Assert.Equal(concurrentSessions, dbSessionCount); // "All sessions should be persisted in database"
    }

    [Fact]
    public async Task ConcurrentTokenRefresh_ShouldHandleGracefully()
    {
        // Arrange
        var (user, _, refreshToken) = await CreateTestUserWithTokensAsync();
        const int concurrentRequests = 5;
        
        var results = new ConcurrentBag<(bool Success, Exception? Exception)>();

        // Act - Simulate concurrent token refresh attempts
        var tasks = Enumerable.Range(0, concurrentRequests)
            .Select(async i =>
            {
                try
                {
                    using var scope = _factory.Services.CreateScope();
                    var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
                    
                    await authService.RefreshTokenAsync(refreshToken);
                    results.Add((true, null));
                }
                catch (Exception ex)
                {
                    results.Add((false, ex));
                }
            });

        await Task.WhenAll(tasks);

        // Assert
        var successCount = results.Count(r => r.Success);
        var failureCount = results.Count(r => !r.Success);
        
        Assert.Equal(1, successCount); // "Exactly one token refresh should succeed"
        Assert.Equal(concurrentRequests - 1, failureCount); // "All other refreshes should fail"
        
        // Verify that failures are due to invalid/expired token
        var failures = results.Where(r => !r.Success).ToList();
        foreach (var failure in failures)
        {
            Assert.Contains("Invalid or expired refresh token", failure.Exception?.Message ?? "");
        }

        // Verify token state in database
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<GeoQuizDbContext>();
        
        var originalToken = await context.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.Token == refreshToken);
        Assert.True(originalToken?.IsRevoked); // "Original token should be revoked"
        
        var activeTokens = await context.RefreshTokens
            .CountAsync(rt => rt.UserId == user.Id && !rt.IsRevoked);
        Assert.Equal(1, activeTokens); // "Only one active token should exist"
    }

    [Fact]
    public async Task ConcurrentStatisticsCalculation_ShouldBeConsistent()
    {
        // Arrange
        var user = await CreateTestUserAsync();
        const int sessionCount = 10;
        
        // Create some initial game sessions
        for (int i = 0; i < sessionCount; i++)
        {
            await _gameStatsService.SaveGameSessionAsync(
                user.Id,
                "countries",
                i + 1,
                2,
                DateTime.UtcNow.AddMinutes(-i),
                DateTime.UtcNow.AddMinutes(-i + 1));
        }

        // Act - Concurrent statistics requests while creating new sessions
        var statsResults = new ConcurrentBag<GameStatsResult>();
        var newSessionTasks = new List<Task>();
        var statsRequestTasks = new List<Task>();

        // Start creating new sessions
        for (int i = 0; i < 5; i++)
        {
            int sessionIndex = i;
            newSessionTasks.Add(Task.Run(async () =>
            {
                using var scope = _factory.Services.CreateScope();
                var gameStatsService = scope.ServiceProvider.GetRequiredService<IGameStatsService>();
                
                await gameStatsService.SaveGameSessionAsync(
                    user.Id,
                    "flags",
                    sessionIndex + 10,
                    1,
                    DateTime.UtcNow.AddMinutes(sessionIndex),
                    DateTime.UtcNow.AddMinutes(sessionIndex + 1));
            }));
        }

        // Start concurrent statistics requests
        for (int i = 0; i < 10; i++)
        {
            statsRequestTasks.Add(Task.Run(async () =>
            {
                using var scope = _factory.Services.CreateScope();
                var gameStatsService = scope.ServiceProvider.GetRequiredService<IGameStatsService>();
                
                var stats = await gameStatsService.GetUserStatsAsync(user.Id);
                statsResults.Add(stats);
            }));
        }

        await Task.WhenAll(newSessionTasks.Concat(statsRequestTasks));

        // Assert
        var allStats = statsResults.ToList();
        Assert.Equal(10, allStats.Count); // "All statistics requests should complete"

        // All statistics should be internally consistent
        foreach (var stats in allStats)
        {
            Assert.True(stats.TotalCorrectAnswers + stats.TotalWrongAnswers > 0); // "Total answers should be positive"
            
            if (stats.TotalGames > 0)
            {
                Assert.InRange(stats.AverageAccuracy, 0, 100); // "Average accuracy should be between 0 and 100"
                Assert.NotNull(stats.LastPlayedAt); // "LastPlayedAt should not be null when games exist"
            }
        }

        // Final verification - check final state
        var finalStats = await _gameStatsService.GetUserStatsAsync(user.Id);
        Assert.Equal(sessionCount + 5, finalStats.TotalGames); // "Final game count should include all sessions"
    }

    [Fact]
    public async Task TimestampManager_ShouldGenerateUniqueTimestamps()
    {
        // Arrange
        const int timestampCount = 1000;
        var timestamps = new ConcurrentBag<DateTime>();

        // Act - Generate timestamps concurrently
        var tasks = Enumerable.Range(0, timestampCount)
            .Select(_ => Task.Run(() =>
            {
                var timestamp = TimestampManager.GetUniqueTimestamp();
                timestamps.Add(timestamp);
            }));

        await Task.WhenAll(tasks);

        // Assert
        var timestampList = timestamps.ToList();
        Assert.Equal(timestampCount, timestampList.Count); // "All timestamps should be generated"

        var uniqueCount = timestampList.Distinct().Count();
        Assert.Equal(timestampCount, uniqueCount); // "All timestamps should be unique"

        // Verify timestamps are in ascending order when sorted
        var sortedTimestamps = timestampList.OrderBy(t => t).ToList();
        for (int i = 1; i < sortedTimestamps.Count; i++)
        {
            Assert.True(sortedTimestamps[i] > sortedTimestamps[i - 1]); // $"Timestamp at index {i} should be greater than previous"
        }
    }

    private async Task<User> CreateTestUserAsync()
    {
        var email = $"test_{Guid.NewGuid():N}@example.com";
        var (user, _, _) = await _authService.RegisterAsync(email, "password123", "Test User");
        return user;
    }

    private async Task<(User user, string accessToken, string refreshToken)> CreateTestUserWithTokensAsync()
    {
        var email = $"test_{Guid.NewGuid():N}@example.com";
        return await _authService.RegisterAsync(email, "password123", "Test User");
    }
}