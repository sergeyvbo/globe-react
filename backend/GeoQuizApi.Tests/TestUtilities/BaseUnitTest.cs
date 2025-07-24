using GeoQuizApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;

namespace GeoQuizApi.Tests.TestUtilities;

/// <summary>
/// Base class for unit tests providing improved isolation and common utilities
/// </summary>
public abstract class BaseUnitTest : IDisposable
{
    protected readonly GeoQuizDbContext _context;
    private static readonly object _dbLock = new object();
    private static int _dbCounter = 0;
    private readonly string _databaseName;

    protected BaseUnitTest()
    {
        _databaseName = GenerateUniqueDatabaseName();
        var options = new DbContextOptionsBuilder<GeoQuizDbContext>()
            .UseInMemoryDatabase(databaseName: _databaseName)
            .EnableSensitiveDataLogging()
            .Options;
        
        _context = new GeoQuizDbContext(options);
        
        // Ensure database is created
        _context.Database.EnsureCreated();
        
        // Reset timestamp manager for each test class
        TimestampManager.Reset();
    }

    /// <summary>
    /// Generates a unique database name for this test instance
    /// </summary>
    /// <returns>Unique database name</returns>
    private string GenerateUniqueDatabaseName()
    {
        lock (_dbLock)
        {
            return $"UnitTestDb_{GetType().Name}_{++_dbCounter}_{DateTime.UtcNow.Ticks}";
        }
    }

    /// <summary>
    /// Creates a mock logger for the specified type
    /// </summary>
    /// <typeparam name="T">Type to create logger for</typeparam>
    /// <returns>Mock logger</returns>
    protected static Mock<ILogger<T>> CreateMockLogger<T>()
    {
        return new Mock<ILogger<T>>();
    }

    /// <summary>
    /// Clears all data from the test database while maintaining schema
    /// </summary>
    protected async Task ClearDatabaseAsync()
    {
        try
        {
            // Clear all tables in the correct order (respecting foreign key constraints)
            _context.GameSessions.RemoveRange(_context.GameSessions);
            _context.RefreshTokens.RemoveRange(_context.RefreshTokens);
            _context.Users.RemoveRange(_context.Users);
            
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // If clearing fails, recreate the database
            await _context.Database.EnsureDeletedAsync();
            await _context.Database.EnsureCreatedAsync();
            
            // Log the issue but don't fail the test
            Console.WriteLine($"Warning: Database clear failed, recreated database. Error: {ex.Message}");
        }
    }

    /// <summary>
    /// Seeds the database with test data using the TestDataBuilder
    /// </summary>
    /// <param name="userCount">Number of users to create</param>
    /// <param name="sessionsPerUser">Number of game sessions per user</param>
    /// <returns>List of created users</returns>
    protected async Task<List<GeoQuizApi.Models.Entities.User>> SeedTestDataAsync(int userCount = 1, int sessionsPerUser = 0)
    {
        var users = new List<GeoQuizApi.Models.Entities.User>();
        
        for (int i = 0; i < userCount; i++)
        {
            var user = TestDataBuilder.User()
                .WithEmail(TestDataBuilder.GenerateUniqueEmail($"testuser{i}"))
                .WithName($"Test User {i}")
                .Build();
            
            _context.Users.Add(user);
            users.Add(user);
            
            // Create game sessions for this user
            for (int j = 0; j < sessionsPerUser; j++)
            {
                var session = TestDataBuilder.GameSession()
                    .WithUserId(user.Id)
                    .WithGameType(j % 2 == 0 ? "countries" : "flags")
                    .WithCorrectAnswers(5 + j)
                    .WithWrongAnswers(3 + j)
                    .Build();
                
                _context.GameSessions.Add(session);
            }
        }
        
        await _context.SaveChangesAsync();
        return users;
    }

    /// <summary>
    /// Asserts that the database is empty
    /// </summary>
    protected void AssertDatabaseIsEmpty()
    {
        var userCount = _context.Users.Count();
        var sessionCount = _context.GameSessions.Count();
        var tokenCount = _context.RefreshTokens.Count();
        
        if (userCount > 0 || sessionCount > 0 || tokenCount > 0)
        {
            throw new InvalidOperationException(
                $"Database is not empty. Users: {userCount}, Sessions: {sessionCount}, Tokens: {tokenCount}");
        }
    }

    /// <summary>
    /// Gets the current database name for debugging purposes
    /// </summary>
    protected string GetDatabaseName() => _databaseName;

    public virtual void Dispose()
    {
        try
        {
            _context?.Database.EnsureDeleted();
            _context?.Dispose();
        }
        catch (Exception ex)
        {
            // Log but don't throw during disposal
            Console.WriteLine($"Warning: Error during test cleanup: {ex.Message}");
        }
    }
}