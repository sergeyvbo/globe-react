using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using GeoQuizApi.Data;
using GeoQuizApi.Tests.TestUtilities;

namespace GeoQuizApi.Tests.Integration;

/// <summary>
/// Enhanced base class for integration tests with robust cleanup and initialization
/// Implements IAsyncLifetime for proper test lifecycle management
/// </summary>
public abstract class BaseIntegrationTest : IClassFixture<TestWebApplicationFactory<Program>>, IAsyncLifetime
{
    protected readonly TestWebApplicationFactory<Program> _factory;
    protected readonly HttpClient _client;
    private readonly SemaphoreSlim _cleanupSemaphore = new SemaphoreSlim(1, 1);
    private readonly ILogger<BaseIntegrationTest> _logger;

    protected BaseIntegrationTest(TestWebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
        
        // Create logger for this test instance
        try
        {
            using var scope = _factory.Services.CreateScope();
            var loggerFactory = scope.ServiceProvider.GetRequiredService<ILoggerFactory>();
            _logger = loggerFactory.CreateLogger<BaseIntegrationTest>();
        }
        catch
        {
            // Fallback to console logging if service provider is not available
            var loggerFactory = LoggerFactory.Create(builder => builder.AddConsole());
            _logger = loggerFactory.CreateLogger<BaseIntegrationTest>();
        }
    }

    /// <summary>
    /// Called before each test method. Ensures clean database state and clears authorization headers.
    /// </summary>
    public virtual async Task InitializeAsync()
    {
        _logger.LogDebug("Initializing test: {TestClass}", GetType().Name);
        
        // Reset timestamp manager first for deterministic test behavior
        TimestampManager.Reset();
        
        // Clear database and reset authorization headers
        await ClearDatabaseAsync();
        ClearAuthorizationHeaders();
        
        _logger.LogDebug("Test initialization completed: {TestClass}", GetType().Name);
    }

    /// <summary>
    /// Called after each test method. Performs cleanup operations.
    /// </summary>
    public virtual Task DisposeAsync()
    {
        _logger.LogDebug("Disposing test: {TestClass}", GetType().Name);
        
        // Clear authorization headers to prevent test interference
        ClearAuthorizationHeaders();
        
        return Task.CompletedTask;
    }

    /// <summary>
    /// Enhanced database cleanup with comprehensive error handling, logging, and fallback strategies
    /// </summary>
    protected async Task ClearDatabaseAsync()
    {
        await _cleanupSemaphore.WaitAsync();
        try
        {
            using var scope = _factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<GeoQuizDbContext>();
            
            var testName = GetType().Name;
            
            // Use enhanced error handler for comprehensive cleanup
            var cleanupResult = await TestErrorHandler.HandleDatabaseCleanupAsync(
                _logger,
                context,
                testName,
                async () => await ClearTablesInOrderAsync(context),
                async () => await RecreateDatabaseAsync()
            );

            if (!cleanupResult.Success)
            {
                // Log detailed failure information
                _logger.LogError("Complete database cleanup failure for test {TestName}: {CleanupResult}", 
                    testName, cleanupResult.ToString());
                
                // Create informative error message for debugging
                var errorMessage = TestErrorHandler.CreateEnhancedAssertionMessage(
                    testName,
                    "Database cleanup should succeed",
                    "Clean database state",
                    "Failed cleanup operation",
                    await TestDiagnostics.GetDatabaseDiagnosticsAsync(context, testName),
                    cleanupResult.DetailedError
                );
                
                // Don't fail the test setup, but provide comprehensive warning
                Console.WriteLine($"WARNING: {errorMessage}");
            }
            else if (cleanupResult.Warnings.Any())
            {
                // Log warnings about cleanup issues
                foreach (var warning in cleanupResult.Warnings)
                {
                    _logger.LogWarning("Database cleanup warning for test {TestName}: {Warning}", testName, warning);
                }
            }
        }
        finally
        {
            _cleanupSemaphore.Release();
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
            var sessionCount = context.GameSessions.Count();
            context.GameSessions.RemoveRange(context.GameSessions);
            _logger.LogDebug("Cleared {Count} records from GameSessions table", sessionCount);
        }

        // 2. Clear RefreshTokens (depends on Users)
        if (context.RefreshTokens.Any())
        {
            var tokenCount = context.RefreshTokens.Count();
            context.RefreshTokens.RemoveRange(context.RefreshTokens);
            _logger.LogDebug("Cleared {Count} records from RefreshTokens table", tokenCount);
        }

        // 3. Clear Users (main table)
        if (context.Users.Any())
        {
            var userCount = context.Users.Count();
            context.Users.RemoveRange(context.Users);
            _logger.LogDebug("Cleared {Count} records from Users table", userCount);
        }

        // Save changes to commit the deletions
        await context.SaveChangesAsync();
        _logger.LogDebug("Database changes saved successfully");
    }

