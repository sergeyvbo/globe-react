using FluentAssertions;
using Microsoft.Extensions.Logging;
using GeoQuizApi.Data;

namespace GeoQuizApi.Tests.TestUtilities;

/// <summary>
/// Extension methods for enhanced test assertions with comprehensive error messages
/// </summary>
public static class TestAssertionExtensions
{
    /// <summary>
    /// Asserts that a value should be equal with enhanced error messaging
    /// </summary>
    public static async Task ShouldBeWithContextAsync<T>(
        this T actual, 
        T expected, 
        string testName,
        GeoQuizDbContext? context = null,
        string? additionalContext = null)
    {
        if (!EqualityComparer<T>.Default.Equals(actual, expected))
        {
            DatabaseDiagnosticInfo? databaseState = null;
            if (context != null)
            {
                databaseState = await TestDiagnostics.GetDatabaseDiagnosticsAsync(context, testName);
            }

            var errorMessage = TestErrorHandler.CreateEnhancedAssertionMessage(
                testName,
                $"Value should be {expected}",
                expected,
                actual,
                databaseState,
                additionalContext
            );

            throw new AssertionException(errorMessage);
        }
    }

    /// <summary>
    /// Asserts that a value should not be null with enhanced error messaging
    /// </summary>
    public static async Task ShouldNotBeNullWithContextAsync<T>(
        this T? actual,
        string testName,
        GeoQuizDbContext? context = null,
        string? additionalContext = null) where T : class
    {
        if (actual == null)
        {
            DatabaseDiagnosticInfo? databaseState = null;
            if (context != null)
            {
                databaseState = await TestDiagnostics.GetDatabaseDiagnosticsAsync(context, testName);
            }

            var errorMessage = TestErrorHandler.CreateEnhancedAssertionMessage(
                testName,
                "Value should not be null",
                "non-null value",
                null,
                databaseState,
                additionalContext
            );

            throw new AssertionException(errorMessage);
        }
    }

    /// <summary>
    /// Asserts that a collection should have a specific count with enhanced error messaging
    /// </summary>
    public static async Task ShouldHaveCountWithContextAsync<T>(
        this IEnumerable<T> actual,
        int expectedCount,
        string testName,
        GeoQuizDbContext? context = null,
        string? additionalContext = null)
    {
        var actualCount = actual.Count();
        if (actualCount != expectedCount)
        {
            DatabaseDiagnosticInfo? databaseState = null;
            if (context != null)
            {
                databaseState = await TestDiagnostics.GetDatabaseDiagnosticsAsync(context, testName);
            }

            var errorMessage = TestErrorHandler.CreateEnhancedAssertionMessage(
                testName,
                $"Collection should have {expectedCount} items",
                expectedCount,
                actualCount,
                databaseState,
                additionalContext
            );

            throw new AssertionException(errorMessage);
        }
    }

    /// <summary>
    /// Asserts that a collection should be empty with enhanced error messaging
    /// </summary>
    public static async Task ShouldBeEmptyWithContextAsync<T>(
        this IEnumerable<T> actual,
        string testName,
        GeoQuizDbContext? context = null,
        string? additionalContext = null)
    {
        var actualCount = actual.Count();
        if (actualCount > 0)
        {
            DatabaseDiagnosticInfo? databaseState = null;
            if (context != null)
            {
                databaseState = await TestDiagnostics.GetDatabaseDiagnosticsAsync(context, testName);
            }

            var items = actual.Take(5).Select(x => x?.ToString() ?? "null").ToList();
            var itemsDisplay = items.Count == actualCount 
                ? string.Join(", ", items)
                : string.Join(", ", items) + $" ... and {actualCount - items.Count} more";

            var errorMessage = TestErrorHandler.CreateEnhancedAssertionMessage(
                testName,
                "Collection should be empty",
                "empty collection",
                $"collection with {actualCount} items: [{itemsDisplay}]",
                databaseState,
                additionalContext
            );

            throw new AssertionException(errorMessage);
        }
    }

