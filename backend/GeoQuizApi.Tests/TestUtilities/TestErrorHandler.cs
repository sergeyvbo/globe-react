using Microsoft.Extensions.Logging;
using GeoQuizApi.Data;
using System.Text;

namespace GeoQuizApi.Tests.TestUtilities;

/// <summary>
/// Enhanced error handling utilities for test operations
/// </summary>
public static class TestErrorHandler
{
    /// <summary>
    /// Handles database cleanup errors with comprehensive logging and fallback strategies
    /// </summary>
    public static async Task<DatabaseCleanupResult> HandleDatabaseCleanupAsync(
        ILogger logger, 
        GeoQuizDbContext context, 
        string testName, 
        Func<Task> cleanupOperation,
        Func<Task>? fallbackRecreation = null)
    {
        var result = new DatabaseCleanupResult
        {
            TestName = testName,
            StartTime = DateTime.UtcNow
        };

        try
        {
            // Log initial database state
            await TestDiagnostics.LogDatabaseCleanupAsync(logger, context, testName, "before cleanup");

            // Attempt primary cleanup operation
            logger.LogDebug("Starting database cleanup for test {TestName}", testName);
            await cleanupOperation();
            
            result.Success = true;
            result.Method = DatabaseCleanupMethod.StandardCleanup;
            result.EndTime = DateTime.UtcNow;
            
            logger.LogDebug("Database cleanup completed successfully for test {TestName} in {Duration}ms", 
                testName, result.DurationMs);

            // Verify cleanup was successful
            var postCleanupDiagnostics = await TestDiagnostics.GetDatabaseDiagnosticsAsync(context, testName);
            if (postCleanupDiagnostics.HasData)
            {
                logger.LogWarning("Database cleanup for test {TestName} left residual data: {Diagnostics}", 
                    testName, postCleanupDiagnostics.ToSummaryString());
                result.Warnings.Add($"Residual data found after cleanup: {postCleanupDiagnostics.ToSummaryString()}");
            }

            return result;
        }
        catch (Exception cleanupEx)
        {
            result.PrimaryError = cleanupEx;
            logger.LogWarning(cleanupEx, "Primary database cleanup failed for test {TestName}, attempting fallback", testName);

            // Attempt fallback recreation if provided
            if (fallbackRecreation != null)
            {
                try
                {
                    logger.LogInformation("Attempting database recreation fallback for test {TestName}", testName);
                    await fallbackRecreation();
                    
                    result.Success = true;
                    result.Method = DatabaseCleanupMethod.FallbackRecreation;
                    result.EndTime = DateTime.UtcNow;
                    
                    logger.LogInformation("Database recreation fallback succeeded for test {TestName} in {Duration}ms", 
                        testName, result.DurationMs);
                    
                    return result;
                }
                catch (Exception fallbackEx)
                {
                    result.FallbackError = fallbackEx;
                    logger.LogError(fallbackEx, "Database recreation fallback also failed for test {TestName}", testName);
                }
            }

            // Both primary and fallback failed
            result.Success = false;
            result.Method = DatabaseCleanupMethod.Failed;
            result.EndTime = DateTime.UtcNow;

            var errorMessage = TestDiagnostics.CreateDetailedErrorMessage(
                testName, 
                "Database Cleanup", 
                cleanupEx, 
                await TestDiagnostics.GetDatabaseDiagnosticsAsync(context, testName));

            logger.LogError("Complete database cleanup failure for test {TestName}: {ErrorDetails}", 
                testName, errorMessage);

            result.DetailedError = errorMessage;
            return result;
        }
    }

    /// <summary>
    /// Wraps test operations with comprehensive error handling and logging
    /// </summary>
    public static async Task<TestOperationResult<T>> ExecuteWithErrorHandlingAsync<T>(
        ILogger logger,
        string testName,
        string operationName,
        Func<Task<T>> operation,
        GeoQuizDbContext? context = null)
    {
        var result = new TestOperationResult<T>
        {
            TestName = testName,
            OperationName = operationName,
            StartTime = DateTime.UtcNow
        };

        try
        {
            logger.LogDebug("Starting operation {Operation} for test {TestName}", operationName, testName);

            // Capture initial state if context provided
            if (context != null)
            {
                result.InitialDatabaseState = await TestDiagnostics.GetDatabaseDiagnosticsAsync(context, testName);
            }

            // Execute the operation
            result.Result = await operation();
            result.Success = true;
            result.EndTime = DateTime.UtcNow;

            logger.LogDebug("Operation {Operation} completed successfully for test {TestName} in {Duration}ms",
                operationName, testName, result.DurationMs);

            return result;
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.Exception = ex;
            result.EndTime = DateTime.UtcNow;

            // Capture final state if context provided
            if (context != null)
            {
                try
                {
                    result.FinalDatabaseState = await TestDiagnostics.GetDatabaseDiagnosticsAsync(context, testName);
                }
                catch (Exception diagEx)
                {
                    logger.LogWarning(diagEx, "Failed to capture final database state for failed operation {Operation} in test {TestName}", 
                        operationName, testName);
                }
            }

            var errorMessage = TestDiagnostics.CreateDetailedErrorMessage(testName, operationName, ex, result.FinalDatabaseState);
            result.DetailedError = errorMessage;

            logger.LogError(ex, "Operation {Operation} failed for test {TestName} after {Duration}ms: {ErrorDetails}",
                operationName, testName, result.DurationMs, errorMessage);

            return result;
        }
    }

