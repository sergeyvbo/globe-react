using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using GeoQuizApi.Data;
using GeoQuizApi.Tests.TestUtilities;

namespace GeoQuizApi.Tests.Integration;

public class TestWebApplicationFactory<TStartup> : WebApplicationFactory<TStartup> where TStartup : class
{
    private static readonly object _databaseNameLock = new object();
    private static int _databaseCounter = 0;
    private readonly string _databaseName;
    private readonly ILoggerFactory _loggerFactory;
    private readonly ILogger<TestWebApplicationFactory<TStartup>> _logger;

    public TestWebApplicationFactory()
    {
        _databaseName = GenerateUniqueDatabaseName();
        
        // Create a logger factory for internal logging
        _loggerFactory = LoggerFactory.Create(builder => 
        {
            builder.AddConsole();
            builder.SetMinimumLevel(LogLevel.Debug);
        });
        _logger = _loggerFactory.CreateLogger<TestWebApplicationFactory<TStartup>>();
    }

    /// <summary>
    /// Generates a thread-safe unique database name using counter and timestamp
    /// </summary>
    private string GenerateUniqueDatabaseName()
    {
        lock (_databaseNameLock)
        {
            var timestamp = DateTime.UtcNow.Ticks;
            var counter = ++_databaseCounter;
            var testClassName = typeof(TStartup).Name;
            var uniqueName = $"TestDb_{testClassName}_{counter}_{timestamp}";
            
            _logger?.LogInformation("Generated unique database name: {DatabaseName}", uniqueName);
            return uniqueName;
        }
    }

    /// <summary>
    /// Creates a new unique database name for test isolation
    /// </summary>
    public string CreateNewDatabaseName()
    {
        return GenerateUniqueDatabaseName();
    }

    /// <summary>
    /// Gets the unique database name for this factory instance
    /// </summary>
    public string DatabaseName => _databaseName;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        
        // Configure the app to skip migrations and disable rate limiting for testing
        builder.ConfigureAppConfiguration((context, config) =>
        {
            config.AddInMemoryCollection(new[]
            {
                new KeyValuePair<string, string?>("SkipMigrations", "true"),
                new KeyValuePair<string, string?>("SecuritySettings:EnableRateLimiting", "false")
            });
        });

