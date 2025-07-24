using Microsoft.EntityFrameworkCore;

namespace GeoQuizApi.Services;

/// <summary>
/// Utility class for handling concurrency-related operations
/// </summary>
public static class ConcurrencyUtilities
{
    /// <summary>
    /// Executes an operation with retry logic for handling concurrency conflicts
    /// </summary>
    public static async Task<T> ExecuteWithRetryAsync<T>(
        Func<Task<T>> operation,
        int maxRetries = 3,
        TimeSpan? baseDelay = null,
        ILogger? logger = null)
    {
        baseDelay ??= TimeSpan.FromMilliseconds(100);
        
        for (int attempt = 0; attempt < maxRetries; attempt++)
        {
            try
            {
                return await operation();
            }
            catch (DbUpdateConcurrencyException ex) when (attempt < maxRetries - 1)
            {
                logger?.LogWarning(ex, "Concurrency conflict on attempt {Attempt}/{MaxRetries}", 
                    attempt + 1, maxRetries);
                await Task.Delay(baseDelay.Value * (attempt + 1)); // Exponential backoff
            }
            catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex) && attempt < maxRetries - 1)
            {
                logger?.LogWarning(ex, "Unique constraint violation on attempt {Attempt}/{MaxRetries}", 
                    attempt + 1, maxRetries);
                await Task.Delay(baseDelay.Value * (attempt + 1)); // Exponential backoff
            }
        }
        
        // Final attempt without retry
        return await operation();
    }

    /// <summary>
    /// Checks if a DbUpdateException is caused by a unique constraint violation
    /// </summary>
    public static bool IsUniqueConstraintViolation(DbUpdateException ex)
    {
        // SQLite specific error checking
        var message = ex.InnerException?.Message?.ToLowerInvariant() ?? string.Empty;
        return message.Contains("unique constraint") || 
               message.Contains("duplicate") ||
               message.Contains("unique index");
    }

    /// <summary>
    /// Checks if an exception is a concurrency-related exception
    /// </summary>
    public static bool IsConcurrencyException(Exception ex)
    {
        return ex is DbUpdateConcurrencyException ||
               (ex is DbUpdateException dbEx && IsUniqueConstraintViolation(dbEx));
    }
}

/// <summary>
/// Thread-safe timestamp generator to prevent race conditions with DateTime.UtcNow
/// </summary>
public static class TimestampManager
{
    private static readonly object _lock = new object();
    private static DateTime _lastTimestamp = DateTime.MinValue;

    /// <summary>
    /// Generates a unique timestamp that is guaranteed to be greater than the previous one
    /// </summary>
    public static DateTime GetUniqueTimestamp()
    {
        lock (_lock)
        {
            var now = DateTime.UtcNow;
            if (now <= _lastTimestamp)
            {
                _lastTimestamp = _lastTimestamp.AddTicks(1);
                return _lastTimestamp;
            }
            _lastTimestamp = now;
            return now;
        }
    }

    /// <summary>
    /// Generates a unique timestamp based on a provided base time
    /// </summary>
    public static DateTime GetUniqueTimestamp(DateTime baseTime)
    {
        lock (_lock)
        {
            if (baseTime <= _lastTimestamp)
            {
                _lastTimestamp = _lastTimestamp.AddTicks(1);
                return _lastTimestamp;
            }
            _lastTimestamp = baseTime;
            return baseTime;
        }
    }

    /// <summary>
    /// Resets the timestamp manager (primarily for testing)
    /// </summary>
    public static void Reset()
    {
        lock (_lock)
        {
            _lastTimestamp = DateTime.MinValue;
        }
    }
}