using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace GeoQuizApi.Middleware;

public class InputValidationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<InputValidationMiddleware> _logger;

    // Patterns for potentially malicious input
    private static readonly Regex[] MaliciousPatterns = new[]
    {
        new Regex(@"<script[^>]*>.*?</script>", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new Regex(@"javascript:", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new Regex(@"on\w+\s*=", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new Regex(@"<iframe[^>]*>.*?</iframe>", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new Regex(@"<object[^>]*>.*?</object>", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new Regex(@"<embed[^>]*>.*?</embed>", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new Regex(@"<link[^>]*>", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new Regex(@"<meta[^>]*>", RegexOptions.IgnoreCase | RegexOptions.Compiled)
    };

    public InputValidationMiddleware(RequestDelegate next, ILogger<InputValidationMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Only validate POST, PUT, PATCH requests with JSON content
        if (ShouldValidateRequest(context.Request))
        {
            var originalBody = context.Request.Body;
            
            try
            {
                context.Request.EnableBuffering();
                
                using var reader = new StreamReader(context.Request.Body, Encoding.UTF8, leaveOpen: true);
                var body = await reader.ReadToEndAsync();
                context.Request.Body.Position = 0;

                if (!string.IsNullOrEmpty(body) && ContainsMaliciousContent(body))
                {
                    _logger.LogWarning("Malicious input detected from {ClientIP} on {Path}: {Body}", 
                        GetClientIpAddress(context), context.Request.Path, body);
                    
                    context.Response.StatusCode = 400;
                    await context.Response.WriteAsync("Invalid input detected.");
                    return;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during input validation");
                // Continue processing if validation fails
            }
        }

        await _next(context);
    }

    private static bool ShouldValidateRequest(HttpRequest request)
    {
        var method = request.Method.ToUpperInvariant();
        var contentType = request.ContentType?.ToLowerInvariant();
        
        return (method == "POST" || method == "PUT" || method == "PATCH") &&
               (contentType?.Contains("application/json") == true || 
                contentType?.Contains("application/x-www-form-urlencoded") == true);
    }

    private static bool ContainsMaliciousContent(string input)
    {
        if (string.IsNullOrEmpty(input))
            return false;

        // Check for common XSS and injection patterns
        foreach (var pattern in MaliciousPatterns)
        {
            if (pattern.IsMatch(input))
                return true;
        }

        // Check for SQL injection patterns
        var sqlPatterns = new[]
        {
            "union select", "drop table", "delete from", "insert into",
            "update set", "exec ", "execute ", "sp_", "xp_"
        };

        var lowerInput = input.ToLowerInvariant();
        foreach (var pattern in sqlPatterns)
        {
            if (lowerInput.Contains(pattern))
                return true;
        }

        return false;
    }

    private static string GetClientIpAddress(HttpContext context)
    {
        return context.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',').FirstOrDefault()?.Trim()
               ?? context.Request.Headers["X-Real-IP"].FirstOrDefault()
               ?? context.Connection.RemoteIpAddress?.ToString()
               ?? "unknown";
    }
}