namespace GeoQuizApi.Tests.TestUtilities;

/// <summary>
/// Manages unique timestamp generation for tests to prevent race conditions
/// </summary>
public static class TimestampManager
{
    private static readonly object _lock = new object();
    private static DateTime _lastTimestamp = DateTime.MinValue;
    private static long _tickCounter = 0;

    /// <summary>
    /// Gets a unique timestamp that is guaranteed to be different from all previous calls
    /// </summary>
    /// <param name="baseTime">Optional base time to start from. If null, uses current UTC time</param>
    /// <returns>A unique DateTime</returns>
    public static DateTime GetUniqueTimestamp(DateTime? baseTime = null)
    {
        lock (_lock)
        {
            var now = baseTime ?? DateTime.UtcNow;
            
            // If the requested time is less than or equal to our last timestamp,
            // increment from the last timestamp
            if (now <= _lastTimestamp)
            {
                _lastTimestamp = _lastTimestamp.AddTicks(++_tickCounter);
                return _lastTimestamp;
            }
            
            // Reset counter and use the new time
            _tickCounter = 0;
            _lastTimestamp = now;
            return now;
        }
    }

    /// <summary>
    /// Generates a sequence of unique timestamps starting from a base time
    /// </summary>
    /// <param name="baseTime">The base time to start from</param>
    /// <param name="count">Number of timestamps to generate</param>
    /// <param name="incrementMinutes">Minutes to increment between each timestamp</param>
    /// <returns>Array of unique timestamps</returns>
    public static DateTime[] GenerateSequentialTimestamps(DateTime baseTime, int count, int incrementMinutes = 1)
    {
        lock (_lock)
        {
            var timestamps = new DateTime[count];
            var currentTime = GetUniqueTimestamp(baseTime);
            
            for (int i = 0; i < count; i++)
            {
                timestamps[i] = currentTime.AddMinutes(i * incrementMinutes);
                // Update our internal tracking to ensure uniqueness
                _lastTimestamp = timestamps[i];
            }
            
            return timestamps;
        }
    }

    /// <summary>
    /// Resets the timestamp manager (useful for test isolation)
    /// </summary>
    public static void Reset()
    {
        lock (_lock)
        {
            _lastTimestamp = DateTime.MinValue;
            _tickCounter = 0;
        }
    }
}