    /// <summary>
    /// Recreates the database completely when cleanup fails
    /// </summary>
    private async Task RecreateDatabaseAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<GeoQuizDbContext>();
        
        _logger.LogDebug("Recreating database for test: {TestClass}", GetType().Name);
        
        // Delete and recreate the database
        await context.Database.EnsureDeletedAsync();
        await context.Database.EnsureCreatedAsync();
        
        _logger.LogDebug("Database recreation completed for test: {TestClass}", GetType().Name);
    }

    /// <summary>
    /// Clears authorization headers to prevent test interference
    /// </summary>
    private void ClearAuthorizationHeaders()
    {
        if (_client.DefaultRequestHeaders.Authorization != null)
        {
            _logger.LogDebug("Clearing authorization headers for test: {TestClass}", GetType().Name);
            _client.DefaultRequestHeaders.Authorization = null;
        }
    }

    /// <summary>
    /// Helper method to generate unique email addresses for tests
    /// </summary>
    protected string GenerateUniqueEmail(string prefix = "test")
    {
        return TestDataBuilder.GenerateUniqueEmail(prefix);
    }

    /// <summary>
    /// Helper method to generate unique timestamps for tests
    /// </summary>
    protected DateTime GenerateUniqueTimestamp(DateTime? baseTime = null)
    {
        return TestDataBuilder.GenerateUniqueTimestamp(baseTime);
    }

    /// <summary>
    /// Verifies that the database is empty (useful for debugging test isolation issues)
    /// </summary>
    protected async Task<bool> IsDatabaseEmptyAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<GeoQuizDbContext>();
        
        var userCount = await context.Users.CountAsync();
        var sessionCount = await context.GameSessions.CountAsync();
        var tokenCount = await context.RefreshTokens.CountAsync();
        
        var isEmpty = userCount == 0 && sessionCount == 0 && tokenCount == 0;
        
        if (!isEmpty)
        {
            _logger.LogWarning("Database is not empty for test {TestClass}. Users: {UserCount}, Sessions: {SessionCount}, Tokens: {TokenCount}", 
                GetType().Name, userCount, sessionCount, tokenCount);
        }
        
        return isEmpty;
    }

    /// <summary>
    /// Gets comprehensive diagnostic information about the current database state
    /// </summary>
    protected async Task<DatabaseDiagnosticInfo> GetDatabaseDiagnosticsAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<GeoQuizDbContext>();
        
        return await TestDiagnostics.GetDatabaseDiagnosticsAsync(context, GetType().Name);
    }

    /// <summary>
    /// Gets simple diagnostic summary for quick debugging
    /// </summary>
    protected async Task<string> GetDatabaseDiagnosticsSummaryAsync()
    {
        var diagnostics = await GetDatabaseDiagnosticsAsync();
        return diagnostics.ToSummaryString();
    }

    /// <summary>
    /// Validates that the database is properly isolated for this test
    /// </summary>
    protected async Task<DatabaseIsolationResult> ValidateDatabaseIsolationAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<GeoQuizDbContext>();
        
        return await TestDiagnostics.ValidateDatabaseIsolationAsync(context, GetType().Name);
    }

    /// <summary>
    /// Executes an operation with comprehensive error handling and logging
    /// </summary>
    protected async Task<TestOperationResult<T>> ExecuteWithErrorHandlingAsync<T>(string operationName, Func<Task<T>> operation)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<GeoQuizDbContext>();
        
        return await TestErrorHandler.ExecuteWithErrorHandlingAsync(_logger, GetType().Name, operationName, operation, context);
    }

    /// <summary>
    /// Executes a void operation with comprehensive error handling and logging
    /// </summary>
    protected async Task<TestOperationResult> ExecuteWithErrorHandlingAsync(string operationName, Func<Task> operation)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<GeoQuizDbContext>();
        
        return await TestErrorHandler.ExecuteWithErrorHandlingAsync(_logger, GetType().Name, operationName, operation, context);
    }

    /// <summary>
    /// Creates enhanced assertion failure messages with database context
    /// </summary>
    protected async Task<string> CreateEnhancedAssertionMessageAsync(string assertion, object? expected, object? actual, string? additionalContext = null)
    {
        var databaseState = await GetDatabaseDiagnosticsAsync();
        return TestErrorHandler.CreateEnhancedAssertionMessage(GetType().Name, assertion, expected, actual, databaseState, additionalContext);
    }

    /// <summary>
    /// Measures and logs the performance of test operations
    /// </summary>
    protected async Task<T> MeasureOperationAsync<T>(string operationName, Func<Task<T>> operation)
    {
        return await TestDiagnostics.MeasureOperationAsync(_logger, GetType().Name, operationName, operation);
    }

    /// <summary>
    /// Measures and logs the performance of void test operations
    /// </summary>
    protected async Task MeasureOperationAsync(string operationName, Func<Task> operation)
    {
        await TestDiagnostics.MeasureOperationAsync(_logger, GetType().Name, operationName, operation);
    }
}