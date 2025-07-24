using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using GeoQuizApi.Models.DTOs.Auth;
using GeoQuizApi.Models.DTOs.GameStats;
using GeoQuizApi.Services;

namespace GeoQuizApi.Tests.Integration.Controllers;

[Trait("Category", "Integration")]
public class GameStatsControllerTests : BaseIntegrationTest
{
    public GameStatsControllerTests(TestWebApplicationFactory<Program> factory) : base(factory)
    {
    }

    private async Task<string> GetAuthTokenAsync(string email = "gametest@example.com", string password = "TestPassword123")
    {
        var registerRequest = new RegisterRequest
        {
            Email = email,
            Password = password,
            Name = "Game Test User"
        };

        var response = await _client.PostAsJsonAsync("/api/auth/register", registerRequest);
        var authResponse = await response.Content.ReadFromJsonAsync<AuthResponse>();
        return authResponse!.AccessToken;
    }

    [Fact]
    public async Task SaveGameSession_WithValidData_ShouldCreateSession()
    {
        // Arrange
        var uniqueEmail = GenerateUniqueEmail("savetest");
        var token = await GetAuthTokenAsync(uniqueEmail);
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var baseTime = GenerateUniqueTimestamp();
        var gameSessionRequest = new GameSessionRequest
        {
            GameType = "countries",
            CorrectAnswers = 8,
            WrongAnswers = 2,
            SessionStartTime = baseTime.AddMinutes(-5),
            SessionEndTime = baseTime
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/game-stats", gameSessionRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var gameSession = await response.Content.ReadFromJsonAsync<GameSessionDto>();
        gameSession.Should().NotBeNull();
        gameSession!.GameType.Should().Be("countries");
        gameSession.CorrectAnswers.Should().Be(8);
        gameSession.WrongAnswers.Should().Be(2);
    }

    [Fact]
    public async Task SaveGameSession_WithoutAuth_ShouldReturnUnauthorized()
    {
        // Arrange
        var baseTime = GenerateUniqueTimestamp();
        var gameSessionRequest = new GameSessionRequest
        {
            GameType = "countries",
            CorrectAnswers = 8,
            WrongAnswers = 2,
            SessionStartTime = baseTime.AddMinutes(-5),
            SessionEndTime = baseTime
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/game-stats", gameSessionRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task SaveGameSession_WithInvalidGameType_ShouldReturnValidationError()
    {
        // Arrange
        var uniqueEmail = GenerateUniqueEmail("invalidtype");
        var token = await GetAuthTokenAsync(uniqueEmail);
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var baseTime = GenerateUniqueTimestamp();
        var gameSessionRequest = new GameSessionRequest
        {
            GameType = "invalid-game-type",
            CorrectAnswers = 8,
            WrongAnswers = 2,
            SessionStartTime = baseTime.AddMinutes(-5),
            SessionEndTime = baseTime
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/game-stats", gameSessionRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    [Fact]
    public async Task GetUserStats_WithNoSessions_ShouldReturnEmptyStats()
    {
        // Arrange
        var uniqueEmail = GenerateUniqueEmail("nostats");
        var token = await GetAuthTokenAsync(uniqueEmail);
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.GetAsync("/api/game-stats/me");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var stats = await response.Content.ReadFromJsonAsync<GameStatsResponse>();
        stats.Should().NotBeNull();
        stats!.TotalGames.Should().Be(0);
        stats.TotalCorrectAnswers.Should().Be(0);
        stats.TotalWrongAnswers.Should().Be(0);
        stats.AverageAccuracy.Should().Be(0);
        stats.GameTypeStats.Should().BeEmpty();
    }

    [Fact]
    public async Task GetUserStats_WithSessions_ShouldReturnAggregatedStats()
    {
        // Arrange
        var uniqueEmail = GenerateUniqueEmail("withstats");
        var token = await GetAuthTokenAsync(uniqueEmail);
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        // Create multiple game sessions with unique timestamps
        var baseTime = GenerateUniqueTimestamp().AddDays(-10);
        var sessions = new[]
        {
            new GameSessionRequest
            {
                GameType = "countries",
                CorrectAnswers = 8,
                WrongAnswers = 2,
                SessionStartTime = baseTime.AddDays(1),
                SessionEndTime = baseTime.AddDays(1).AddMinutes(5)
            },
            new GameSessionRequest
            {
                GameType = "flags",
                CorrectAnswers = 6,
                WrongAnswers = 4,
                SessionStartTime = baseTime.AddDays(2),
                SessionEndTime = baseTime.AddDays(2).AddMinutes(3)
            },
            new GameSessionRequest
            {
                GameType = "countries",
                CorrectAnswers = 9,
                WrongAnswers = 1,
                SessionStartTime = baseTime.AddDays(3),
                SessionEndTime = baseTime.AddDays(3).AddMinutes(4)
            }
        };

        foreach (var session in sessions)
        {
            var sessionResponse = await _client.PostAsJsonAsync("/api/game-stats", session);
            sessionResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            await Task.Delay(10); // Small delay to prevent race conditions
        }

        // Act
        var response = await _client.GetAsync("/api/game-stats/me");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var stats = await response.Content.ReadFromJsonAsync<GameStatsResponse>();
        stats.Should().NotBeNull();
        stats!.TotalGames.Should().Be(3);
        stats.TotalCorrectAnswers.Should().Be(23); // 8 + 6 + 9
        stats.TotalWrongAnswers.Should().Be(7); // 2 + 4 + 1
        stats.AverageAccuracy.Should().BeApproximately(76.67, 0.1); // 23/30 * 100
        stats.GameTypeStats.Should().HaveCount(2);
        stats.GameTypeStats.Should().ContainKey("countries");
        stats.GameTypeStats.Should().ContainKey("flags");
    }

    [Fact]
    public async Task GetUserGameHistory_ShouldReturnSessionsOrderedByDate()
    {
        // Arrange
        var uniqueEmail = GenerateUniqueEmail("history");
        var token = await GetAuthTokenAsync(uniqueEmail);
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        // Create sessions with different dates and unique timestamps
        var baseTime = GenerateUniqueTimestamp().AddDays(-10);
        var sessions = new[]
        {
            new GameSessionRequest
            {
                GameType = "countries",
                CorrectAnswers = 8,
                WrongAnswers = 2,
                SessionStartTime = baseTime.AddDays(1),
                SessionEndTime = baseTime.AddDays(1).AddMinutes(5)
            },
            new GameSessionRequest
            {
                GameType = "flags",
                CorrectAnswers = 6,
                WrongAnswers = 4,
                SessionStartTime = baseTime.AddDays(3), // Most recent for ordering test
                SessionEndTime = baseTime.AddDays(3).AddMinutes(3)
            },
            new GameSessionRequest
            {
                GameType = "states",
                CorrectAnswers = 7,
                WrongAnswers = 3,
                SessionStartTime = baseTime.AddDays(2),
                SessionEndTime = baseTime.AddDays(2).AddMinutes(4)
            }
        };

        foreach (var session in sessions)
        {
            var sessionResponse = await _client.PostAsJsonAsync("/api/game-stats", session);
            sessionResponse.StatusCode.Should().Be(HttpStatusCode.OK);
            await Task.Delay(10); // Small delay to prevent race conditions
        }

        // Act
        var response = await _client.GetAsync("/api/game-stats/me/history");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var history = await response.Content.ReadFromJsonAsync<GameHistoryResponse>();
        history.Should().NotBeNull();
        history!.Sessions.Should().HaveCount(3);
        
        // Should be ordered by CreatedAt descending (most recently created first)
        // Since we create sessions in order: countries, flags, states
        history.Sessions[0].GameType.Should().Be("states"); // Last created
        history.Sessions[1].GameType.Should().Be("flags"); // Middle created
        history.Sessions[2].GameType.Should().Be("countries"); // First created
    }

    [Fact]
    public async Task GetUserGameHistory_WithPagination_ShouldReturnCorrectPage()
    {
        // Arrange
        var uniqueEmail = GenerateUniqueEmail("pagination");
        var token = await GetAuthTokenAsync(uniqueEmail);
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        // Create 15 sessions with unique timestamps and small delays
        var baseTime = GenerateUniqueTimestamp().AddDays(-20); // Start from 20 days ago to avoid any timing issues
        
        for (int i = 1; i <= 15; i++)
        {
            var sessionStartTime = baseTime.AddDays(i).AddMilliseconds(i * 100); // Ensure unique timestamps
            var session = new GameSessionRequest
            {
                GameType = "countries",
                CorrectAnswers = i,
                WrongAnswers = Math.Max(0, 10 - i), // Ensure non-negative values
                SessionStartTime = sessionStartTime,
                SessionEndTime = sessionStartTime.AddMinutes(5)
            };
            
            var response = await _client.PostAsJsonAsync("/api/game-stats", session);
            response.StatusCode.Should().Be(HttpStatusCode.OK, $"Session {i} should be saved successfully. Response: {await response.Content.ReadAsStringAsync()}");
            
            // Small delay to prevent any potential race conditions
            await Task.Delay(10);
        }

        // Small delay before querying to ensure all data is committed
        await Task.Delay(100);

        // Act
        var page1Response = await _client.GetAsync("/api/game-stats/me/history?page=1&pageSize=10");
        var page2Response = await _client.GetAsync("/api/game-stats/me/history?page=2&pageSize=10");

        // Assert
        page1Response.StatusCode.Should().Be(HttpStatusCode.OK);
        page2Response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var page1 = await page1Response.Content.ReadFromJsonAsync<GameHistoryResponse>();
        var page2 = await page2Response.Content.ReadFromJsonAsync<GameHistoryResponse>();
        
        page1!.Sessions.Should().HaveCount(10);
        page2!.Sessions.Should().HaveCount(5);
        
        // Verify ordering (most recent first - session 15 should be first)
        page1.Sessions[0].CorrectAnswers.Should().Be(15); // Most recent session
        page1.Sessions[9].CorrectAnswers.Should().Be(6);  // 10th session on page 1
        page2.Sessions[0].CorrectAnswers.Should().Be(5);  // First session on page 2
        page2.Sessions[4].CorrectAnswers.Should().Be(1);  // Last session (oldest)
    }

    [Fact]
    public async Task MigrateAnonymousProgress_WithValidData_ShouldCreateSessions()
    {
        // Arrange
        var uniqueEmail = GenerateUniqueEmail("migrate");
        var token = await GetAuthTokenAsync(uniqueEmail);
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var baseTime = GenerateUniqueTimestamp();
        var migrateRequest = new MigrateProgressRequest
        {
            AnonymousSessions = new List<AnonymousGameSessionDto>
            {
                new AnonymousGameSessionDto
                {
                    GameType = "countries",
                    CorrectAnswers = 8,
                    WrongAnswers = 2,
                    SessionStartTime = baseTime.AddDays(-2),
                    SessionEndTime = baseTime.AddDays(-2).AddMinutes(5)
                },
                new AnonymousGameSessionDto
                {
                    GameType = "flags",
                    CorrectAnswers = 6,
                    WrongAnswers = 4,
                    SessionStartTime = baseTime.AddDays(-1),
                    SessionEndTime = baseTime.AddDays(-1).AddMinutes(3)
                }
            }
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/game-stats/migrate", migrateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        // Verify sessions were created by checking user stats
        var statsResponse = await _client.GetAsync("/api/game-stats/me");
        var stats = await statsResponse.Content.ReadFromJsonAsync<GameStatsResponse>();
        
        stats!.TotalGames.Should().Be(2);
        stats.TotalCorrectAnswers.Should().Be(14); // 8 + 6
        stats.TotalWrongAnswers.Should().Be(6); // 2 + 4
    }

    [Fact]
    public async Task GetUserStats_WithoutAuth_ShouldReturnUnauthorized()
    {
        // Act
        var response = await _client.GetAsync("/api/game-stats/me");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetUserGameHistory_WithoutAuth_ShouldReturnUnauthorized()
    {
        // Act
        var response = await _client.GetAsync("/api/game-stats/me/history");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task MigrateAnonymousProgress_WithoutAuth_ShouldReturnUnauthorized()
    {
        // Arrange
        var migrateRequest = new MigrateProgressRequest
        {
            AnonymousSessions = new List<AnonymousGameSessionDto>()
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/game-stats/migrate", migrateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}