    /// <summary>
    /// Wraps void test operations with comprehensive error handling and logging
    /// </summary>
    public static async Task<TestOperationResult> ExecuteWithErrorHandlingAsync(
        ILogger logger,
        string testName,
        string operationName,
        Func<Task> operation,
        GeoQuizDbContext? context = null)
    {
        var result = await ExecuteWithErrorHandlingAsync(logger, testName, operationName, async () =>
        {
            await operation();
            return true; // Return dummy value
        }, context);

        return new TestOperationResult
        {
            TestName = result.TestName,
            OperationName = result.OperationName,
            StartTime = result.StartTime,
            EndTime = result.EndTime,
            Success = result.Success,
            Exception = result.Exception,
            DetailedError = result.DetailedError,
            InitialDatabaseState = result.InitialDatabaseState,
            FinalDatabaseState = result.FinalDatabaseState
        };
    }

    /// <summary>
    /// Creates enhanced assertion failure messages with full context
    /// </summary>
    public static string CreateEnhancedAssertionMessage(
        string testName,
        string assertion,
        object? expected,
        object? actual,
        DatabaseDiagnosticInfo? databaseState = null,
        string? additionalContext = null)
    {
        var sb = new StringBuilder();
        sb.AppendLine("=== ASSERTION FAILURE ===");
        sb.AppendLine($"Test: {testName}");
        sb.AppendLine($"Assertion: {assertion}");
        sb.AppendLine($"Expected: {FormatValue(expected)}");
        sb.AppendLine($"Actual: {FormatValue(actual)}");
        sb.AppendLine($"Timestamp: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss.fff} UTC");

        if (!string.IsNullOrEmpty(additionalContext))
        {
            sb.AppendLine();
            sb.AppendLine("=== ADDITIONAL CONTEXT ===");
            sb.AppendLine(additionalContext);
        }

        if (databaseState != null)
        {
            sb.AppendLine();
            sb.AppendLine("=== DATABASE STATE ===");
            sb.AppendLine(databaseState.ToString());
        }

        sb.AppendLine("=== END ASSERTION FAILURE ===");
        return sb.ToString();
    }

    /// <summary>
    /// Formats values for display in error messages
    /// </summary>
    private static string FormatValue(object? value)
    {
        if (value == null) return "null";
        if (value is string str) return $"\"{str}\"";
        if (value is DateTime dt) return dt.ToString("yyyy-MM-dd HH:mm:ss.fff");
        if (value is IEnumerable<object> enumerable && !(value is string))
        {
            return $"[{string.Join(", ", enumerable.Select(FormatValue))}]";
        }
        return value.ToString() ?? "null";
    }
}

/// <summary>
/// Result of a database cleanup operation
/// </summary>
public class DatabaseCleanupResult
{
    public string TestName { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public bool Success { get; set; }
    public DatabaseCleanupMethod Method { get; set; }
    public Exception? PrimaryError { get; set; }
    public Exception? FallbackError { get; set; }
    public string? DetailedError { get; set; }
    public List<string> Warnings { get; set; } = new();

    public long DurationMs => (long)(EndTime - StartTime).TotalMilliseconds;

    public override string ToString()
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Database Cleanup Result for {TestName}");
        sb.AppendLine($"Success: {Success}");
        sb.AppendLine($"Method: {Method}");
        sb.AppendLine($"Duration: {DurationMs}ms");

        if (Warnings.Any())
        {
            sb.AppendLine("Warnings:");
            foreach (var warning in Warnings)
            {
                sb.AppendLine($"  - {warning}");
            }
        }

        if (!Success)
        {
            if (PrimaryError != null)
            {
                sb.AppendLine($"Primary Error: {PrimaryError.GetType().Name}: {PrimaryError.Message}");
            }
            if (FallbackError != null)
            {
                sb.AppendLine($"Fallback Error: {FallbackError.GetType().Name}: {FallbackError.Message}");
            }
        }

        return sb.ToString();
    }
}

/// <summary>
/// Result of a test operation with comprehensive error information
/// </summary>
public class TestOperationResult<T>
{
    public string TestName { get; set; } = string.Empty;
    public string OperationName { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public bool Success { get; set; }
    public T? Result { get; set; }
    public Exception? Exception { get; set; }
    public string? DetailedError { get; set; }
    public DatabaseDiagnosticInfo? InitialDatabaseState { get; set; }
    public DatabaseDiagnosticInfo? FinalDatabaseState { get; set; }

    public long DurationMs => (long)(EndTime - StartTime).TotalMilliseconds;
}

/// <summary>
/// Result of a void test operation
/// </summary>
public class TestOperationResult
{
    public string TestName { get; set; } = string.Empty;
    public string OperationName { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public bool Success { get; set; }
    public Exception? Exception { get; set; }
    public string? DetailedError { get; set; }
    public DatabaseDiagnosticInfo? InitialDatabaseState { get; set; }
    public DatabaseDiagnosticInfo? FinalDatabaseState { get; set; }

    public long DurationMs => (long)(EndTime - StartTime).TotalMilliseconds;
}

/// <summary>
/// Methods used for database cleanup
/// </summary>
public enum DatabaseCleanupMethod
{
    StandardCleanup,
    FallbackRecreation,
    Failed
}