        builder.ConfigureServices(services =>
        {
            // Remove DbContext services using RemoveAll
            services.RemoveAll<DbContextOptions<GeoQuizDbContext>>();
            services.RemoveAll<DbContextOptions>();
            services.RemoveAll<GeoQuizDbContext>();
            
            // Remove any generic DbContextOptions
            var genericDbContextOptions = services.Where(s => 
                s.ServiceType.IsGenericType && 
                s.ServiceType.GetGenericTypeDefinition() == typeof(DbContextOptions<>))
                .ToList();
            
            foreach (var service in genericDbContextOptions)
            {
                services.Remove(service);
            }

            // Remove any services that might contain SQLite or EntityFramework references
            var efRelatedServices = services.Where(s =>
                s.ServiceType.FullName?.Contains("Sqlite") == true ||
                s.ServiceType.FullName?.Contains("EntityFramework") == true ||
                s.ImplementationType?.FullName?.Contains("Sqlite") == true ||
                s.ImplementationType?.FullName?.Contains("EntityFramework") == true ||
                s.ImplementationType?.Assembly?.FullName?.Contains("Sqlite") == true ||
                s.ImplementationType?.Assembly?.FullName?.Contains("EntityFramework") == true
            ).ToList();

            foreach (var service in efRelatedServices)
            {
                services.Remove(service);
            }

            // Add SQLite database for testing with pre-generated unique name
            services.AddDbContext<GeoQuizDbContext>(options =>
            {
                options.UseSqlite($"Data Source={_databaseName}.db")
                    .LogTo(message => _logger?.LogDebug("EF Core: {Message}", message), LogLevel.Information);
                options.EnableSensitiveDataLogging();
            });

            // Reduce logging noise during tests
            services.AddLogging(loggingBuilder =>
            {
                loggingBuilder.SetMinimumLevel(LogLevel.Warning);
                loggingBuilder.AddFilter("Microsoft.EntityFrameworkCore", LogLevel.Warning);
            });
        });
    }

    /// <summary>
    /// Clears all data from the test database with comprehensive error handling and logging
    /// </summary>
    public async Task ClearDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<GeoQuizDbContext>();
        
        var cleanupResult = await TestErrorHandler.HandleDatabaseCleanupAsync(
            _logger,
            context,
            $"Factory_{_databaseName}",
            async () => await ClearTablesInOrderAsync(context),
            async () => await RecreateDatabaseAsync()
        );

        if (!cleanupResult.Success)
        {
            var errorMessage = TestErrorHandler.CreateEnhancedAssertionMessage(
                $"Factory_{_databaseName}",
                "Database cleanup should succeed",
                "Clean database state",
                "Failed cleanup operation",
                await TestDiagnostics.GetDatabaseDiagnosticsAsync(context, $"Factory_{_databaseName}"),
                cleanupResult.DetailedError
            );
            
            _logger?.LogError("Factory database cleanup failed: {ErrorMessage}", errorMessage);
            throw new InvalidOperationException($"Failed to clear or recreate test database {_databaseName}: {cleanupResult.DetailedError}", cleanupResult.PrimaryError);
        }
        
        if (cleanupResult.Warnings.Any())
        {
            foreach (var warning in cleanupResult.Warnings)
            {
                _logger?.LogWarning("Factory database cleanup warning for {DatabaseName}: {Warning}", _databaseName, warning);
            }
        }
    }

    /// <summary>
    /// Clears database tables in the correct order to respect foreign key constraints
    /// </summary>
    private async Task ClearTablesInOrderAsync(GeoQuizDbContext context)
    {
        // Clear tables in reverse dependency order to avoid foreign key constraint violations
        
        // 1. Clear GameSessions (depends on Users)
        if (context.GameSessions.Any())
        {
            context.GameSessions.RemoveRange(context.GameSessions);
            _logger?.LogDebug("Cleared GameSessions table");
        }

        // 2. Clear RefreshTokens (depends on Users)
        if (context.RefreshTokens.Any())
        {
            context.RefreshTokens.RemoveRange(context.RefreshTokens);
            _logger?.LogDebug("Cleared RefreshTokens table");
        }

        // 3. Clear Users (main table)
        if (context.Users.Any())
        {
            context.Users.RemoveRange(context.Users);
            _logger?.LogDebug("Cleared Users table");
        }

        await context.SaveChangesAsync();
    }

    /// <summary>
    /// Recreates the database completely when cleanup fails
    /// </summary>
    private async Task RecreateDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<GeoQuizDbContext>();
        
        // Delete and recreate the database
        await context.Database.EnsureDeletedAsync();
        
        // Also delete the physical SQLite file if it exists
        var dbPath = $"{_databaseName}.db";
        if (File.Exists(dbPath))
        {
            try
            {
                File.Delete(dbPath);
                _logger?.LogDebug("Deleted SQLite database file: {DatabasePath}", dbPath);
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Failed to delete SQLite database file: {DatabasePath}", dbPath);
            }
        }
        
        await context.Database.EnsureCreatedAsync();
    }

    /// <summary>
    /// Forces complete database recreation for test isolation
    /// </summary>
    public async Task ForceRecreateDatabaseAsync()
    {
        try
        {
            using var scope = Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<GeoQuizDbContext>();
            
            // Delete the current database
            await context.Database.EnsureDeletedAsync();
            
            // Delete the physical SQLite file
            var dbPath = $"{_databaseName}.db";
            if (File.Exists(dbPath))
            {
                try
                {
                    File.Delete(dbPath);
                    _logger?.LogDebug("Force deleted SQLite database file: {DatabasePath}", dbPath);
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "Failed to force delete SQLite database file: {DatabasePath}", dbPath);
                }
            }
            
            // Recreate the database
            await context.Database.EnsureCreatedAsync();
            _logger?.LogDebug("Force recreated database: {DatabaseName}", _databaseName);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to force recreate database: {DatabaseName}", _databaseName);
            throw;
        }
    }

    /// <summary>
    /// Ensures the database is properly initialized
    /// </summary>
    public async Task EnsureDatabaseCreatedAsync()
    {
        try
        {
            using var scope = Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<GeoQuizDbContext>();
            
            await context.Database.EnsureCreatedAsync();
            _logger?.LogDebug("Database {DatabaseName} ensured created", _databaseName);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to ensure database {DatabaseName} is created", _databaseName);
            throw;
        }
    }

    /// <summary>
    /// Gets comprehensive diagnostic information about the current database state
    /// </summary>
    public async Task<DatabaseDiagnosticInfo> GetDatabaseDiagnosticsAsync()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<GeoQuizDbContext>();
        
        return await TestDiagnostics.GetDatabaseDiagnosticsAsync(context, $"Factory_{_databaseName}");
    }

    /// <summary>
    /// Gets simple diagnostic summary for quick debugging
    /// </summary>
    public async Task<string> GetDatabaseDiagnosticsSummaryAsync()
    {
        var diagnostics = await GetDatabaseDiagnosticsAsync();
        return diagnostics.ToSummaryString();
    }

    /// <summary>
    /// Validates that the database is properly isolated
    /// </summary>
    public async Task<DatabaseIsolationResult> ValidateDatabaseIsolationAsync()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<GeoQuizDbContext>();
        
        return await TestDiagnostics.ValidateDatabaseIsolationAsync(context, $"Factory_{_databaseName}");
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            try
            {
                // Attempt to clean up the database on disposal with enhanced logging
                using var scope = Services.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<GeoQuizDbContext>();
                
                // Log final database state before cleanup
                var finalDiagnostics = TestDiagnostics.GetDatabaseDiagnosticsAsync(context, $"Factory_{_databaseName}").Result;
                if (finalDiagnostics.HasData)
                {
                    _logger?.LogDebug("Database {DatabaseName} has residual data on disposal: {Diagnostics}", 
                        _databaseName, finalDiagnostics.ToSummaryString());
                }
                
                context.Database.EnsureDeleted();
                
                // Also delete the physical SQLite file
                var dbPath = $"{_databaseName}.db";
                if (File.Exists(dbPath))
                {
                    try
                    {
                        File.Delete(dbPath);
                        _logger?.LogDebug("Deleted SQLite database file on disposal: {DatabasePath}", dbPath);
                    }
                    catch (Exception ex)
                    {
                        _logger?.LogWarning(ex, "Failed to delete SQLite database file on disposal: {DatabasePath}", dbPath);
                    }
                }
                
                _logger?.LogDebug("Database {DatabaseName} cleaned up on disposal", _databaseName);
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Failed to clean up database {DatabaseName} on disposal", _databaseName);
                // Don't throw during disposal
            }
            finally
            {
                // Dispose of the logger factory
                _loggerFactory?.Dispose();
            }
        }
        
        base.Dispose(disposing);
    }
}