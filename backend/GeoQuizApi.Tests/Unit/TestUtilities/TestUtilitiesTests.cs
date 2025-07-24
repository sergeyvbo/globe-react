using FluentAssertions;
using GeoQuizApi.Tests.TestUtilities;

namespace GeoQuizApi.Tests.Unit.TestUtilities;

[Trait("Category", "Unit")]
public class TestUtilitiesTests : BaseUnitTest
{
    [Fact]
    public void GenerateUniqueEmail_ShouldReturnUniqueEmails()
    {
        // Act
        var email1 = TestDataBuilder.GenerateUniqueEmail();
        var email2 = TestDataBuilder.GenerateUniqueEmail();
        var email3 = TestDataBuilder.GenerateUniqueEmail("custom");

        // Assert
        email1.Should().NotBe(email2);
        email2.Should().NotBe(email3);
        email1.Should().EndWith("@example.com");
        email2.Should().EndWith("@example.com");
        email3.Should().StartWith("custom_");
        email3.Should().EndWith("@example.com");
    }

    [Fact]
    public void GenerateUniqueTimestamp_ShouldReturnUniqueTimestamps()
    {
        // Act
        var timestamp1 = TestDataBuilder.GenerateUniqueTimestamp();
        var timestamp2 = TestDataBuilder.GenerateUniqueTimestamp();
        var timestamp3 = TestDataBuilder.GenerateUniqueTimestamp();

        // Assert
        timestamp1.Should().NotBe(timestamp2);
        timestamp2.Should().NotBe(timestamp3);
        timestamp1.Should().BeBefore(timestamp2);
        timestamp2.Should().BeBefore(timestamp3);
    }

    [Fact]
    public void TimestampManager_GetUniqueTimestamp_ShouldReturnUniqueTimestamps()
    {
        // Arrange
        var baseTime = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        // Act
        var timestamp1 = TimestampManager.GetUniqueTimestamp(baseTime);
        var timestamp2 = TimestampManager.GetUniqueTimestamp(baseTime);
        var timestamp3 = TimestampManager.GetUniqueTimestamp(baseTime);

        // Assert
        timestamp1.Should().NotBe(timestamp2);
        timestamp2.Should().NotBe(timestamp3);
        timestamp1.Should().BeBefore(timestamp2);
        timestamp2.Should().BeBefore(timestamp3);
    }

    [Fact]
    public void TimestampManager_GenerateSequentialTimestamps_ShouldReturnSequentialTimestamps()
    {
        // Arrange
        var baseTime = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var count = 5;
        var incrementMinutes = 10;

        // Act
        var timestamps = TimestampManager.GenerateSequentialTimestamps(baseTime, count, incrementMinutes);

        // Assert
        timestamps.Should().HaveCount(count);
        for (int i = 1; i < timestamps.Length; i++)
        {
            timestamps[i].Should().Be(timestamps[i - 1].AddMinutes(incrementMinutes));
        }
    }

    [Fact]
    public async Task BaseUnitTest_SeedTestDataAsync_ShouldCreateTestData()
    {
        // Act
        var users = await SeedTestDataAsync(userCount: 2, sessionsPerUser: 3);

        // Assert
        users.Should().HaveCount(2);
        
        var dbUsers = _context.Users.ToList();
        var dbSessions = _context.GameSessions.ToList();
        
        dbUsers.Should().HaveCount(2);
        dbSessions.Should().HaveCount(6); // 2 users * 3 sessions each
        
        // Verify unique emails
        var emails = dbUsers.Select(u => u.Email).ToList();
        emails.Should().OnlyHaveUniqueItems();
        
        // Verify unique timestamps
        var timestamps = dbUsers.Select(u => u.CreatedAt).ToList();
        timestamps.Should().OnlyHaveUniqueItems();
    }

    [Fact]
    public async Task BaseUnitTest_ClearDatabaseAsync_ShouldClearAllData()
    {
        // Arrange
        await SeedTestDataAsync(userCount: 2, sessionsPerUser: 2);
        
        // Verify data exists
        _context.Users.Should().HaveCountGreaterThan(0);
        _context.GameSessions.Should().HaveCountGreaterThan(0);

        // Act
        await ClearDatabaseAsync();

        // Assert
        _context.Users.Should().BeEmpty();
        _context.GameSessions.Should().BeEmpty();
        _context.RefreshTokens.Should().BeEmpty();
    }

    [Fact]
    public void BaseUnitTest_AssertDatabaseIsEmpty_ShouldPassWhenEmpty()
    {
        // Act & Assert - should not throw
        AssertDatabaseIsEmpty();
    }

    [Fact]
    public async Task BaseUnitTest_AssertDatabaseIsEmpty_ShouldThrowWhenNotEmpty()
    {
        // Arrange
        await SeedTestDataAsync(userCount: 1);

        // Act & Assert
        var action = () => AssertDatabaseIsEmpty();
        action.Should().Throw<InvalidOperationException>()
            .WithMessage("*Database is not empty*");
    }

    [Fact]
    public void TestDataBuilder_UserBuilder_ShouldCreateUserWithUniqueData()
    {
        // Act
        var user1 = TestDataBuilder.User().Build();
        var user2 = TestDataBuilder.User().Build();

        // Assert
        user1.Email.Should().NotBe(user2.Email);
        user1.CreatedAt.Should().NotBe(user2.CreatedAt);
        user1.Id.Should().NotBe(user2.Id);
    }

    [Fact]
    public void TestDataBuilder_GameSessionBuilder_ShouldCreateSessionWithUniqueData()
    {
        // Act
        var session1 = TestDataBuilder.GameSession().Build();
        var session2 = TestDataBuilder.GameSession().Build();

        // Assert
        session1.CreatedAt.Should().NotBe(session2.CreatedAt);
        session1.SessionStartTime.Should().NotBe(session2.SessionStartTime);
        session1.SessionEndTime.Should().NotBe(session2.SessionEndTime);
        session1.Id.Should().NotBe(session2.Id);
    }

    [Fact]
    public void TestDataBuilder_RefreshTokenBuilder_ShouldCreateTokenWithUniqueData()
    {
        // Act
        var token1 = TestDataBuilder.RefreshToken().Build();
        var token2 = TestDataBuilder.RefreshToken().Build();

        // Assert
        token1.CreatedAt.Should().NotBe(token2.CreatedAt);
        token1.ExpiresAt.Should().NotBe(token2.ExpiresAt);
        token1.Token.Should().NotBe(token2.Token);
        token1.Id.Should().NotBe(token2.Id);
    }
}