using System.ComponentModel.DataAnnotations;

namespace GeoQuizApi.Models.Entities;

public class GameSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string GameType { get; set; } = string.Empty; // countries, flags, states
    
    [Required]
    public int CorrectAnswers { get; set; }
    
    [Required]
    public int WrongAnswers { get; set; }
    
    [Required]
    public DateTime SessionStartTime { get; set; }
    
    public DateTime? SessionEndTime { get; set; }
    
    public int? SessionDurationMs { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public User User { get; set; } = null!;
}