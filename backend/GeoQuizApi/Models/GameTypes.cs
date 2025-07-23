namespace GeoQuizApi.Models;

/// <summary>
/// Constants for valid game types
/// </summary>
public static class GameTypes
{
    public const string Countries = "countries";
    public const string Flags = "flags";
    public const string States = "states";

    /// <summary>
    /// List of all valid game types
    /// </summary>
    public static readonly string[] ValidGameTypes = { Countries, Flags, States };

    /// <summary>
    /// Check if a game type is valid
    /// </summary>
    /// <param name="gameType">Game type to validate</param>
    /// <returns>True if valid, false otherwise</returns>
    public static bool IsValid(string? gameType)
    {
        return !string.IsNullOrWhiteSpace(gameType) && 
               ValidGameTypes.Contains(gameType.ToLowerInvariant());
    }
}