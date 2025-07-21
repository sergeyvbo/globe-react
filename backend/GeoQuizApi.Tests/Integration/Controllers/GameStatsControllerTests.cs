using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using GeoQuizApi.Models.DTOs.Auth;
using GeoQuizApi.Models.DTOs.GameStats;
using GeoQuizApi.Services;

namespace GeoQuizApi.Tests.Integration.Controllers;

public class GameStatsControllerTests : IClassFixture<TestWebApplicationFactory<Program>>
{
    private readonly TestWebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public GameStatsControllerTests(TestWebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
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
        var token = await GetAuthTokenAsync();
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var gameSessionRequest = new GameSessionRequest
        {
            GameType = "countries",
            CorrectAnswers = 8,
            WrongAnswers = 2,
            SessionStartTime = DateTime.UtcNow.AddMinutes(-5),
            SessionEndTime = DateTime.UtcNow
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
        var gameSessionRequest = new GameSessionRequest
        {
            GameType = "countries",
            CorrectAnswers = 8,
            WrongAnswers = 2,
            SessionStartTime = DateTime.UtcNow.AddMinutes(-5),
            SessionEndTime = DateTime.UtcNow
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
        var token = await GetAuthTokenAsync();
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var gameSessionRequest = new GameSessionRequest
        {
            GameType = "invalid-game-type",
            CorrectAnswers = 8,
            WrongAnswers = 2,
            SessionStartTime = DateTime.UtcNow.AddMinutes(-5),
            SessionEndTime = DateTime.UtcNow
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
        var token = await GetAuthTokenAsync("nostats@example.com");
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
        var token = await GetAuthTokenAsync("withstats@example.com");
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        // Create multiple game sessions
        var sessions = new[]
        {
            new GameSessionRequest
            {
                GameType = "countries",
                CorrectAnswers = 8,
                WrongAnswers = 2,
                SessionStartTime = DateTime.UtcNow.AddDays(-2),
                SessionEndTime = DateTime.UtcNow.AddDays(-2).AddMinutes(5)
            },
            new GameSessionRequest
            {
                GameType = "flags",
                CorrectAnswers = 6,
                WrongAnswers = 4,
                SessionStartTime = DateTime.UtcNow.AddDays(-1),
                SessionEndTime = DateTime.UtcNow.AddDays(-1).AddMinutes(3)
            },
            new GameSessionRequest
            {
                GameType = "countries",
                CorrectAnswers = 9,
                WrongAnswers = 1,
                SessionStartTime = DateTime.UtcNow.AddHours(-1),
                SessionEndTime = DateTime.UtcNow.AddHours(-1).AddMinutes(4)
            }
        };

        foreach (var session in sessions)
        {
            await _client.PostAsJsonAsync("/api/game-stats", session);
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
        var token = await GetAuthTokenAsync("history@example.com");
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        // Create sessions with different dates
        var sessions = new[]
        {
            new GameSessionRequest
            {
                GameType = "countries",
                CorrectAnswers = 8,
                WrongAnswers = 2,
                SessionStartTime = DateTime.UtcNow.AddDays(-3),
                SessionEndTime = DateTime.UtcNow.AddDays(-3).AddMinutes(5)
            },
            new GameSessionRequest
            {
                GameType = "flags",
                CorrectAnswers = 6,
                WrongAnswers = 4,
                SessionStartTime = DateTime.UtcNow.AddDays(-1),
                SessionEndTime = DateTime.UtcNow.AddDays(-1).AddMinutes(3)
            },
            new GameSessionRequest
            {
                GameType = "states",
                CorrectAnswers = 7,
                WrongAnswers = 3,
                SessionStartTime = DateTime.UtcNow.AddDays(-2),
                SessionEndTime = DateTime.UtcNow.AddDays(-2).AddMinutes(4)
            }
        };

        foreach (var session in sessions)
        {
            await _client.PostAsJsonAsync("/api/game-stats", session);
        }

        // Act
        var response = await _client.GetAsync("/api/game-stats/me/history");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var history = await response.Content.ReadFromJsonAsync<GameHistoryResponse>();
        history.Should().NotBeNull();
        history!.Sessions.Should().HaveCount(3);
        
        // Should be ordered by date descending (most recent first)
        history.Sessions[0].GameType.Should().Be("flags"); // Most recent
        history.Sessions[1].GameType.Should().Be("states"); // Middle
        history.Sessions[2].GameType.Should().Be("countries"); // Oldest
    }

    [Fact]
    public async Task GetUserGameHistory_WithPagination_ShouldReturnCorrectPage()
    {
        // Arrange
        var token = await GetAuthTokenAsync("pagination@example.com");
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        // Create 15 sessions
        for (int i = 1; i <= 15; i++)
        {
            var session = new GameSessionRequest
            {
                GameType = "countries",
                CorrectAnswers = i,
                WrongAnswers = 10 - i,
                SessionStartTime = DateTime.UtcNow.AddDays(-i),
                SessionEndTime = DateTime.UtcNow.AddDays(-i).AddMinutes(5)
            };
            await _client.PostAsJsonAsync("/api/game-stats", session);
        }

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
        
        // Verify ordering (most recent first)
        page1.Sessions[0].CorrectAnswers.Should().Be(1); // Most recent session
        page1.Sessions[9].CorrectAnswers.Should().Be(10);
        page2.Sessions[0].CorrectAnswers.Should().Be(11);
    }

    [Fact]
    public async Task MigrateAnonymousProgress_WithValidData_ShouldCreateSessions()
    {
        // Arrange
        var token = await GetAuthTokenAsync("migrate@example.com");
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var migrateRequest = new MigrateProgressRequest
        {
            AnonymousSessions = new List<AnonymousGameSessionDto>
            {
                new AnonymousGameSessionDto
                {
                    GameType = "countries",
                    CorrectAnswers = 8,
                    WrongAnswers = 2,
                    SessionStartTime = DateTime.UtcNow.AddDays(-2),
                    SessionEndTime = DateTime.UtcNow.AddDays(-2).AddMinutes(5)
                },
                new AnonymousGameSessionDto
                {
                    GameType = "flags",
                    CorrectAnswers = 6,
                    WrongAnswers = 4,
                    SessionStartTime = DateTime.UtcNow.AddDays(-1),
                    SessionEndTime = DateTime.UtcNow.AddDays(-1).AddMinutes(3)
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