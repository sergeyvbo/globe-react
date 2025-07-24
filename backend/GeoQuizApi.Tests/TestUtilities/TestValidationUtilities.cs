using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using GeoQuizApi.Data;
using System.Text;

namespace GeoQuizApi.Tests.TestUtilities;

/// <summary>
/// Comprehensive validation utilities for test infrastructure
/// </summary>
public static class TestValidationUtilities
{
    /// <summary>
    /// Validates that all test infrastructure components are working correctly
    /// </summary>
    public static async Task<TestInfrastructureValidationResult> ValidateTestInfrastructureAsync(
        GeoQuizDbContext context,
        ILogger logger,
        string testName)
    {
        var result = new TestInfrastructureValidationResult
        {
            TestName = testName,
            ValidationTime = DateTime.UtcNow
        };

        try
        {
            // 1. Validate database connectivity
            logger.LogDebug("Validating database connectivity for test {TestName}", testName);
            var canConnect = await context.Database.CanConnectAsync();
            result.DatabaseConnectivity = canConnect;
            
            if (!canConnect)
            {
                result.ValidationErrors.Add("Cannot connect to test database");
                result.IsValid = false;
                return result;
            }

            // 2. Validate database schema
            logger.LogDebug("Validating database schema for test {TestName}", testName);
            try
            {
                await context.Users.CountAsync();
                await context.GameSessions.CountAsync();
                await context.RefreshTokens.CountAsync();
                result.DatabaseSchema = true;
            }
            catch (Exception ex)
            {
                result.DatabaseSchema = false;
                result.ValidationErrors.Add($"Database schema validation failed: {ex.Message}");
                result.IsValid = false;
            }

            // 3. Validate database isolation
            logger.LogDebug("Validating database isolation for test {TestName}", testName);
            var isolationResult = await TestDiagnostics.ValidateDatabaseIsolationAsync(context, testName);
            result.DatabaseIsolation = isolationResult.IsIsolated;
            
            if (!isolationResult.IsIsolated)
            {
                result.ValidationErrors.AddRange(isolationResult.IsolationViolations);
                result.ValidationWarnings.Add("Database isolation may be compromised");
            }

            // 4. Validate timestamp generation
            logger.LogDebug("Validating timestamp generation for test {TestName}", testName);
            var timestamp1 = TimestampManager.GetUniqueTimestamp();
            var timestamp2 = TimestampManager.GetUniqueTimestamp();
            var timestamp3 = TimestampManager.GetUniqueTimestamp();
            
            result.TimestampGeneration = timestamp1 != timestamp2 && timestamp2 != timestamp3 && timestamp1 < timestamp2 && timestamp2 < timestamp3;
            
            if (!result.TimestampGeneration)
            {
                result.ValidationErrors.Add($"Timestamp generation failed: {timestamp1}, {timestamp2}, {timestamp3}");
                result.IsValid = false;
            }

            // 5. Validate email generation
            logger.LogDebug("Validating email generation for test {TestName}", testName);
            var email1 = TestDataBuilder.GenerateUniqueEmail();
            var email2 = TestDataBuilder.GenerateUniqueEmail();
            var email3 = TestDataBuilder.GenerateUniqueEmail();
            
            result.EmailGeneration = email1 != email2 && email2 != email3 && 
                                   email1.Contains("@") && email2.Contains("@") && email3.Contains("@");
            
            if (!result.EmailGeneration)
            {
                result.ValidationErrors.Add($"Email generation failed: {email1}, {email2}, {email3}");
                result.IsValid = false;
            }

            // 6. Validate test data builders
            logger.LogDebug("Validating test data builders for test {TestName}", testName);
            try
            {
                var user = TestDataBuilder.User().Build();
                var session = TestDataBuilder.GameSession().Build();
                var token = TestDataBuilder.RefreshToken().Build();
                
                result.TestDataBuilders = user != null && session != null && token != null &&
                                        !string.IsNullOrEmpty(user.Email) && 
                                        !string.IsNullOrEmpty(session.GameType) &&
                                        !string.IsNullOrEmpty(token.Token);
                
                if (!result.TestDataBuilders)
                {
                    result.ValidationErrors.Add("Test data builders validation failed");
                    result.IsValid = false;
                }
            }
            catch (Exception ex)
            {
                result.TestDataBuilders = false;
                result.ValidationErrors.Add($"Test data builders failed: {ex.Message}");
                result.IsValid = false;
            }

            // 7. Validate database cleanup capability
            logger.LogDebug("Validating database cleanup capability for test {TestName}", testName);
            try
            {
                // Add some test data
                var testUser = TestDataBuilder.User().Build();
                context.Users.Add(testUser);
                await context.SaveChangesAsync();
                
                // Verify data exists
                var userCount = await context.Users.CountAsync();
                if (userCount == 0)
                {
                    result.ValidationErrors.Add("Failed to add test data for cleanup validation");
                    result.DatabaseCleanup = false;
                    result.IsValid = false;
                }
                else
                {
                    // Clean up the data
                    context.Users.RemoveRange(context.Users);
                    await context.SaveChangesAsync();
                    
                    // Verify cleanup worked
                    var cleanedUserCount = await context.Users.CountAsync();
                    result.DatabaseCleanup = cleanedUserCount == 0;
                    
                    if (!result.DatabaseCleanup)
                    {
                        result.ValidationErrors.Add($"Database cleanup failed: {cleanedUserCount} users remain");
                        result.IsValid = false;
                    }
                }
            }
            catch (Exception ex)
            {
                result.DatabaseCleanup = false;
                result.ValidationErrors.Add($"Database cleanup validation failed: {ex.Message}");
                result.IsValid = false;
            }

            // Set overall validation result
            result.IsValid = result.ValidationErrors.Count == 0;
            
            logger.LogDebug("Test infrastructure validation completed for {TestName}: {IsValid}", 
                testName, result.IsValid);

            return result;
        }
        catch (Exception ex)
        {
            result.IsValid = false;
            result.ValidationErrors.Add($"Validation process failed: {ex.Message}");
            logger.LogError(ex, "Test infrastructure validation failed for {TestName}", testName);
            return result;
        }
    }

