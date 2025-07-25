using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using GeoQuizApi.Data;
using GeoQuizApi.Tests.TestUtilities;

namespace GeoQuizApi.Tests.Integration;

/// <summary>
/// Base class for integration tests with complete isolation - each test gets its own factory and database
/// </summary>
public abstract class BaseIsolatedIntegrationTest : IAsyncLifetime
{
    protected TestWebApplicationFactory<Program> _factory = null!;
    protected HttpClient _client = null!;
    private ILogger<BaseIsolatedIntegrationTest> _logger = null!;

    /// <summary>
    /// Called before each test method. Creates a new factory and database for complete isolation.
    /// </summary>
    public virtual async Task InitializeAsync()
    {
        // Create a new factory for each test
        _factory = new TestWebApplicationFactory<Program>();
        _client = _factory.CreateClient();
        
        // Create logger for this test instance
        try
        {
            using var scope = _factory.Services.CreateScope();
            var loggerFactory = scope.ServiceProvider.GetRequiredService<ILoggerFactory>();
            _logger = loggerFactory.CreateLogger<BaseIsolatedIntegrationTest>();
        }
        catch
        {
            // Fallback to console logging if service provider is not available
            var loggerFactory = LoggerFactory.Create(builder => builder.AddConsole());
            _logger = loggerFactory.CreateLogger<BaseIsolatedIntegrationTest>();
        }
        
        _logger.LogDebug("Initializing isolated test: {TestClass}", GetType().Name);
        
        // Reset timestamp managers first for deterministic test behavior
        TimestampManager.Reset();
        GeoQuizApi.Services.TimestampManager.Reset();
        
        // Ensure database is created and clean
        await _factory.EnsureDatabaseCreatedAsync();
        
        _logger.LogDebug("Isolated test initialization completed: {TestClass}", GetType().Name);
    }

    /// <summary>
    /// Called after each test method. Disposes the factory and cleans up resources.
    /// </summary>
    public virtual async Task DisposeAsync()
    {
        _logger?.LogDebug("Disposing isolated test: {TestClass}", GetType().Name);
        
        try
        {
            _client?.Dispose();
            _factory?.Dispose();
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Error during isolated test cleanup: {TestClass}", GetType().Name);
        }
        
        await Task.CompletedTask;
    }

    /// <summary>
    /// Generates a unique email for testing
    /// </summary>
    protected string GenerateUniqueEmail(string prefix = "test")
    {
        return TestDataBuilder.GenerateUniqueEmail(prefix);
    }

    /// <summary>
    /// Generates a unique timestamp for testing
    /// </summary>
    protected DateTime GenerateUniqueTimestamp()
    {
        return TestDataBuilder.GenerateUniqueTimestamp();
    }

    /// <summary>
    /// Clears authorization headers from the HTTP client
    /// </summary>
    protected void ClearAuthorizationHeaders()
    {
        _client.DefaultRequestHeaders.Authorization = null;
    }

    /// <summary>
    /// Sets authorization header for the HTTP client
    /// </summary>
    protected void SetAuthorizationHeader(string token)
    {
        _client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
    }
}