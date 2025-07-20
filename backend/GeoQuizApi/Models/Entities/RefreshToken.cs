using System.ComponentModel.DataAnnotations;

namespace GeoQuizApi.Models.Entities;

public class RefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [MaxLength(500)]
    public string Token { get; set; } = string.Empty;
    
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    public DateTime ExpiresAt { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public bool IsRevoked { get; set; } = false;
    
    // Navigation properties
    public User User { get; set; } = null!;
}