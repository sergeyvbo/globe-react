namespace GeoQuizApi.Configuration;

public class SecuritySettings
{
    public const string SectionName = "SecuritySettings";
    
    public bool EnforceHttps { get; set; } = true;
    public bool EnableHsts { get; set; } = true;
    public int HstsMaxAge { get; set; } = 31536000; // 1 year in seconds
    public bool EnableRateLimiting { get; set; } = true;
    public RateLimitSettings RateLimit { get; set; } = new();
}

public class RateLimitSettings
{
    public int AuthEndpointsPerMinute { get; set; } = 10;
    public int GeneralEndpointsPerMinute { get; set; } = 100;
    public int WindowSizeMinutes { get; set; } = 1;
}