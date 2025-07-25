using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using GeoQuizApi.Models.DTOs.Auth;
using GeoQuizApi.Models.DTOs.GameStats;
using GeoQuizApi.Models.DTOs.Leaderboard;

namespace GeoQuizApi.Tests.Integration.Controllers;

[Trait("Category", "Integration")]
public class LeaderboardControllerTests : BaseIsolatedIntegrationTest
{



    private async Task<string> CreateUserWithGameSessionsAsync(string email, string name, List<GameSessionRequest> sessions)
    {
        // Register user
        var registerRequest = new RegisterRequest
        {
            Email = email,
            Password = "TestPassword123",
            Name = name
        };

        var registerResponse = await _client.PostAsJsonAsync("/api/auth/register", registerRequest);
        var authResponse = await registerResponse.Content.ReadFromJsonAsync<AuthResponse>();
        var token = authResponse!.AccessToken;

        // Create game sessions
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        foreach (var session in sessions)
        {
            var sessionResponse = await _client.PostAsJsonAsync("/api/game-stats", session);
            sessionResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        // Clear auth header for next user
        _client.DefaultRequestHeaders.Authorization = null;

        return token;
    }

    [Fact]
    public async Task GetGlobalLeaderboard_WithNoSessions_ShouldReturnEmptyLeaderboard()
    {
        // Act
        var response = await _client.GetAsync("/api/leaderboard");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var leaderboard = await response.Content.ReadFromJsonAsync<LeaderboardResponse>();
        leaderboard.Should().NotBeNull();
        leaderboard!.Entries.Should().BeEmpty();
        leaderboard.TotalPlayers.Should().Be(0);
    }

    [Fact]
    public async Task GetGlobalLeaderboard_WithGameSessions_ShouldReturnOrderedLeaderboard()
    {
        // Arrange - Create users with different scores using unique emails
        var testId = Guid.NewGuid().ToString("N")[..8];
        var baseTime = GenerateUniqueTimestamp().AddDays(-10);
        
        var aliceSessions = new List<GameSessionRequest>
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
                CorrectAnswers = 7,
                WrongAnswers = 3,
                SessionStartTime = baseTime.AddDays(2),
                SessionEndTime = baseTime.AddDays(2).AddMinutes(4)
            }
        };

        var bobSessions = new List<GameSessionRequest>
        {
            new GameSessionRequest
            {
                GameType = "countries",
                CorrectAnswers = 9,
                WrongAnswers = 1,
                SessionStartTime = baseTime.AddDays(3),
                SessionEndTime = baseTime.AddDays(3).AddMinutes(3)
            }
        };

        var charlieSessions = new List<GameSessionRequest>
        {
            new GameSessionRequest
            {
                GameType = "states",
                CorrectAnswers = 5,
                WrongAnswers = 5,
                SessionStartTime = baseTime.AddDays(4),
                SessionEndTime = baseTime.AddDays(4).AddMinutes(2)
            }
        };

        await CreateUserWithGameSessionsAsync($"alice_{testId}@leaderboard.com", "Alice Johnson", aliceSessions);
        await CreateUserWithGameSessionsAsync($"bob_{testId}@leaderboard.com", "Bob Smith", bobSessions);
        await CreateUserWithGameSessionsAsync($"charlie_{testId}@leaderboard.com", "Charlie Brown", charlieSessions);

        // Act
        var response = await _client.GetAsync("/api/leaderboard");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var leaderboard = await response.Content.ReadFromJsonAsync<LeaderboardResponse>();
        leaderboard.Should().NotBeNull();
        leaderboard!.Entries.Should().HaveCount(3);
        leaderboard.TotalPlayers.Should().Be(3);

        // Should be ordered by weighted score (highest first)
        leaderboard.Entries[0].DisplayName.Should().Be("Alice Johnson");
        leaderboard.Entries[0].Rank.Should().Be(1);
        leaderboard.Entries[0].TotalGames.Should().Be(2);
        leaderboard.Entries[0].TotalScore.Should().BeGreaterThan(15); // Will have bonuses

