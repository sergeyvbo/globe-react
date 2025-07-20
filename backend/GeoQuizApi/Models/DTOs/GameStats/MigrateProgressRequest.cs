using System.ComponentModel.DataAnnotations;

namespace GeoQuizApi.Models.DTOs.GameStats;

public class MigrateProgressRequest
{
    [Required(ErrorMessage = "Anonymous sessions are required")]
    [MinLength(1, ErrorMessage = "At least one session is required")]
    public List<AnonymousGameSessionDto> AnonymousSessions { get; set; } = new();
}

public class AnonymousGameSessionDto
{
    [Required(ErrorMessage = "Game type is required")]
    [MaxLength(50, ErrorMessage = "Game type cannot exceed 50 characters")]
    public string GameType { get; set; } = string.Empty;

    [Range(0, int.MaxValue, ErrorMessage = "Correct answers must be non-negative")]
    public int CorrectAnswers { get; set; }

    [Range(0, int.MaxValue, ErrorMessage = "Wrong answers must be non-negative")]
    public int WrongAnswers { get; set; }

    [Required(ErrorMessage = "Session start time is required")]
    public DateTime SessionStartTime { get; set; }

    public DateTime? SessionEndTime { get; set; }
}