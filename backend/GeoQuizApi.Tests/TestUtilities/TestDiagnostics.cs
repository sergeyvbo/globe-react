using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using GeoQuizApi.Data;
using System.Text;

namespace GeoQuizApi.Tests.TestUtilities;

/// <summary>
/// Comprehensive diagnostic utilities for test debugging and error analysis
/// </summary>
public static class TestDiagnostics
{
    /// <summary>
    /// Gets detailed database state information for debugging
    /// </summary>
    public static async Task<DatabaseDiagnosticInfo> GetDatabaseDiagnosticsAsync(GeoQuizDbContext context, string testName = "Unknown")
    {
        try
        {
            var userCount = await context.Users.CountAsync();
            var sessionCount = await context.GameSessions.CountAsync();
            var tokenCount = await context.RefreshTokens.CountAsync();

            var users = await context.Users
                .Select(u => new { u.Id, u.Email, u.CreatedAt })
                .ToListAsync();

            var sessions = await context.GameSessions
                .Select(s => new { s.Id, s.UserId, s.GameType, s.CreatedAt })
                .ToListAsync();

            var tokens = await context.RefreshTokens
                .Select(t => new { t.Id, t.UserId, t.IsRevoked, t.CreatedAt })
                .ToListAsync();

            // Handle database name safely for in-memory databases
            string databaseName;
            try
            {
                databaseName = context.Database.GetDbConnection().Database ?? "InMemory";
            }
            catch
            {
                databaseName = "InMemory";
            }

            return new DatabaseDiagnosticInfo
            {
                TestName = testName,
                DatabaseName = databaseName,
                Timestamp = DateTime.UtcNow,
                UserCount = userCount,
                SessionCount = sessionCount,
                TokenCount = tokenCount,
                Users = users.Select(u => $"User {u.Id}: {u.Email} (Created: {u.CreatedAt})").ToList(),
                Sessions = sessions.Select(s => $"Session {s.Id}: User {s.UserId}, Type {s.GameType} (Created: {s.CreatedAt})").ToList(),
                Tokens = tokens.Select(t => $"Token {t.Id}: User {t.UserId}, Revoked: {t.IsRevoked} (Created: {t.CreatedAt})").ToList()
            };
        }
        catch (Exception ex)
        {
            return new DatabaseDiagnosticInfo
            {
                TestName = testName,
                DatabaseName = "Unknown",
                Timestamp = DateTime.UtcNow,
                Error = $"Failed to get diagnostics: {ex.Message}",
                Exception = ex
            };
        }
    }

    /// <summary>
    /// Creates a detailed error message for test failures with context information
    /// </summary>
    public static string CreateDetailedErrorMessage(string testName, string operation, Exception exception, DatabaseDiagnosticInfo? diagnostics = null)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"=== TEST FAILURE DETAILS ===");
        sb.AppendLine($"Test: {testName}");
        sb.AppendLine($"Operation: {operation}");
        sb.AppendLine($"Timestamp: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss.fff} UTC");
        sb.AppendLine($"Exception Type: {exception.GetType().Name}");
        sb.AppendLine($"Exception Message: {exception.Message}");
        
        if (exception.InnerException != null)
        {
            sb.AppendLine($"Inner Exception: {exception.InnerException.GetType().Name}: {exception.InnerException.Message}");
        }

        sb.AppendLine($"Stack Trace: {exception.StackTrace}");

        if (diagnostics != null)
        {
            sb.AppendLine();
            sb.AppendLine("=== DATABASE STATE ===");
            sb.AppendLine(diagnostics.ToString());
        }

        sb.AppendLine("=== END FAILURE DETAILS ===");
        return sb.ToString();
    }

    /// <summary>
    /// Logs detailed information about database cleanup operations
    /// </summary>
    public static async Task LogDatabaseCleanupAsync(ILogger logger, GeoQuizDbContext context, string testName, string operation)
    {
        try
        {
            var diagnostics = await GetDatabaseDiagnosticsAsync(context, testName);
            
            logger.LogInformation("Database cleanup {Operation} for test {TestName}: {Diagnostics}", 
                operation, testName, diagnostics.ToSummaryString());

            if (diagnostics.HasData)
            {
                logger.LogDebug("Detailed database state before {Operation}: {Details}", 
                    operation, diagnostics.ToString());
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to log database cleanup diagnostics for test {TestName}", testName);
        }
    }

    /// <summary>
    /// Validates database isolation between tests
    /// </summary>
    public static async Task<DatabaseIsolationResult> ValidateDatabaseIsolationAsync(GeoQuizDbContext context, string testName)
    {
        try
        {
            var diagnostics = await GetDatabaseDiagnosticsAsync(context, testName);
            
            var result = new DatabaseIsolationResult
            {
                TestName = testName,
                IsIsolated = !diagnostics.HasData,
                Diagnostics = diagnostics,
                ValidationTime = DateTime.UtcNow
            };

            if (!result.IsIsolated)
            {
                result.IsolationViolations.Add($"Database contains {diagnostics.UserCount} users");
                result.IsolationViolations.Add($"Database contains {diagnostics.SessionCount} sessions");
                result.IsolationViolations.Add($"Database contains {diagnostics.TokenCount} tokens");
            }

            return result;
        }
        catch (Exception ex)
        {
            return new DatabaseIsolationResult
            {
                TestName = testName,
                IsIsolated = false,
                ValidationTime = DateTime.UtcNow,
                Error = $"Validation failed: {ex.Message}",
                Exception = ex
            };
        }
    }

    /// <summary>
    /// Creates informative assertion failure messages with context
    /// </summary>
    public static string CreateAssertionMessage(string testName, string assertion, object? expected, object? actual, string? additionalContext = null)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Assertion failed in test: {testName}");
        sb.AppendLine($"Assertion: {assertion}");
        sb.AppendLine($"Expected: {expected ?? "null"}");
        sb.AppendLine($"Actual: {actual ?? "null"}");
        
        if (!string.IsNullOrEmpty(additionalContext))
        {
            sb.AppendLine($"Context: {additionalContext}");
        }
        
        sb.AppendLine($"Timestamp: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss.fff} UTC");
        
        return sb.ToString();
    }

    /// <summary>
    /// Measures and logs test operation performance
    /// </summary>
    public static async Task<T> MeasureOperationAsync<T>(ILogger logger, string testName, string operationName, Func<Task<T>> operation)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            logger.LogDebug("Starting operation {Operation} for test {TestName}", operationName, testName);
            
            var result = await operation();
            
            stopwatch.Stop();
            logger.LogDebug("Completed operation {Operation} for test {TestName} in {ElapsedMs}ms", 
                operationName, testName, stopwatch.ElapsedMilliseconds);
            
            return result;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            logger.LogError(ex, "Failed operation {Operation} for test {TestName} after {ElapsedMs}ms", 
                operationName, testName, stopwatch.ElapsedMilliseconds);
            throw;
        }
    }

    /// <summary>
    /// Measures and logs test operation performance (void operations)
    /// </summary>
    public static async Task MeasureOperationAsync(ILogger logger, string testName, string operationName, Func<Task> operation)
    {
        await MeasureOperationAsync(logger, testName, operationName, async () =>
        {
            await operation();
            return true; // Return dummy value for generic method
        });
    }
}

