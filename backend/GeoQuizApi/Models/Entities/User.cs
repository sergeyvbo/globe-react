using System.ComponentModel.DataAnnotations;

namespace GeoQuizApi.Models.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    public string PasswordHash { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? Name { get; set; }
    
    [MaxLength(500)]
    public string? Avatar { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Provider { get; set; } = "email";
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? LastLoginAt { get; set; }
    
    // User Preferences stored as JSON
    public string? PreferencesJson { get; set; }
    
    // Navigation properties
    public ICollection<GameSession> GameSessions { get; set; } = new List<GameSession>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}