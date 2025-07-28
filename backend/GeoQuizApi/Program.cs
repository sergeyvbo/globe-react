using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.Reflection;
using Serilog;
using Scalar.AspNetCore;
using GeoQuizApi.Data;
using GeoQuizApi.Configuration;
using GeoQuizApi.Services;
using GeoQuizApi.Middleware;
using GeoQuizApi.Models;
using Microsoft.OpenApi.Models.References;

var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel server options
builder.WebHost.ConfigureKestrel(options =>
{
    var securitySettings = builder.Configuration.GetSection(SecuritySettings.SectionName).Get<SecuritySettings>();
    if (securitySettings != null)
    {
        options.Limits.MaxRequestBodySize = securitySettings.MaxRequestSize;
        options.Limits.RequestHeadersTimeout = TimeSpan.FromSeconds(securitySettings.RequestTimeout);
    }
});

// Configure Serilog
builder.Host.UseSerilog((context, configuration) =>
    configuration.ReadFrom.Configuration(context.Configuration));

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Configure JSON serialization options
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.WriteIndented = false;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

// Configure OpenAPI with Scalar
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, context, cancellationToken) =>
    {
        document.Info = new()
        {
            Title = "GeoQuiz API",
            Version = "v1",
            Description = "Backend API for geographic quiz application with authentication, game statistics, and leaderboard support",
            Contact = new()
            {
                Name = "GeoQuiz Team",
                Email = "support@geoquiz.com"
            }
        };

        return Task.CompletedTask;
    });
});

// Add Entity Framework
builder.Services.AddDbContext<GeoQuizDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// Configure JWT Settings
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection(JwtSettings.SectionName));

// Configure CORS Settings
builder.Services.Configure<CorsSettings>(builder.Configuration.GetSection(CorsSettings.SectionName));

// Configure Security Settings
builder.Services.Configure<SecuritySettings>(builder.Configuration.GetSection(SecuritySettings.SectionName));

// Add JWT Services
builder.Services.AddScoped<IJwtService, JwtService>();

// Add Auth Services
builder.Services.AddScoped<IAuthService, AuthService>();

// Add Game Stats Services
builder.Services.AddScoped<IGameStatsService, GameStatsService>();

// Add Leaderboard Services
builder.Services.AddScoped<ILeaderboardService, LeaderboardService>();

// Add Memory Cache for leaderboard caching
builder.Services.AddMemoryCache();

// Configure ASP.NET Core ProblemDetails services
builder.Services.AddProblemDetails(options =>
{
    // Customize ProblemDetails with additional fields
    options.CustomizeProblemDetails = (context) =>
    {
        // Add timestamp and trace ID to all problem details
        context.ProblemDetails.Extensions["timestamp"] = DateTime.UtcNow;
        context.ProblemDetails.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
        
        // Set instance to the current request path
        context.ProblemDetails.Instance = context.HttpContext.Request.Path;
    };
});

// Register custom ProblemDetails service
builder.Services.AddScoped<ICustomProblemDetailsService, CustomProblemDetailsService>();

// Configure JWT Authentication
var jwtSettings = builder.Configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>();
if (jwtSettings == null)
{
    throw new InvalidOperationException("JWT settings are not configured properly");
}

// Validate required environment variables in production
if (builder.Environment.IsProduction())
{
    if (string.IsNullOrEmpty(jwtSettings.SecretKey) || jwtSettings.SecretKey.Contains("PLACEHOLDER"))
    {
        throw new InvalidOperationException("JWT SecretKey must be set via environment variable 'JwtSettings__SecretKey' in production");
    }
    
    var corsSettingsForValidation = builder.Configuration.GetSection(CorsSettings.SectionName).Get<CorsSettings>();
    if (corsSettingsForValidation?.AllowedOrigins?.Any(origin => origin.Contains("PLACEHOLDER")) == true)
    {
        throw new InvalidOperationException("CORS AllowedOrigins must be set via environment variable 'CorsSettings__AllowedOrigins__0' in production");
    }
}

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(jwtSettings.SecretKey)),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidateAudience = true,
        ValidAudience = jwtSettings.Audience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// Configure CORS
var corsSettings = builder.Configuration.GetSection(CorsSettings.SectionName).Get<CorsSettings>();
if (corsSettings == null)
{
    throw new InvalidOperationException("CORS settings are not configured properly");
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("GeoQuizCorsPolicy", policy =>
    {
        if (corsSettings.AllowedOrigins.Length > 0)
        {
            policy.WithOrigins(corsSettings.AllowedOrigins);
        }
        else
        {
            // In production, this should be restricted to specific domains
            policy.AllowAnyOrigin();
        }

        if (corsSettings.AllowedHeaders.Length > 0)
        {
            policy.WithHeaders(corsSettings.AllowedHeaders);
        }
        else
        {
            policy.AllowAnyHeader();
        }

        if (corsSettings.AllowedMethods.Length > 0)
        {
            policy.WithMethods(corsSettings.AllowedMethods);
        }
        else
        {
            policy.AllowAnyMethod();
        }

        if (corsSettings.AllowCredentials && corsSettings.AllowedOrigins.Length > 0)
        {
            policy.AllowCredentials();
        }
    });
});

var app = builder.Build();

// Get security settings for middleware configuration
var securitySettings = builder.Configuration.GetSection(SecuritySettings.SectionName).Get<SecuritySettings>();

// Apply migrations automatically on startup (skip for testing)
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<GeoQuizDbContext>();
    var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    
    // Skip migrations if configured (for testing with InMemory database)
    if (!configuration.GetValue<bool>("SkipMigrations"))
    {
        context.Database.Migrate();
    }
    else
    {
        // For InMemory database, ensure it's created
        context.Database.EnsureCreated();
    }
    
    // Seed database with test data in development
    if (app.Environment.IsDevelopment())
    {
        await DbSeeder.SeedAsync(context);
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

// Add Serilog request logging
app.UseSerilogRequestLogging();

// Add custom middleware
// Temporarily disabled RequestLoggingMiddleware to debug empty response issue
// app.UseMiddleware<RequestLoggingMiddleware>();
app.UseMiddleware<ErrorHandlingMiddleware>();

// Add security middleware conditionally based on settings
if (securitySettings?.EnableSecurityHeaders == true)
{
    app.UseMiddleware<SecurityHeadersMiddleware>();
}

if (securitySettings?.EnableRateLimiting == true)
{
    app.UseMiddleware<RateLimitingMiddleware>();
}

if (securitySettings?.EnableInputValidation == true)
{
    app.UseMiddleware<InputValidationMiddleware>();
}

// Configure HTTPS and HSTS for production
if (securitySettings?.EnforceHttps == true)
{
    app.UseHttpsRedirection();
}

if (securitySettings?.EnableHsts == true && !app.Environment.IsDevelopment())
{
    app.UseHsts();
}

// Add CORS middleware
app.UseCors("GeoQuizCorsPolicy");

// Add Authentication and Authorization middleware
app.UseAuthentication();
app.UseAuthorization();

// Map controllers
app.MapControllers();

app.Run();
