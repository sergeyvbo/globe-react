using FluentAssertions;
using GeoQuizApi.Data;
using GeoQuizApi.Models.Entities;
using GeoQuizApi.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;

namespace GeoQuizApi.Tests.Unit.Services;

[Trait("Category", "Unit")]
public class GameStatsServiceTests : IDisposable
{
    private readonly GeoQuizDbContext _context;
    private readonly Mock<ILogger<GameStatsService>> _mockLogger;
    private readonly GameStatsService _gameStatsService;
    private readonly User _testUser;

    public GameStatsServiceTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<GeoQuizDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        
        _context = new GeoQuizDbContext(options);
        _mockLogger = new Mock<ILogger<GameStatsService>>();
        
        _gameStatsService = new GameStatsService(_context, _mockLogger.Object);

        // Create test user
        _testUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "test@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123"),
            Name = "Test User",
            CreatedAt = DateTime.UtcNow
        };
        _context.Users.Add(_testUser);
        _context.SaveChanges();
    }

    [Fact]
    public async Task SaveGameSessionAsync_WithValidData_ShouldCreateGameSession()
    {
        // Arrange
        var gameType = "countries";
        var correctAnswers = 8;
        var wrongAnswers = 2;
        var sessionStartTime = DateTime.UtcNow.AddMinutes(-5);
        var sessionEndTime = DateTime.UtcNow;

        // Act
        var result = await _gameStatsService.SaveGameSessionAsync(
            _testUser.Id, gameType, correctAnswers, wrongAnswers, sessionStartTime, sessionEndTime);

        // Assert
        result.Should().NotBeNull();
        result.UserId.Should().Be(_testUser.Id);
        result.GameType.Should().Be(gameType);
        result.CorrectAnswers.Should().Be(correctAnswers);
        result.WrongAnswers.Should().Be(wrongAnswers);
        result.SessionStartTime.Should().Be(sessionStartTime);
        result.SessionEndTime.Should().Be(sessionEndTime);

        // Verify session was saved to database
        var savedSession = await _context.GameSessions.FindAsync(result.Id);
        savedSession.Should().NotBeNull();
        savedSession!.UserId.Should().Be(_testUser.Id);
    }

    [Fact]
    public async Task GetUserStatsAsync_WithNoSessions_ShouldReturnEmptyStats()
    {
        // Act
        var result = await _gameStatsService.GetUserStatsAsync(_testUser.Id);

        // Assert
        result.Should().NotBeNull();
        result.TotalGames.Should().Be(0);
        result.TotalCorrectAnswers.Should().Be(0);
        result.TotalWrongAnswers.Should().Be(0);
        result.BestStreak.Should().Be(0);
        result.AverageAccuracy.Should().Be(0);
        result.LastPlayedAt.Should().BeNull();
        result.GameTypeStats.Should().BeEmpty();
    }

    [Fact]
    public async Task GetUserStatsAsync_WithMultipleSessions_ShouldReturnAggregatedStats()
    {
        // Arrange
        var sessions = new List<GameSession>
        {
            new GameSession
            {
                Id = Guid.NewGuid(),
                UserId = _testUser.Id,
                GameType = "countries",
                CorrectAnswers = 8,
                WrongAnswers = 2,
                SessionStartTime = DateTime.UtcNow.AddDays(-2),
                SessionEndTime = DateTime.UtcNow.AddDays(-2).AddMinutes(5),
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            },
            new GameSession
            {
                Id = Guid.NewGuid(),
                UserId = _testUser.Id,
                GameType = "flags",
                CorrectAnswers = 6,
                WrongAnswers = 4,
                SessionStartTime = DateTime.UtcNow.AddDays(-1),
                SessionEndTime = DateTime.UtcNow.AddDays(-1).AddMinutes(3),
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new GameSession
            {
                Id = Guid.NewGuid(),
                UserId = _testUser.Id,
                GameType = "countries",
                CorrectAnswers = 9,
                WrongAnswers = 1,
                SessionStartTime = DateTime.UtcNow.AddHours(-1),
                SessionEndTime = DateTime.UtcNow.AddHours(-1).AddMinutes(4),
                CreatedAt = DateTime.UtcNow.AddHours(-1)
            }
        };

        _context.GameSessions.AddRange(sessions);
        await _context.SaveChangesAsync();

        // Act
        var result = await _gameStatsService.GetUserStatsAsync(_testUser.Id);

        // Assert
        result.Should().NotBeNull();
        result.TotalGames.Should().Be(3);
        result.TotalCorrectAnswers.Should().Be(23); // 8 + 6 + 9
        result.TotalWrongAnswers.Should().Be(7); // 2 + 4 + 1
        result.AverageAccuracy.Should().BeApproximately(76.67, 0.01); // 23/30 * 100
        result.LastPlayedAt.Should().BeCloseTo(DateTime.UtcNow.AddHours(-1), TimeSpan.FromMinutes(1));

        // Check game type stats
        result.GameTypeStats.Should().HaveCount(2);
        result.GameTypeStats.Should().ContainKey("countries");
        result.GameTypeStats.Should().ContainKey("flags");

        var countriesStats = result.GameTypeStats["countries"];
        countriesStats.Games.Should().Be(2);
        countriesStats.CorrectAnswers.Should().Be(17); // 8 + 9
        countriesStats.WrongAnswers.Should().Be(3); // 2 + 1
        countriesStats.Accuracy.Should().BeApproximately(85.0, 0.01); // 17/20 * 100

        var flagsStats = result.GameTypeStats["flags"];
        flagsStats.Games.Should().Be(1);
        flagsStats.CorrectAnswers.Should().Be(6);
        flagsStats.WrongAnswers.Should().Be(4);
        flagsStats.Accuracy.Should().BeApproximately(60.0, 0.01); // 6/10 * 100
    }

    [Fact]
    public async Task GetUserGameHistoryAsync_ShouldReturnSessionsOrderedByDate()
    {
        // Arrange
        var sessions = new List<GameSession>
        {
            new GameSession
            {
                Id = Guid.NewGuid(),
                UserId = _testUser.Id,
                GameType = "countries",
                CorrectAnswers = 8,
                WrongAnswers = 2,
                SessionStartTime = DateTime.UtcNow.AddDays(-3),
                CreatedAt = DateTime.UtcNow.AddDays(-3)
            },
            new GameSession
            {
                Id = Guid.NewGuid(),
                UserId = _testUser.Id,
                GameType = "flags",
                CorrectAnswers = 6,
                WrongAnswers = 4,
                SessionStartTime = DateTime.UtcNow.AddDays(-1),
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new GameSession
            {
                Id = Guid.NewGuid(),
                UserId = _testUser.Id,
                GameType = "states",
                CorrectAnswers = 7,
                WrongAnswers = 3,
                SessionStartTime = DateTime.UtcNow.AddDays(-2),
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            }
        };

        _context.GameSessions.AddRange(sessions);
        await _context.SaveChangesAsync();

        // Act
        var result = await _gameStatsService.GetUserGameHistoryAsync(_testUser.Id);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(3);
        
        // Should be ordered by CreatedAt descending (most recent first)
        result[0].GameType.Should().Be("flags"); // Most recent
        result[1].GameType.Should().Be("states"); // Middle
        result[2].GameType.Should().Be("countries"); // Oldest
    }

    [Fact]
    public async Task GetUserGameHistoryAsync_WithPagination_ShouldReturnCorrectPage()
    {
        // Arrange
        var sessions = Enumerable.Range(1, 25).Select(i => new GameSession
        {
            Id = Guid.NewGuid(),
            UserId = _testUser.Id,
            GameType = "countries",
            CorrectAnswers = i,
            WrongAnswers = 10 - i,
            SessionStartTime = DateTime.UtcNow.AddDays(-i),
            CreatedAt = DateTime.UtcNow.AddDays(-i)
        }).ToList();

        _context.GameSessions.AddRange(sessions);
        await _context.SaveChangesAsync();

        // Act
        var page1 = await _gameStatsService.GetUserGameHistoryAsync(_testUser.Id, page: 1, pageSize: 10);
        var page2 = await _gameStatsService.GetUserGameHistoryAsync(_testUser.Id, page: 2, pageSize: 10);
        var page3 = await _gameStatsService.GetUserGameHistoryAsync(_testUser.Id, page: 3, pageSize: 10);

        // Assert
        page1.Should().HaveCount(10);
        page2.Should().HaveCount(10);
        page3.Should().HaveCount(5);

        // Verify ordering (most recent first)
        page1[0].CorrectAnswers.Should().Be(1); // Most recent session
        page1[9].CorrectAnswers.Should().Be(10);
        page2[0].CorrectAnswers.Should().Be(11);
    }

    [Fact]
    public async Task GetUserStatsByGameTypeAsync_ShouldReturnStatsForSpecificGameType()
    {
        // Arrange
        var sessions = new List<GameSession>
        {
            new GameSession
            {
                Id = Guid.NewGuid(),
                UserId = _testUser.Id,
                GameType = "countries",
                CorrectAnswers = 8,
                WrongAnswers = 2,
                SessionStartTime = DateTime.UtcNow.AddDays(-2),
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            },
            new GameSession
            {
                Id = Guid.NewGuid(),
                UserId = _testUser.Id,
                GameType = "flags", // Different game type - should be ignored
                CorrectAnswers = 6,
                WrongAnswers = 4,
                SessionStartTime = DateTime.UtcNow.AddDays(-1),
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new GameSession
            {
                Id = Guid.NewGuid(),
                UserId = _testUser.Id,
                GameType = "countries",
                CorrectAnswers = 9,
                WrongAnswers = 1,
                SessionStartTime = DateTime.UtcNow.AddHours(-1),
                CreatedAt = DateTime.UtcNow.AddHours(-1)
            }
        };

        _context.GameSessions.AddRange(sessions);
        await _context.SaveChangesAsync();

        // Act
        var result = await _gameStatsService.GetUserStatsByGameTypeAsync(_testUser.Id, "countries");

        // Assert
        result.Should().NotBeNull();
        result.Games.Should().Be(2);
        result.CorrectAnswers.Should().Be(17); // 8 + 9
        result.WrongAnswers.Should().Be(3); // 2 + 1
        result.Accuracy.Should().BeApproximately(85.0, 0.01); // 17/20 * 100
    }

    [Theory]
    [InlineData(10, 0, 100.0)]
    [InlineData(8, 2, 80.0)]
    [InlineData(0, 10, 0.0)]
    [InlineData(0, 0, 0.0)]
    public void CalculateAccuracy_ShouldReturnCorrectPercentage(int correctAnswers, int wrongAnswers, double expected)
    {
        // Act
        var result = _gameStatsService.CalculateAccuracy(correctAnswers, correctAnswers + wrongAnswers);

        // Assert
        result.Should().BeApproximately(expected, 0.01);
    }

    [Fact]
    public async Task MigrateAnonymousProgressAsync_ShouldCreateGameSessionsFromAnonymousData()
    {
        // Arrange
        var anonymousSessions = new List<AnonymousGameSession>
        {
            new AnonymousGameSession
            {
                GameType = "countries",
                CorrectAnswers = 8,
                WrongAnswers = 2,
                SessionStartTime = DateTime.UtcNow.AddDays(-2),
                SessionEndTime = DateTime.UtcNow.AddDays(-2).AddMinutes(5)
            },
            new AnonymousGameSession
            {
                GameType = "flags",
                CorrectAnswers = 6,
                WrongAnswers = 4,
                SessionStartTime = DateTime.UtcNow.AddDays(-1),
                SessionEndTime = DateTime.UtcNow.AddDays(-1).AddMinutes(3)
            }
        };

        // Act
        var result = await _gameStatsService.MigrateAnonymousProgressAsync(_testUser.Id, anonymousSessions);

        // Assert
        result.Should().BeTrue();

        // Verify sessions were created
        var migratedSessions = await _context.GameSessions
            .Where(s => s.UserId == _testUser.Id)
            .ToListAsync();

        migratedSessions.Should().HaveCount(2);
        migratedSessions.Should().Contain(s => s.GameType == "countries" && s.CorrectAnswers == 8);
        migratedSessions.Should().Contain(s => s.GameType == "flags" && s.CorrectAnswers == 6);
    }

    [Fact]
    public async Task CalculateBestStreakAsync_WithNoSessions_ShouldReturnZero()
    {
        // Act
        var result = await _gameStatsService.CalculateBestStreakAsync(_testUser.Id);

        // Assert
        result.Should().Be(0);
    }

    [Fact]
    public async Task CalculateBestStreakAsync_WithMixedResults_ShouldReturnLongestStreak()
    {
        // Arrange - Create sessions with a pattern: 3 correct, 1 wrong, 5 correct, 2 wrong
        var sessions = new List<GameSession>();
        var baseTime = DateTime.UtcNow.AddDays(-10);

        // First streak: 3 correct answers
        for (int i = 0; i < 3; i++)
        {
            sessions.Add(new GameSession
            {
                Id = Guid.NewGuid(),
                UserId = _testUser.Id,
                GameType = "countries",
                CorrectAnswers = 1,
                WrongAnswers = 0,
                SessionStartTime = baseTime.AddHours(i),
                CreatedAt = baseTime.AddHours(i)
            });
        }

        // Break the streak with a wrong answer
        sessions.Add(new GameSession
        {
            Id = Guid.NewGuid(),
            UserId = _testUser.Id,
            GameType = "countries",
            CorrectAnswers = 0,
            WrongAnswers = 1,
            SessionStartTime = baseTime.AddHours(3),
            CreatedAt = baseTime.AddHours(3)
        });

        // Second streak: 5 correct answers (this should be the best streak)
        for (int i = 0; i < 5; i++)
        {
            sessions.Add(new GameSession
            {
                Id = Guid.NewGuid(),
                UserId = _testUser.Id,
                GameType = "countries",
                CorrectAnswers = 1,
                WrongAnswers = 0,
                SessionStartTime = baseTime.AddHours(4 + i),
                CreatedAt = baseTime.AddHours(4 + i)
            });
        }

        _context.GameSessions.AddRange(sessions);
        await _context.SaveChangesAsync();

        // Act
        var result = await _gameStatsService.CalculateBestStreakAsync(_testUser.Id);

        // Assert
        result.Should().Be(5);
    }

    [Fact]
    public async Task CalculateBestStreakAsync_WithGameTypeFilter_ShouldReturnStreakForSpecificGameType()
    {
        // Arrange
        var sessions = new List<GameSession>
        {
            // Countries game - 3 correct in a row
            new GameSession
            {
                Id = Guid.NewGuid(),
                UserId = _testUser.Id,
                GameType = "countries",
                CorrectAnswers = 1,
                WrongAnswers = 0,
                SessionStartTime = DateTime.UtcNow.AddHours(-5),
                CreatedAt = DateTime.UtcNow.AddHours(-5)
            },
            new GameSession
            {
                Id = Guid.NewGuid(),
                UserId = _testUser.Id,
                GameType = "countries",
                CorrectAnswers = 1,
                WrongAnswers = 0,
                SessionStartTime = DateTime.UtcNow.AddHours(-4),
                CreatedAt = DateTime.UtcNow.AddHours(-4)
            },
            new GameSession
            {
                Id = Guid.NewGuid(),
                UserId = _testUser.Id,
                GameType = "countries",
                CorrectAnswers = 1,
                WrongAnswers = 0,
                SessionStartTime = DateTime.UtcNow.AddHours(-3),
                CreatedAt = DateTime.UtcNow.AddHours(-3)
            },
            // Flags game - 2 correct in a row (should be ignored when filtering by countries)
            new GameSession
            {
                Id = Guid.NewGuid(),
                UserId = _testUser.Id,
                GameType = "flags",
                CorrectAnswers = 1,
                WrongAnswers = 0,
                SessionStartTime = DateTime.UtcNow.AddHours(-2),
                CreatedAt = DateTime.UtcNow.AddHours(-2)
            },
            new GameSession
            {
                Id = Guid.NewGuid(),
                UserId = _testUser.Id,
                GameType = "flags",
                CorrectAnswers = 1,
                WrongAnswers = 0,
                SessionStartTime = DateTime.UtcNow.AddHours(-1),
                CreatedAt = DateTime.UtcNow.AddHours(-1)
            }
        };

        _context.GameSessions.AddRange(sessions);
        await _context.SaveChangesAsync();

        // Act
        var countriesStreak = await _gameStatsService.CalculateBestStreakAsync(_testUser.Id, "countries");
        var flagsStreak = await _gameStatsService.CalculateBestStreakAsync(_testUser.Id, "flags");

        // Assert
        countriesStreak.Should().Be(3);
        flagsStreak.Should().Be(2);
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}