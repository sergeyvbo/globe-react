using System.ComponentModel.DataAnnotations;

namespace GeoQuizApi.Models.DTOs.GameStats;

/// <summary>
/// Request for saving game session
/// </summary>
public class GameSessionRequest
{
    /// <summary>
    /// Game type
    /// </summary>
    /// <example>countries</example>
    [Required(ErrorMessage = "Game type is required")]
    [MaxLength(50, ErrorMessage = "Game type cannot exceed 50 characters")]
    public string GameType { get; set; } = string.Empty;

    /// <summary>
    /// Number of correct answers
    /// </summary>
    /// <example>15</example>
    [Range(0, int.MaxValue, ErrorMessage = "Correct answers must be non-negative")]
    public int CorrectAnswers { get; set; }

    /// <summary>
    /// Number of wrong answers
    /// </summary>
    /// <example>3</example>
    [Range(0, int.MaxValue, ErrorMessage = "Wrong answers must be non-negative")]
    public int WrongAnswers { get; set; }

    /// <summary>
    /// Game session start time
    /// </summary>
    /// <example>2024-01-20T10:30:00Z</example>
    [Required(ErrorMessage = "Session start time is required")]
    public DateTime SessionStartTime { get; set; }

    /// <summary>
    /// Game session end time (optional)
    /// </summary>
    /// <example>2024-01-20T10:35:00Z</example>
    public DateTime? SessionEndTime { get; set; }
}