/// <summary>
/// Contains detailed information about database state for diagnostics
/// </summary>
public class DatabaseDiagnosticInfo
{
    public string TestName { get; set; } = string.Empty;
    public string DatabaseName { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public int UserCount { get; set; }
    public int SessionCount { get; set; }
    public int TokenCount { get; set; }
    public List<string> Users { get; set; } = new();
    public List<string> Sessions { get; set; } = new();
    public List<string> Tokens { get; set; } = new();
    public string? Error { get; set; }
    public Exception? Exception { get; set; }

    public bool HasData => UserCount > 0 || SessionCount > 0 || TokenCount > 0;
    public bool HasError => !string.IsNullOrEmpty(Error) || Exception != null;

    public string ToSummaryString()
    {
        if (HasError)
        {
            return $"Database: {DatabaseName}, Error: {Error}";
        }

        return $"Database: {DatabaseName}, Users: {UserCount}, Sessions: {SessionCount}, Tokens: {TokenCount}";
    }

    public override string ToString()
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Test: {TestName}");
        sb.AppendLine($"Database: {DatabaseName}");
        sb.AppendLine($"Timestamp: {Timestamp:yyyy-MM-dd HH:mm:ss.fff} UTC");
        
        if (HasError)
        {
            sb.AppendLine($"Error: {Error}");
            if (Exception != null)
            {
                sb.AppendLine($"Exception: {Exception.GetType().Name}: {Exception.Message}");
            }
        }
        else
        {
            sb.AppendLine($"Total Records - Users: {UserCount}, Sessions: {SessionCount}, Tokens: {TokenCount}");
            
            if (Users.Any())
            {
                sb.AppendLine("Users:");
                foreach (var user in Users)
                {
                    sb.AppendLine($"  - {user}");
                }
            }
            
            if (Sessions.Any())
            {
                sb.AppendLine("Sessions:");
                foreach (var session in Sessions)
                {
                    sb.AppendLine($"  - {session}");
                }
            }
            
            if (Tokens.Any())
            {
                sb.AppendLine("Tokens:");
                foreach (var token in Tokens)
                {
                    sb.AppendLine($"  - {token}");
                }
            }
        }

        return sb.ToString();
    }
}

/// <summary>
/// Result of database isolation validation
/// </summary>
public class DatabaseIsolationResult
{
    public string TestName { get; set; } = string.Empty;
    public bool IsIsolated { get; set; }
    public DateTime ValidationTime { get; set; }
    public DatabaseDiagnosticInfo? Diagnostics { get; set; }
    public List<string> IsolationViolations { get; set; } = new();
    public string? Error { get; set; }
    public Exception? Exception { get; set; }

    public bool HasError => !string.IsNullOrEmpty(Error) || Exception != null;

    public override string ToString()
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Database Isolation Validation for {TestName}");
        sb.AppendLine($"Validation Time: {ValidationTime:yyyy-MM-dd HH:mm:ss.fff} UTC");
        sb.AppendLine($"Is Isolated: {IsIsolated}");
        
        if (HasError)
        {
            sb.AppendLine($"Error: {Error}");
        }
        else if (!IsIsolated && IsolationViolations.Any())
        {
            sb.AppendLine("Isolation Violations:");
            foreach (var violation in IsolationViolations)
            {
                sb.AppendLine($"  - {violation}");
            }
        }

        if (Diagnostics != null)
        {
            sb.AppendLine();
            sb.AppendLine("Database State:");
            sb.AppendLine(Diagnostics.ToString());
        }

        return sb.ToString();
    }
}