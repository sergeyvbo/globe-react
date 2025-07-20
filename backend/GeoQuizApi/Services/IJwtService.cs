using System.Security.Claims;
using GeoQuizApi.Models.Entities;

namespace GeoQuizApi.Services;

public interface IJwtService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
    ClaimsPrincipal? GetPrincipalFromExpiredToken(string token);
    bool ValidateToken(string token);
}