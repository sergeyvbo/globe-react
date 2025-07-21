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
using Microsoft.OpenApi.Models.References;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
builder.Host.UseSerilog((context, configuration) =>
    configuration.ReadFrom.Configuration(context.Configuration));

// Add services to the container.
builder.Services.AddControllers();

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

// Apply migrations automatically on startup
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<GeoQuizDbContext>();
    context.Database.Migrate();
    
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
app.UseMiddleware<RequestLoggingMiddleware>();
app.UseMiddleware<ErrorHandlingMiddleware>();

// Add security middleware
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<RateLimitingMiddleware>();
app.UseMiddleware<InputValidationMiddleware>();

// Configure HTTPS and HSTS for production
var securitySettings = builder.Configuration.GetSection(SecuritySettings.SectionName).Get<SecuritySettings>();
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
