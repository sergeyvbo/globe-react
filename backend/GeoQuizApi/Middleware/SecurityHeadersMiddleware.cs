using GeoQuizApi.Configuration;
using Microsoft.Extensions.Options;

namespace GeoQuizApi.Middleware;

public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<SecurityHeadersMiddleware> _logger;

    public SecurityHeadersMiddleware(
        RequestDelegate next,
        ILogger<SecurityHeadersMiddleware> logger)
    {
        _next = next;
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
        var path = context.Request.Path.Value?.ToLowerInvariant();

        // Skip strict security headers for Scalar documentation endpoints
        var isScalarEndpoint = path?.StartsWith("/scalar") == true || path?.StartsWith("/openapi") == true;

        // X-Content-Type-Options: Prevent MIME type sniffing
        headers.Append("X-Content-Type-Options", "nosniff");

        // X-Frame-Options: Prevent clickjacking (relaxed for Scalar)
        headers.Append("X-Frame-Options", "DENY");

        // X-XSS-Protection: Enable XSS filtering
        headers.Append("X-XSS-Protection", "1; mode=block");

        // Referrer-Policy: Control referrer information
        headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");

        // Content-Security-Policy: Relaxed for Scalar, strict for API
        if (isScalarEndpoint)
        {
            // Allow inline styles and scripts for Scalar UI
            headers.Append("Content-Security-Policy", 
                "default-src 'self'; " +
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
                "style-src 'self' 'unsafe-inline'; " +
                "img-src 'self' data:; " +
                "font-src 'self' https://fonts.scalar.com/ data:;");
        }
        else
        {
            // Strict CSP for API endpoints
            headers.Append("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none';");
        }

        // X-Permitted-Cross-Domain-Policies: Restrict cross-domain policies
        headers.Append("X-Permitted-Cross-Domain-Policies", "none");

        // Remove server header for security
        headers.Remove("Server");

        _logger.LogDebug("Security headers added to response for path: {Path}", path);
    }
}