        leaderboard.Entries[1].DisplayName.Should().Be("Bob Smith");
        leaderboard.Entries[1].Rank.Should().Be(2);
        leaderboard.Entries[1].TotalGames.Should().Be(1);

        leaderboard.Entries[2].DisplayName.Should().Be("Charlie Brown");
        leaderboard.Entries[2].Rank.Should().Be(3);
        leaderboard.Entries[2].TotalGames.Should().Be(1);
    }

    [Fact]
    public async Task GetLeaderboardByGameType_ShouldFilterByGameType()
    {
        // Arrange
        var testId = Guid.NewGuid().ToString("N")[..8];
        var baseTime = GenerateUniqueTimestamp().AddDays(-10);
        
        var countriesSessions = new List<GameSessionRequest>
        {
            new GameSessionRequest
            {
                GameType = "countries",
                CorrectAnswers = 8,
                WrongAnswers = 2,
                SessionStartTime = baseTime.AddDays(1),
                SessionEndTime = baseTime.AddDays(1).AddMinutes(5)
            }
        };

        var flagsSessions = new List<GameSessionRequest>
        {
            new GameSessionRequest
            {
                GameType = "flags",
                CorrectAnswers = 9,
                WrongAnswers = 1,
                SessionStartTime = baseTime.AddDays(2),
                SessionEndTime = baseTime.AddDays(2).AddMinutes(3)
            }
        };

        await CreateUserWithGameSessionsAsync($"countries_{testId}@test.com", "Countries Player", countriesSessions);
        await CreateUserWithGameSessionsAsync($"flags_{testId}@test.com", "Flags Player", flagsSessions);

        // Act
        var response = await _client.GetAsync("/api/leaderboard/game-type/countries");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var leaderboard = await response.Content.ReadFromJsonAsync<LeaderboardResponse>();
        leaderboard.Should().NotBeNull();
        leaderboard!.Entries.Should().HaveCount(1);
        leaderboard.Entries[0].DisplayName.Should().Be("Countries Player");
    }

    [Fact]
    public async Task GetLeaderboardByGameType_WithInvalidGameType_ShouldReturnBadRequest()
    {
        // Act
        var response = await _client.GetAsync("/api/leaderboard/game-type/invalid-game-type");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetLeaderboardByPeriod_ShouldFilterByTimePeriod()
    {
        // Arrange
        var testId = Guid.NewGuid().ToString("N")[..8];
        
        var baseTime = GenerateUniqueTimestamp();
        var recentSessions = new List<GameSessionRequest>
        {
            new GameSessionRequest
            {
                GameType = "countries",
                CorrectAnswers = 8,
                WrongAnswers = 2,
                SessionStartTime = baseTime.AddDays(-2), // Within last week
                SessionEndTime = baseTime.AddDays(-2).AddMinutes(5)
            }
        };

        var oldSessions = new List<GameSessionRequest>
        {
            new GameSessionRequest
            {
                GameType = "countries",
                CorrectAnswers = 10,
                WrongAnswers = 0,
                SessionStartTime = baseTime.AddDays(-15), // Older than 7 days
                SessionEndTime = baseTime.AddDays(-15).AddMinutes(5)
            }
        };

        await CreateUserWithGameSessionsAsync($"recent_{testId}@test.com", "Recent Player", recentSessions);
        await CreateUserWithGameSessionsAsync($"old_{testId}@test.com", "Old Player", oldSessions);

        // Act
        var weekResponse = await _client.GetAsync("/api/leaderboard/period/week");
        var allTimeResponse = await _client.GetAsync("/api/leaderboard/period/all-time");

        // Assert
        weekResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        allTimeResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var weekLeaderboard = await weekResponse.Content.ReadFromJsonAsync<LeaderboardResponse>();
        var allTimeLeaderboard = await allTimeResponse.Content.ReadFromJsonAsync<LeaderboardResponse>();
        
        weekLeaderboard!.Entries.Should().HaveCount(1);
        weekLeaderboard.Entries[0].DisplayName.Should().Be("Recent Player");
        
        allTimeLeaderboard!.Entries.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetLeaderboardByPeriod_WithInvalidPeriod_ShouldReturnBadRequest()
    {
        // Act
        var response = await _client.GetAsync("/api/leaderboard/period/invalid-period");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetLeaderboard_WithPagination_ShouldReturnCorrectPage()
    {
        // Arrange - Create multiple users with unique emails
        var testId = Guid.NewGuid().ToString("N")[..8];
        var baseTime = GenerateUniqueTimestamp().AddDays(-20);
        
        for (int i = 1; i <= 15; i++)
        {
            var sessions = new List<GameSessionRequest>
            {
                new GameSessionRequest
                {
                    GameType = "countries",
                    CorrectAnswers = 15 - i + 1, // Higher scores for lower numbers
                    WrongAnswers = i - 1,
                    SessionStartTime = baseTime.AddDays(i).AddMilliseconds(i * 100),
                    SessionEndTime = baseTime.AddDays(i).AddMilliseconds(i * 100).AddMinutes(5)
                }
            };

            await CreateUserWithGameSessionsAsync($"user{i}_{testId}@test.com", $"User {i}", sessions);
        }

        // Act
        var page1Response = await _client.GetAsync("/api/leaderboard?page=1&pageSize=10");
        var page2Response = await _client.GetAsync("/api/leaderboard?page=2&pageSize=10");

        // Assert
        page1Response.StatusCode.Should().Be(HttpStatusCode.OK);
        page2Response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var page1 = await page1Response.Content.ReadFromJsonAsync<LeaderboardResponse>();
        var page2 = await page2Response.Content.ReadFromJsonAsync<LeaderboardResponse>();
        
        page1!.Entries.Should().HaveCount(10);
        page2!.Entries.Should().HaveCount(5);
        
        // Verify ordering (highest scores first)
        page1.Entries[0].DisplayName.Should().Be("User 1");
        page1.Entries[9].DisplayName.Should().Be("User 10");
        page2.Entries[0].DisplayName.Should().Be("User 11");
    }

    [Fact]
    public async Task GetLeaderboard_WithCurrentUser_ShouldIncludeCurrentUserEntry()
    {
        // Arrange
        var testId = Guid.NewGuid().ToString("N")[..8];
        var baseTime = GenerateUniqueTimestamp().AddDays(-10);
        
        var sessions = new List<GameSessionRequest>
        {
            new GameSessionRequest
            {
                GameType = "countries",
                CorrectAnswers = 8,
                WrongAnswers = 2,
                SessionStartTime = baseTime.AddDays(1),
                SessionEndTime = baseTime.AddDays(1).AddMinutes(5)
            }
        };

        var token = await CreateUserWithGameSessionsAsync($"current_{testId}@test.com", "Current User", sessions);

        // Set authorization header
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.GetAsync("/api/leaderboard");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var leaderboard = await response.Content.ReadFromJsonAsync<LeaderboardResponse>();
        leaderboard.Should().NotBeNull();
        leaderboard!.CurrentUserEntry.Should().NotBeNull();
        leaderboard.CurrentUserEntry!.DisplayName.Should().Be("Current User");
        leaderboard.CurrentUserEntry.Rank.Should().BeGreaterThan(0);
        
        // Clear auth header
        _client.DefaultRequestHeaders.Authorization = null;
    }

    [Fact]
    public async Task GetFilteredLeaderboard_WithBothFilters_ShouldApplyBothFilters()
    {
        // Arrange
        var testId = Guid.NewGuid().ToString("N")[..8];
        
        var baseTime = GenerateUniqueTimestamp();
        var recentCountriesSessions = new List<GameSessionRequest>
        {
            new GameSessionRequest
            {
                GameType = "countries",
                CorrectAnswers = 8,
                WrongAnswers = 2,
                SessionStartTime = baseTime.AddDays(-2), // Within last week
                SessionEndTime = baseTime.AddDays(-2).AddMinutes(5)
            }
        };

        var recentFlagsSessions = new List<GameSessionRequest>
        {
            new GameSessionRequest
            {
                GameType = "flags",
                CorrectAnswers = 9,
                WrongAnswers = 1,
                SessionStartTime = baseTime.AddDays(-1), // Within last week
                SessionEndTime = baseTime.AddDays(-1).AddMinutes(3)
            }
        };

        var oldCountriesSessions = new List<GameSessionRequest>
        {
            new GameSessionRequest
            {
                GameType = "countries",
                CorrectAnswers = 10,
                WrongAnswers = 0,
                SessionStartTime = baseTime.AddDays(-15), // Older than 7 days
                SessionEndTime = baseTime.AddDays(-15).AddMinutes(5)
            }
        };

        await CreateUserWithGameSessionsAsync($"recent-countries_{testId}@test.com", "Recent Countries", recentCountriesSessions);
        await CreateUserWithGameSessionsAsync($"recent-flags_{testId}@test.com", "Recent Flags", recentFlagsSessions);
        await CreateUserWithGameSessionsAsync($"old-countries_{testId}@test.com", "Old Countries", oldCountriesSessions);

        // Act
        var response = await _client.GetAsync("/api/leaderboard/filtered?gameType=countries&period=week");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var leaderboard = await response.Content.ReadFromJsonAsync<LeaderboardResponse>();
        leaderboard.Should().NotBeNull();
        leaderboard!.Entries.Should().HaveCount(1);
        leaderboard.Entries[0].DisplayName.Should().Be("Recent Countries");
    }

    [Theory]
    [InlineData("countries")]
    [InlineData("flags")]
    [InlineData("states")]
    public async Task GetLeaderboardByGameType_WithValidGameTypes_ShouldWork(string gameType)
    {
        // Arrange
        var testId = Guid.NewGuid().ToString("N")[..8];
        var baseTime = GenerateUniqueTimestamp().AddDays(-10);
        
        var sessions = new List<GameSessionRequest>
        {
            new GameSessionRequest
            {
                GameType = gameType,
                CorrectAnswers = 8,
                WrongAnswers = 2,
                SessionStartTime = baseTime.AddDays(1),
                SessionEndTime = baseTime.AddDays(1).AddMinutes(5)
            }
        };

        await CreateUserWithGameSessionsAsync($"{gameType}_{testId}@test.com", $"{gameType} Player", sessions);

        // Act
        var response = await _client.GetAsync($"/api/leaderboard/game-type/{gameType}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var leaderboard = await response.Content.ReadFromJsonAsync<LeaderboardResponse>();
        leaderboard.Should().NotBeNull();
        leaderboard!.Entries.Should().HaveCount(1);
        leaderboard.Entries[0].DisplayName.Should().Be($"{gameType} Player");
    }

    [Theory]
    [InlineData("week")]
    [InlineData("month")]
    [InlineData("year")]
    [InlineData("all-time")]
    public async Task GetLeaderboardByPeriod_WithValidPeriods_ShouldWork(string period)
    {
        // Arrange
        var testId = Guid.NewGuid().ToString("N")[..8];
        var baseTime = GenerateUniqueTimestamp();
        
        // Create session data that falls within the specified period
        var sessionStartTime = period switch
        {
            "week" => baseTime.AddDays(-3),      // 3 days ago (within last week)
            "month" => baseTime.AddDays(-15),    // 15 days ago (within last month)
            "year" => baseTime.AddDays(-100),    // 100 days ago (within last year)
            "all-time" => baseTime.AddDays(-400), // 400 days ago (any time)
            _ => baseTime.AddDays(-1)            // Default: 1 day ago
        };
        
        var sessions = new List<GameSessionRequest>
        {
            new GameSessionRequest
            {
                GameType = "countries",
                CorrectAnswers = 8,
                WrongAnswers = 2,
                SessionStartTime = sessionStartTime,
                SessionEndTime = sessionStartTime.AddMinutes(5)
            }
        };

        await CreateUserWithGameSessionsAsync($"{period}_{testId}@test.com", $"{period} Player", sessions);

        // Act
        var response = await _client.GetAsync($"/api/leaderboard/period/{period}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var leaderboard = await response.Content.ReadFromJsonAsync<LeaderboardResponse>();
        leaderboard.Should().NotBeNull();
        leaderboard!.Entries.Should().HaveCount(1);
    }
}