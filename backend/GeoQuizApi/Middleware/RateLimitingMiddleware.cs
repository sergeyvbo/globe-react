using GeoQuizApi.Configuration;
using Microsoft.Extensions.Options;
using System.Collections.Concurrent;
using System.Net;

namespace GeoQuizApi.Middleware;

public class RateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly SecuritySettings _securitySettings;
    private readonly ILogger<RateLimitingMiddleware> _logger;
    private static readonly ConcurrentDictionary<string, ClientRequestInfo> _clients = new();

    public RateLimitingMiddleware(
        RequestDelegate next,
        IOptions<SecuritySettings> securitySettings,
        ILogger<RateLimitingMiddleware> logger)
    {
        _next = next;
        _securitySettings = securitySettings.Value;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!_securitySettings.EnableRateLimiting)
        {
            await _next(context);
            return;
        }

        var clientId = GetClientIdentifier(context);
        var isAuthEndpoint = IsAuthEndpoint(context.Request.Path);
        
        if (IsRateLimited(clientId, isAuthEndpoint))
        {
            _logger.LogWarning("Rate limit exceeded for client {ClientId} on path {Path}", 
                clientId, context.Request.Path);
            
            context.Response.StatusCode = (int)HttpStatusCode.TooManyRequests;
            context.Response.Headers.Append("Retry-After", "60");
            
            await context.Response.WriteAsync("Rate limit exceeded. Please try again later.");
            return;
        }

        await _next(context);
    }

    private string GetClientIdentifier(HttpContext context)
    {
        // Try to get client IP from various headers (for reverse proxy scenarios)
        var clientIp = context.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',').FirstOrDefault()?.Trim()
                      ?? context.Request.Headers["X-Real-IP"].FirstOrDefault()
                      ?? context.Connection.RemoteIpAddress?.ToString()
                      ?? "unknown";

        return clientIp;
    }

    private bool IsAuthEndpoint(PathString path)
    {
        return path.StartsWithSegments("/api/auth");
    }

    private bool IsRateLimited(string clientId, bool isAuthEndpoint)
    {
        var now = DateTime.UtcNow;
        var windowStart = now.AddMinutes(-_securitySettings.RateLimit.WindowSizeMinutes);
        
        var clientInfo = _clients.AddOrUpdate(clientId, 
            new ClientRequestInfo { Requests = new List<DateTime> { now } },
            (key, existing) =>
            {
                // Remove old requests outside the window
                existing.Requests.RemoveAll(r => r < windowStart);
                existing.Requests.Add(now);
                return existing;
            });

        var limit = isAuthEndpoint 
            ? _securitySettings.RateLimit.AuthEndpointsPerMinute 
            : _securitySettings.RateLimit.GeneralEndpointsPerMinute;

        return clientInfo.Requests.Count > limit;
    }

    // Clean up old entries periodically (this is a simple implementation)
    static RateLimitingMiddleware()
    {
        var timer = new Timer(CleanupOldEntries, null, TimeSpan.FromMinutes(5), TimeSpan.FromMinutes(5));
    }

    private static void CleanupOldEntries(object? state)
    {
        var cutoff = DateTime.UtcNow.AddMinutes(-10);
        var keysToRemove = new List<string>();

        foreach (var kvp in _clients)
        {
            kvp.Value.Requests.RemoveAll(r => r < cutoff);
            if (kvp.Value.Requests.Count == 0)
            {
                keysToRemove.Add(kvp.Key);
            }
        }

        foreach (var key in keysToRemove)
        {
            _clients.TryRemove(key, out _);
        }
    }
}

public class ClientRequestInfo
{
    public List<DateTime> Requests { get; set; } = new();
}