    /// <summary>
    /// Validates that test cleanup was successful
    /// </summary>
    public static async Task<TestCleanupValidationResult> ValidateTestCleanupAsync(
        GeoQuizDbContext context,
        ILogger logger,
        string testName)
    {
        var result = new TestCleanupValidationResult
        {
            TestName = testName,
            ValidationTime = DateTime.UtcNow
        };

        try
        {
            logger.LogDebug("Validating test cleanup for {TestName}", testName);

            var diagnostics = await TestDiagnostics.GetDatabaseDiagnosticsAsync(context, testName);
            result.DatabaseDiagnostics = diagnostics;
            result.IsClean = !diagnostics.HasData;

            if (!result.IsClean)
            {
                result.CleanupIssues.Add($"Database contains {diagnostics.UserCount} users");
                result.CleanupIssues.Add($"Database contains {diagnostics.SessionCount} sessions");
                result.CleanupIssues.Add($"Database contains {diagnostics.TokenCount} tokens");
                
                // Add specific data details
                if (diagnostics.Users.Any())
                {
                    result.CleanupIssues.Add($"Remaining users: {string.Join(", ", diagnostics.Users.Take(3))}");
                }
                if (diagnostics.Sessions.Any())
                {
                    result.CleanupIssues.Add($"Remaining sessions: {string.Join(", ", diagnostics.Sessions.Take(3))}");
                }
                if (diagnostics.Tokens.Any())
                {
                    result.CleanupIssues.Add($"Remaining tokens: {string.Join(", ", diagnostics.Tokens.Take(3))}");
                }
            }

            logger.LogDebug("Test cleanup validation completed for {TestName}: {IsClean}", 
                testName, result.IsClean);

            return result;
        }
        catch (Exception ex)
        {
            result.IsClean = false;
            result.CleanupIssues.Add($"Cleanup validation failed: {ex.Message}");
            logger.LogError(ex, "Test cleanup validation failed for {TestName}", testName);
            return result;
        }
    }

    /// <summary>
    /// Runs comprehensive test suite validation
    /// </summary>
    public static async Task<TestSuiteValidationResult> ValidateTestSuiteAsync(
        List<GeoQuizDbContext> contexts,
        ILogger logger,
        List<string> testNames)
    {
        var result = new TestSuiteValidationResult
        {
            ValidationTime = DateTime.UtcNow,
            TestCount = testNames.Count
        };

        try
        {
            logger.LogInformation("Starting test suite validation for {TestCount} tests", testNames.Count);

            for (int i = 0; i < contexts.Count && i < testNames.Count; i++)
            {
                var testResult = await ValidateTestInfrastructureAsync(contexts[i], logger, testNames[i]);
                result.TestResults.Add(testResult);
                
                if (!testResult.IsValid)
                {
                    result.FailedTests.Add(testNames[i]);
                }
            }

            result.IsValid = result.FailedTests.Count == 0;
            result.SuccessRate = (double)(result.TestCount - result.FailedTests.Count) / result.TestCount * 100;

            logger.LogInformation("Test suite validation completed: {SuccessRate:F1}% success rate ({SuccessCount}/{TotalCount})",
                result.SuccessRate, result.TestCount - result.FailedTests.Count, result.TestCount);

            return result;
        }
        catch (Exception ex)
        {
            result.IsValid = false;
            result.ValidationError = ex.Message;
            logger.LogError(ex, "Test suite validation failed");
            return result;
        }
    }
}

