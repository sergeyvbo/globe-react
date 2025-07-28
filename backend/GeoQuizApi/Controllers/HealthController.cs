using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GeoQuizApi.Data;

namespace GeoQuizApi.Controllers;

/// <summary>
/// Health check controller for monitoring application status
/// </summary>
[ApiController]
[Route("[controller]")]
public class HealthController : ControllerBase
{
    private readonly GeoQuizDbContext _context;
    private readonly ILogger<HealthController> _logger;

    public HealthController(GeoQuizDbContext context, ILogger<HealthController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Basic health check endpoint
    /// </summary>
    /// <returns>Health status</returns>
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        // Check database connectivity
        await _context.Database.CanConnectAsync();
        
        var healthStatus = new
        {
            Status = "Healthy",
            Timestamp = DateTime.UtcNow,
            Version = "1.0.0",
            Environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Unknown"
        };

        return Ok(healthStatus);
    }

    /// <summary>
    /// Detailed health check with component status
    /// </summary>
    /// <returns>Detailed health status</returns>
    [HttpGet("detailed")]
    public async Task<IActionResult> GetDetailed()
    {
        var healthChecks = new Dictionary<string, object>();
        var overallStatus = "Healthy";

        // Database health check
        var dbStartTime = DateTime.UtcNow;
        var canConnect = await _context.Database.CanConnectAsync();
        var dbResponseTime = (DateTime.UtcNow - dbStartTime).TotalMilliseconds;
        
        healthChecks["Database"] = new
        {
            Status = canConnect ? "Healthy" : "Unhealthy",
            ResponseTime = $"{dbResponseTime:F2}ms"
        };

        if (!canConnect)
        {
            overallStatus = "Unhealthy";
        }

        // Memory usage check
        var workingSet = GC.GetTotalMemory(false);
        healthChecks["Memory"] = new
        {
            Status = "Healthy",
            WorkingSet = $"{workingSet / 1024 / 1024:F2} MB"
        };

        // Application uptime
        var processStartTime = Environment.TickCount64;
        var uptime = TimeSpan.FromMilliseconds(processStartTime);
        healthChecks["Uptime"] = new
        {
            Status = "Healthy",
            Duration = uptime.ToString(@"dd\.hh\:mm\:ss")
        };

        var response = new
        {
            Status = overallStatus,
            Timestamp = DateTime.UtcNow,
            Version = "1.0.0",
            Environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Unknown",
            Checks = healthChecks
        };

        return overallStatus == "Healthy" ? Ok(response) : StatusCode(503, response);
    }
}