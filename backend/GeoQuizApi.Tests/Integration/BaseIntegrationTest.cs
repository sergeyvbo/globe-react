using Microsoft.Extensions.DependencyInjection;
using GeoQuizApi.Data;

namespace GeoQuizApi.Tests.Integration;

public abstract class BaseIntegrationTest : IClassFixture<TestWebApplicationFactory<Program>>
{
    protected readonly TestWebApplicationFactory<Program> _factory;
    protected readonly HttpClient _client;

    protected BaseIntegrationTest(TestWebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
    }

    protected async Task ClearDatabaseAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<GeoQuizDbContext>();
        
        try
        {
            // Clear all tables in the correct order (respecting foreign key constraints)
            context.GameSessions.RemoveRange(context.GameSessions);
            context.RefreshTokens.RemoveRange(context.RefreshTokens);
            context.Users.RemoveRange(context.Users);
            
            await context.SaveChangesAsync();
            
            // Ensure the database is properly reset
            await context.Database.EnsureDeletedAsync();
            await context.Database.EnsureCreatedAsync();
        }
        catch (Exception ex)
        {
            // Log the exception but don't fail the test setup
            Console.WriteLine($"Warning: Failed to clear database: {ex.Message}");
            
            // Try to recreate the database
            try
            {
                await context.Database.EnsureDeletedAsync();
                await context.Database.EnsureCreatedAsync();
            }
            catch
            {
                // If all else fails, just continue - the in-memory database should handle this
            }
        }
    }
}