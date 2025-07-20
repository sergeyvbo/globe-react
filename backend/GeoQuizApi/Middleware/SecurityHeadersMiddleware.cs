using GeoQuizApi.Configuration;
using Microsoft.Extensions.Options;

namespace GeoQuizApi.Middleware;

public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;
    private readonly SecuritySettings _securitySettings;
    private readonly ILogger<SecurityHeadersMiddleware> _logger;

    public SecurityHeadersMiddleware(
        RequestDelegate next,
        IOptions<SecuritySettings> securitySettings,
        ILogger<SecurityHeadersMiddleware> logger)
    {
        _next = next;
        _securitySettings = securitySettings.Value;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Add security headers
        AddSecurityHeaders(context);

        await _next(context);
    }

    private void AddSecurityHeaders(HttpContext context)
    {
        var headers = context.Response.Headers;

        // X-Content-Type-Options: Prevent MIME type sniffing
        headers.Append("X-Content-Type-Options", "nosniff");

        // X-Frame-Options: Prevent clickjacking
        headers.Append("X-Frame-Options", "DENY");

        // X-XSS-Protection: Enable XSS filtering
        headers.Append("X-XSS-Protection", "1; mode=block");

        // Referrer-Policy: Control referrer information
        headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");

        // Content-Security-Policy: Basic CSP for API
        headers.Append("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none';");

        // X-Permitted-Cross-Domain-Policies: Restrict cross-domain policies
        headers.Append("X-Permitted-Cross-Domain-Policies", "none");

        // Remove server header for security
        headers.Remove("Server");

        _logger.LogDebug("Security headers added to response");
    }
}