    /// <summary>
    /// Asserts that a boolean condition should be true with enhanced error messaging
    /// </summary>
    public static async Task ShouldBeTrueWithContextAsync(
        this bool actual,
        string testName,
        string conditionDescription,
        GeoQuizDbContext? context = null,
        string? additionalContext = null)
    {
        if (!actual)
        {
            DatabaseDiagnosticInfo? databaseState = null;
            if (context != null)
            {
                databaseState = await TestDiagnostics.GetDatabaseDiagnosticsAsync(context, testName);
            }

            var errorMessage = TestErrorHandler.CreateEnhancedAssertionMessage(
                testName,
                conditionDescription,
                true,
                false,
                databaseState,
                additionalContext
            );

            throw new AssertionException(errorMessage);
        }
    }

    /// <summary>
    /// Asserts that a boolean condition should be false with enhanced error messaging
    /// </summary>
    public static async Task ShouldBeFalseWithContextAsync(
        this bool actual,
        string testName,
        string conditionDescription,
        GeoQuizDbContext? context = null,
        string? additionalContext = null)
    {
        if (actual)
        {
            DatabaseDiagnosticInfo? databaseState = null;
            if (context != null)
            {
                databaseState = await TestDiagnostics.GetDatabaseDiagnosticsAsync(context, testName);
            }

            var errorMessage = TestErrorHandler.CreateEnhancedAssertionMessage(
                testName,
                conditionDescription,
                false,
                true,
                databaseState,
                additionalContext
            );

            throw new AssertionException(errorMessage);
        }
    }

    /// <summary>
    /// Asserts that an async operation should throw a specific exception with enhanced error messaging
    /// </summary>
    public static async Task<TException> ShouldThrowWithContextAsync<TException>(
        this Func<Task> operation,
        string testName,
        GeoQuizDbContext? context = null,
        string? additionalContext = null) where TException : Exception
    {
        try
        {
            await operation();
            
            DatabaseDiagnosticInfo? databaseState = null;
            if (context != null)
            {
                databaseState = await TestDiagnostics.GetDatabaseDiagnosticsAsync(context, testName);
            }

            var errorMessage = TestErrorHandler.CreateEnhancedAssertionMessage(
                testName,
                $"Operation should throw {typeof(TException).Name}",
                $"Exception of type {typeof(TException).Name}",
                "No exception thrown",
                databaseState,
                additionalContext
            );

            throw new AssertionException(errorMessage);
        }
        catch (TException ex)
        {
            return ex; // Expected exception was thrown
        }
        catch (Exception ex)
        {
            DatabaseDiagnosticInfo? databaseState = null;
            if (context != null)
            {
                databaseState = await TestDiagnostics.GetDatabaseDiagnosticsAsync(context, testName);
            }

            var errorMessage = TestErrorHandler.CreateEnhancedAssertionMessage(
                testName,
                $"Operation should throw {typeof(TException).Name}",
                $"Exception of type {typeof(TException).Name}",
                $"Exception of type {ex.GetType().Name}: {ex.Message}",
                databaseState,
                additionalContext
            );

            throw new AssertionException(errorMessage, ex);
        }
    }

    /// <summary>
    /// Validates database isolation and throws detailed error if validation fails
    /// </summary>
    public static async Task ValidateDatabaseIsolationAsync(
        this GeoQuizDbContext context,
        string testName)
    {
        var isolationResult = await TestDiagnostics.ValidateDatabaseIsolationAsync(context, testName);
        
        if (!isolationResult.IsIsolated)
        {
            var errorMessage = TestErrorHandler.CreateEnhancedAssertionMessage(
                testName,
                "Database should be isolated (empty)",
                "Empty database",
                "Database with existing data",
                isolationResult.Diagnostics,
                isolationResult.ToString()
            );

            throw new AssertionException(errorMessage);
        }
    }

    /// <summary>
    /// Logs performance metrics for test operations
    /// </summary>
    public static async Task<T> WithPerformanceLoggingAsync<T>(
        this Task<T> operation,
        ILogger logger,
        string testName,
        string operationName)
    {
        return await TestDiagnostics.MeasureOperationAsync(logger, testName, operationName, () => operation);
    }

    /// <summary>
    /// Logs performance metrics for void test operations
    /// </summary>
    public static async Task WithPerformanceLoggingAsync(
        this Task operation,
        ILogger logger,
        string testName,
        string operationName)
    {
        await TestDiagnostics.MeasureOperationAsync(logger, testName, operationName, () => operation);
    }
}

/// <summary>
/// Custom assertion exception with enhanced error information
/// </summary>
public class AssertionException : Exception
{
    public AssertionException(string message) : base(message) { }
    public AssertionException(string message, Exception innerException) : base(message, innerException) { }
}