using System.ComponentModel.DataAnnotations;

namespace GeoQuizApi.Models.DTOs.Auth;

public class UpdateProfileRequest
{
    [MaxLength(100, ErrorMessage = "Name cannot exceed 100 characters")]
    public string? Name { get; set; }

    [MaxLength(500, ErrorMessage = "Avatar URL cannot exceed 500 characters")]
    public string? Avatar { get; set; }
}