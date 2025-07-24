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
        
        // Clear all tables
        context.GameSessions.RemoveRange(context.GameSessions);
        context.RefreshTokens.RemoveRange(context.RefreshTokens);
        context.Users.RemoveRange(context.Users);
        
        await context.SaveChangesAsync();
    }
}