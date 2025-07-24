using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using GeoQuizApi.Data;

namespace GeoQuizApi.Tests.Integration;

public class TestWebApplicationFactory<TStartup> : WebApplicationFactory<TStartup> where TStartup : class
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        
        // Configure the app to skip migrations and disable rate limiting for testing
        builder.ConfigureAppConfiguration((context, config) =>
        {
            config.AddInMemoryCollection(new[]
            {
                new KeyValuePair<string, string?>("SkipMigrations", "true"),
                new KeyValuePair<string, string?>("SecuritySettings:EnableRateLimiting", "false")
            });
        });

        builder.ConfigureServices(services =>
        {
            // Remove DbContext services using RemoveAll
            services.RemoveAll<DbContextOptions<GeoQuizDbContext>>();
            services.RemoveAll<DbContextOptions>();
            services.RemoveAll<GeoQuizDbContext>();
            
            // Remove any generic DbContextOptions
            var genericDbContextOptions = services.Where(s => 
                s.ServiceType.IsGenericType && 
                s.ServiceType.GetGenericTypeDefinition() == typeof(DbContextOptions<>))
                .ToList();
            
            foreach (var service in genericDbContextOptions)
            {
                services.Remove(service);
            }

            // Remove any services that might contain SQLite or EntityFramework references
            var efRelatedServices = services.Where(s =>
                s.ServiceType.FullName?.Contains("Sqlite") == true ||
                s.ServiceType.FullName?.Contains("EntityFramework") == true ||
                s.ImplementationType?.FullName?.Contains("Sqlite") == true ||
                s.ImplementationType?.FullName?.Contains("EntityFramework") == true ||
                s.ImplementationType?.Assembly?.FullName?.Contains("Sqlite") == true ||
                s.ImplementationType?.Assembly?.FullName?.Contains("EntityFramework") == true
            ).ToList();

            foreach (var service in efRelatedServices)
            {
                services.Remove(service);
            }

            // Add in-memory database for testing - use a unique name per test class to avoid conflicts
            var databaseName = $"TestDb_{typeof(TStartup).Name}_{Guid.NewGuid()}";
            services.AddDbContext<GeoQuizDbContext>(options =>
            {
                options.UseInMemoryDatabase(databaseName: databaseName)
                    .LogTo(Console.WriteLine, LogLevel.Information);
                options.EnableSensitiveDataLogging();
            });

            // Reduce logging noise during tests
            services.AddLogging(loggingBuilder =>
            {
                loggingBuilder.SetMinimumLevel(LogLevel.Warning);
                loggingBuilder.AddFilter("Microsoft.EntityFrameworkCore", LogLevel.Warning);
            });
        });
    }
}