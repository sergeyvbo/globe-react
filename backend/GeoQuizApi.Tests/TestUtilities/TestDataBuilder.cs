using GeoQuizApi.Models.Entities;

namespace GeoQuizApi.Tests.TestUtilities;

public static class TestDataBuilder
{
    private static readonly object _emailLock = new object();
    private static int _emailCounter = 0;

    public static UserBuilder User() => new UserBuilder();
    public static GameSessionBuilder GameSession() => new GameSessionBuilder();
    public static RefreshTokenBuilder RefreshToken() => new RefreshTokenBuilder();

    /// <summary>
    /// Generates a unique email address for testing purposes
    /// </summary>
    /// <param name="prefix">Optional prefix for the email (default: "test")</param>
    /// <returns>A unique email address</returns>
    public static string GenerateUniqueEmail(string prefix = "test")
    {
        lock (_emailLock)
        {
            return $"{prefix}_{++_emailCounter}_{Guid.NewGuid():N}@example.com";
        }
    }

    /// <summary>
    /// Generates a unique timestamp based on a base time with incremental ticks
    /// </summary>
    /// <param name="baseTime">Base time to start from (default: current UTC time)</param>
    /// <returns>A unique timestamp</returns>
    public static DateTime GenerateUniqueTimestamp(DateTime? baseTime = null)
    {
        return TimestampManager.GetUniqueTimestamp(baseTime);
    }
}

public class UserBuilder
{
    private readonly User _user;

    public UserBuilder()
    {
        _user = new User
        {
            Id = Guid.NewGuid(),
            Email = TestDataBuilder.GenerateUniqueEmail(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("TestPassword123"),
            Name = "Test User",
            Provider = "email",
            CreatedAt = TestDataBuilder.GenerateUniqueTimestamp()
        };
    }

    public UserBuilder WithId(Guid id)
    {
        _user.Id = id;
        return this;
    }

    public UserBuilder WithEmail(string email)
    {
        _user.Email = email;
        return this;
    }

    public UserBuilder WithName(string name)
    {
        _user.Name = name;
        return this;
    }

    public UserBuilder WithPassword(string password)
    {
        _user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
        return this;
    }

    public UserBuilder WithCreatedAt(DateTime createdAt)
    {
        _user.CreatedAt = createdAt;
        return this;
    }

    public UserBuilder WithLastLoginAt(DateTime lastLoginAt)
    {
        _user.LastLoginAt = lastLoginAt;
        return this;
    }

    public User Build() => _user;
}

public class GameSessionBuilder
{
    private readonly GameSession _session;

    public GameSessionBuilder()
    {
        var baseTime = TestDataBuilder.GenerateUniqueTimestamp();
        _session = new GameSession
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            GameType = "countries",
            CorrectAnswers = 5,
            WrongAnswers = 5,
            SessionStartTime = baseTime.AddMinutes(-10),
            SessionEndTime = baseTime.AddMinutes(-5),
            CreatedAt = baseTime.AddMinutes(-5)
        };
    }

    public GameSessionBuilder WithId(Guid id)
    {
        _session.Id = id;
        return this;
    }

    public GameSessionBuilder WithUserId(Guid userId)
    {
        _session.UserId = userId;
        return this;
    }

    public GameSessionBuilder WithGameType(string gameType)
    {
        _session.GameType = gameType;
        return this;
    }

    public GameSessionBuilder WithCorrectAnswers(int correctAnswers)
    {
        _session.CorrectAnswers = correctAnswers;
        return this;
    }

    public GameSessionBuilder WithWrongAnswers(int wrongAnswers)
    {
        _session.WrongAnswers = wrongAnswers;
        return this;
    }

    public GameSessionBuilder WithSessionTimes(DateTime startTime, DateTime? endTime = null)
    {
        _session.SessionStartTime = startTime;
        _session.SessionEndTime = endTime;
        return this;
    }

    public GameSessionBuilder WithCreatedAt(DateTime createdAt)
    {
        _session.CreatedAt = createdAt;
        return this;
    }

    public GameSessionBuilder WithDurationMs(int durationMs)
    {
        _session.SessionDurationMs = durationMs;
        return this;
    }

    public GameSession Build() => _session;
}

public class RefreshTokenBuilder
{
    private readonly RefreshToken _token;

    public RefreshTokenBuilder()
    {
        var createdAt = TestDataBuilder.GenerateUniqueTimestamp();
        _token = new RefreshToken
        {
            Id = Guid.NewGuid(),
            Token = Guid.NewGuid().ToString(),
            UserId = Guid.NewGuid(),
            ExpiresAt = createdAt.AddDays(7),
            CreatedAt = createdAt,
            IsRevoked = false
        };
    }

    public RefreshTokenBuilder WithId(Guid id)
    {
        _token.Id = id;
        return this;
    }

    public RefreshTokenBuilder WithToken(string token)
    {
        _token.Token = token;
        return this;
    }

    public RefreshTokenBuilder WithUserId(Guid userId)
    {
        _token.UserId = userId;
        return this;
    }

    public RefreshTokenBuilder WithExpiresAt(DateTime expiresAt)
    {
        _token.ExpiresAt = expiresAt;
        return this;
    }

    public RefreshTokenBuilder WithCreatedAt(DateTime createdAt)
    {
        _token.CreatedAt = createdAt;
        return this;
    }

    public RefreshTokenBuilder WithRevoked(bool isRevoked = true)
    {
        _token.IsRevoked = isRevoked;
        return this;
    }

    public RefreshToken Build() => _token;
}