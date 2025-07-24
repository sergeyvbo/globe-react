using Microsoft.Extensions.Logging;
using GeoQuizApi.Data;
using Microsoft.EntityFrameworkCore;
using FluentAssertions;

namespace GeoQuizApi.Tests.TestUtilities;

/// <summary>
/// Demonstration class showing how to use the enhanced error handling and logging utilities
/// </summary>
public class TestErrorHandlingDemo : BaseUnitTest
{
    private readonly ILogger _logger;

    public TestErrorHandlingDemo()
    {
        var loggerFactory = LoggerFactory.Create(builder => 
        {
            builder.AddConsole();
            builder.SetMinimumLevel(LogLevel.Debug);
        });
        _logger = loggerFactory.CreateLogger<TestErrorHandlingDemo>();
    }

    /// <summary>
    /// Demonstrates comprehensive error handling for database operations
    /// </summary>
    [Fact]
    public async Task DemonstrateEnhancedErrorHandling()
    {
        var testName = nameof(DemonstrateEnhancedErrorHandling);
        
        // 1. Validate test infrastructure
        var infrastructureValidation = await TestValidationUtilities.ValidateTestInfrastructureAsync(_context, _logger, testName);
        infrastructureValidation.IsValid.Should().BeTrue($"Test infrastructure should be valid: {infrastructureValidation}");

        // 2. Execute operation with comprehensive error handling
        var result = await ExecuteWithErrorHandlingAsync("Create test user", async () =>
        {
            var user = TestDataBuilder.User()
                .WithEmail("demo@example.com")
                .WithName("Demo User")
                .Build();
            
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            
            return user;
        });

        result.Success.Should().BeTrue($"Operation should succeed: {result.DetailedError}");
        result.Result.Should().NotBeNull();

        // 3. Validate database state with diagnostics
        var diagnostics = await GetDatabaseDiagnosticsAsync();
        diagnostics.UserCount.Should().Be(1, $"Should have 1 user: {diagnostics}");

        // 4. Demonstrate enhanced assertion with context
        await result.Result!.Email.ShouldBeWithContextAsync("demo@example.com", testName, _context, "User email should match expected value");

        // 5. Validate cleanup
        await ClearDatabaseAsync();
        var cleanupValidation = await TestValidationUtilities.ValidateTestCleanupAsync(_context, _logger, testName);
        cleanupValidation.IsClean.Should().BeTrue($"Database should be clean after cleanup: {cleanupValidation}");
    }

    /// <summary>
    /// Demonstrates error handling for failed operations
    /// </summary>
    [Fact]
    public async Task DemonstrateErrorHandlingForFailures()
    {
        var testName = nameof(DemonstrateErrorHandlingForFailures);
        
        // Create a user first
        var user = TestDataBuilder.User().WithEmail("test@example.com").Build();
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Attempt to create duplicate user (should fail)
        var result = await ExecuteWithErrorHandlingAsync("Create duplicate user", async () =>
        {
            var duplicateUser = TestDataBuilder.User().WithEmail("test@example.com").Build();
            _context.Users.Add(duplicateUser);
            await _context.SaveChangesAsync();
            return duplicateUser;
        });

        // Verify error handling captured the failure
        result.Success.Should().BeFalse("Duplicate user creation should fail");
        result.Exception.Should().NotBeNull("Exception should be captured");
        result.DetailedError.Should().NotBeNullOrEmpty("Detailed error should be provided");
        result.InitialDatabaseState.Should().NotBeNull("Initial database state should be captured");
        result.FinalDatabaseState.Should().NotBeNull("Final database state should be captured");

        _logger.LogInformation("Demonstrated error handling for failed operation: {ErrorDetails}", result.DetailedError);
    }

    /// <summary>
    /// Demonstrates performance measurement capabilities
    /// </summary>
    [Fact]
    public async Task DemonstratePerformanceMeasurement()
    {
        var testName = nameof(DemonstratePerformanceMeasurement);
        
        // Measure a database operation
        var user = await MeasureOperationAsync("Create and save user", async () =>
        {
            var newUser = TestDataBuilder.User().WithEmail("perf@example.com").Build();
            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();
            return newUser;
        });

        user.Should().NotBeNull();
        user.Email.Should().Be("perf@example.com");

        // Measure a query operation
        var retrievedUser = await MeasureOperationAsync("Query user by email", async () =>
        {
            return await _context.Users.FirstOrDefaultAsync(u => u.Email == "perf@example.com");
        });

        retrievedUser.Should().NotBeNull();
        retrievedUser!.Id.Should().Be(user.Id);
    }

    /// <summary>
    /// Demonstrates database isolation validation
    /// </summary>
    [Fact]
    public async Task DemonstrateDatabaseIsolationValidation()
    {
        var testName = nameof(DemonstrateDatabaseIsolationValidation);
        
        // Validate initial isolation
        var initialIsolation = await ValidateDatabaseIsolationAsync();
        initialIsolation.IsIsolated.Should().BeTrue($"Database should be initially isolated: {initialIsolation}");

        // Add some data
        var user = TestDataBuilder.User().Build();
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Validate isolation is now broken
        var isolationWithData = await ValidateDatabaseIsolationAsync();
        isolationWithData.IsIsolated.Should().BeFalse($"Database should not be isolated with data: {isolationWithData}");

        // Clean up and validate isolation is restored
        await ClearDatabaseAsync();
        var finalIsolation = await ValidateDatabaseIsolationAsync();
        finalIsolation.IsIsolated.Should().BeTrue($"Database should be isolated after cleanup: {finalIsolation}");
    }

    /// <summary>
    /// Demonstrates comprehensive assertion failure messages
    /// </summary>
    [Fact]
    public async Task DemonstrateEnhancedAssertionMessages()
    {
        var testName = nameof(DemonstrateEnhancedAssertionMessages);
        
        // Create test data for context
        var user = TestDataBuilder.User().WithName("Test User").Build();
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // This would normally fail, but we'll catch it to demonstrate the enhanced message
        try
        {
            await user.Name.ShouldBeWithContextAsync("Wrong Name", testName, _context, "This is a demonstration of enhanced error messages");
        }
        catch (AssertionException ex)
        {
            // Log the enhanced error message to demonstrate its capabilities
            _logger.LogInformation("Enhanced assertion message: {Message}", ex.Message);
            
            // Verify the enhanced message contains expected elements
            ex.Message.Should().Contain("Test User");
            ex.Message.Should().Contain("Wrong Name");
            ex.Message.Should().Contain("DATABASE STATE");
            ex.Message.Should().Contain("This is a demonstration of enhanced error messages");
        }

        // This assertion should pass
        await user.Name.ShouldBeWithContextAsync("Test User", testName, _context, "Name should match expected value");
    }
}