using System.Diagnostics;
using System.Text;

namespace GeoQuizApi.Middleware;

public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        var requestId = Guid.NewGuid().ToString("N")[..8];
        
        // Add request ID to context for correlation
        context.Items["RequestId"] = requestId;

        // Log request start
        await LogRequestAsync(context, requestId);

        // Skip response body interception for Scalar endpoints to avoid conflicts
        var path = context.Request.Path.Value?.ToLowerInvariant();
        var isScalarEndpoint = path?.StartsWith("/scalar") == true || path?.StartsWith("/openapi") == true;

        if (isScalarEndpoint)
        {
            // For Scalar endpoints, just pass through without intercepting response body
            try
            {
                await _next(context);
            }
            finally
            {
                stopwatch.Stop();
                LogSimpleResponse(context, requestId, stopwatch.ElapsedMilliseconds);
            }
        }
        else
        {
            // For API endpoints, intercept response body for error logging
            var originalBodyStream = context.Response.Body;
            using var responseBody = new MemoryStream();
            context.Response.Body = responseBody;

            try
            {
                await _next(context);
            }
            finally
            {
                stopwatch.Stop();
                
                // Log response
                await LogResponseAsync(context, requestId, stopwatch.ElapsedMilliseconds);
                
                // Copy response back to original stream
                await responseBody.CopyToAsync(originalBodyStream);
            }
        }
    }

    private async Task LogRequestAsync(HttpContext context, string requestId)
    {
        var request = context.Request;
        
        // Don't log sensitive information
        var shouldLogBody = ShouldLogRequestBody(request);
        string? requestBody = null;

        if (shouldLogBody && request.ContentLength > 0)
        {
            request.EnableBuffering();
            var buffer = new byte[Convert.ToInt32(request.ContentLength)];
            await request.Body.ReadExactlyAsync(buffer, 0, buffer.Length);
            requestBody = Encoding.UTF8.GetString(buffer);
            request.Body.Position = 0;

            // Mask sensitive data in request body
            requestBody = MaskSensitiveData(requestBody);
        }

        _logger.LogInformation(
            "HTTP {Method} {Path} started. RequestId: {RequestId}, UserAgent: {UserAgent}, RemoteIP: {RemoteIP}, ContentType: {ContentType}, ContentLength: {ContentLength}",
            request.Method,
            request.Path + request.QueryString,
            requestId,
            request.Headers.UserAgent.ToString(),
            GetClientIpAddress(context),
            request.ContentType,
            request.ContentLength);

        if (!string.IsNullOrEmpty(requestBody))
        {
            _logger.LogDebug("Request body for {RequestId}: {RequestBody}", requestId, requestBody);
        }
    }

    private async Task LogResponseAsync(HttpContext context, string requestId, long elapsedMs)
    {
        var response = context.Response;
        
        _logger.LogInformation(
            "HTTP {Method} {Path} completed. RequestId: {RequestId}, StatusCode: {StatusCode}, Duration: {Duration}ms, ContentType: {ContentType}, ContentLength: {ContentLength}",
            context.Request.Method,
            context.Request.Path + context.Request.QueryString,
            requestId,
            response.StatusCode,
            elapsedMs,
            response.ContentType,
            response.ContentLength);

        // Log response body for errors in development
        if (response.StatusCode >= 400)
        {
            response.Body.Seek(0, SeekOrigin.Begin);
            var responseBody = await new StreamReader(response.Body).ReadToEndAsync();
            response.Body.Seek(0, SeekOrigin.Begin);

            if (!string.IsNullOrEmpty(responseBody))
            {
                _logger.LogWarning("Error response for {RequestId}: {ResponseBody}", requestId, responseBody);
            }
        }
    }

    private static bool ShouldLogRequestBody(HttpRequest request)
    {
        // Don't log request body for certain endpoints or content types
        var path = request.Path.Value?.ToLowerInvariant() ?? string.Empty;
        
        // Skip logging for file uploads or large payloads
        if (request.ContentType?.Contains("multipart/form-data") == true ||
            request.ContentType?.Contains("application/octet-stream") == true ||
            request.ContentLength > 10240) // 10KB limit
        {
            return false;
        }

        // Skip logging for health check endpoints
        if (path.Contains("health") || path.Contains("ping"))
        {
            return false;
        }

        return request.ContentType?.Contains("application/json") == true ||
               request.ContentType?.Contains("application/x-www-form-urlencoded") == true;
    }

    private static string MaskSensitiveData(string requestBody)
    {
        if (string.IsNullOrEmpty(requestBody))
            return requestBody;

        // Mask password fields in JSON
        var sensitiveFields = new[] { "password", "currentPassword", "newPassword", "confirmPassword", "token", "refreshToken" };
        
        foreach (var field in sensitiveFields)
        {
            // Simple regex to mask JSON field values
            var pattern = $@"""({field}"":\s*"")[^""]*("")";
            requestBody = System.Text.RegularExpressions.Regex.Replace(
                requestBody, 
                pattern, 
                $"$1***MASKED***$2", 
                System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        }

        return requestBody;
    }

    private void LogSimpleResponse(HttpContext context, string requestId, long elapsedMs)
    {
        var response = context.Response;
        
        _logger.LogInformation(
            "HTTP {Method} {Path} completed. RequestId: {RequestId}, StatusCode: {StatusCode}, Duration: {Duration}ms, ContentType: {ContentType}, ContentLength: {ContentLength}",
            context.Request.Method,
            context.Request.Path + context.Request.QueryString,
            requestId,
            response.StatusCode,
            elapsedMs,
            response.ContentType,
            response.ContentLength);
    }

    private static string GetClientIpAddress(HttpContext context)
    {
        // Check for forwarded IP first (in case of proxy/load balancer)
        var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedFor))
        {
            return forwardedFor.Split(',')[0].Trim();
        }

        var realIp = context.Request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrEmpty(realIp))
        {
            return realIp;
        }

        return context.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
    }
}