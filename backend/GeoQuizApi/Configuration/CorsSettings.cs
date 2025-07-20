namespace GeoQuizApi.Configuration;

public class CorsSettings
{
    public const string SectionName = "CorsSettings";
    
    public string[] AllowedOrigins { get; set; } = Array.Empty<string>();
    public bool AllowCredentials { get; set; } = true;
    public string[] AllowedHeaders { get; set; } = Array.Empty<string>();
    public string[] AllowedMethods { get; set; } = Array.Empty<string>();
}