/// <summary>
/// Result of test infrastructure validation
/// </summary>
public class TestInfrastructureValidationResult
{
    public string TestName { get; set; } = string.Empty;
    public DateTime ValidationTime { get; set; }
    public bool IsValid { get; set; } = true;
    public bool DatabaseConnectivity { get; set; }
    public bool DatabaseSchema { get; set; }
    public bool DatabaseIsolation { get; set; }
    public bool TimestampGeneration { get; set; }
    public bool EmailGeneration { get; set; }
    public bool TestDataBuilders { get; set; }
    public bool DatabaseCleanup { get; set; }
    public List<string> ValidationErrors { get; set; } = new();
    public List<string> ValidationWarnings { get; set; } = new();

    public override string ToString()
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Test Infrastructure Validation for {TestName}");
        sb.AppendLine($"Validation Time: {ValidationTime:yyyy-MM-dd HH:mm:ss.fff} UTC");
        sb.AppendLine($"Overall Valid: {IsValid}");
        sb.AppendLine($"Database Connectivity: {DatabaseConnectivity}");
        sb.AppendLine($"Database Schema: {DatabaseSchema}");
        sb.AppendLine($"Database Isolation: {DatabaseIsolation}");
        sb.AppendLine($"Timestamp Generation: {TimestampGeneration}");
        sb.AppendLine($"Email Generation: {EmailGeneration}");
        sb.AppendLine($"Test Data Builders: {TestDataBuilders}");
        sb.AppendLine($"Database Cleanup: {DatabaseCleanup}");

        if (ValidationErrors.Any())
        {
            sb.AppendLine("Validation Errors:");
            foreach (var error in ValidationErrors)
            {
                sb.AppendLine($"  - {error}");
            }
        }

        if (ValidationWarnings.Any())
        {
            sb.AppendLine("Validation Warnings:");
            foreach (var warning in ValidationWarnings)
            {
                sb.AppendLine($"  - {warning}");
            }
        }

        return sb.ToString();
    }
}

/// <summary>
/// Result of test cleanup validation
/// </summary>
public class TestCleanupValidationResult
{
    public string TestName { get; set; } = string.Empty;
    public DateTime ValidationTime { get; set; }
    public bool IsClean { get; set; }
    public DatabaseDiagnosticInfo? DatabaseDiagnostics { get; set; }
    public List<string> CleanupIssues { get; set; } = new();

    public override string ToString()
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Test Cleanup Validation for {TestName}");
        sb.AppendLine($"Validation Time: {ValidationTime:yyyy-MM-dd HH:mm:ss.fff} UTC");
        sb.AppendLine($"Is Clean: {IsClean}");

        if (CleanupIssues.Any())
        {
            sb.AppendLine("Cleanup Issues:");
            foreach (var issue in CleanupIssues)
            {
                sb.AppendLine($"  - {issue}");
            }
        }

        if (DatabaseDiagnostics != null)
        {
            sb.AppendLine();
            sb.AppendLine("Database State:");
            sb.AppendLine(DatabaseDiagnostics.ToString());
        }

        return sb.ToString();
    }
}

/// <summary>
/// Result of test suite validation
/// </summary>
public class TestSuiteValidationResult
{
    public DateTime ValidationTime { get; set; }
    public int TestCount { get; set; }
    public bool IsValid { get; set; }
    public double SuccessRate { get; set; }
    public List<TestInfrastructureValidationResult> TestResults { get; set; } = new();
    public List<string> FailedTests { get; set; } = new();
    public string? ValidationError { get; set; }

    public override string ToString()
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Test Suite Validation Result");
        sb.AppendLine($"Validation Time: {ValidationTime:yyyy-MM-dd HH:mm:ss.fff} UTC");
        sb.AppendLine($"Test Count: {TestCount}");
        sb.AppendLine($"Overall Valid: {IsValid}");
        sb.AppendLine($"Success Rate: {SuccessRate:F1}%");

        if (FailedTests.Any())
        {
            sb.AppendLine("Failed Tests:");
            foreach (var test in FailedTests)
            {
                sb.AppendLine($"  - {test}");
            }
        }

        if (!string.IsNullOrEmpty(ValidationError))
        {
            sb.AppendLine($"Validation Error: {ValidationError}");
        }

        return sb.ToString();
    }
}