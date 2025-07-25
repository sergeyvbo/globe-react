using GeoQuizApi.Data;
using Microsoft.EntityFrameworkCore;

namespace GeoQuizApi.Tests.TestUtilities;

public static class TestDbContext
{
    public static GeoQuizDbContext CreateSqliteContext(string? databaseName = null)
    {
        var dbName = databaseName ?? Guid.NewGuid().ToString();
        var options = new DbContextOptionsBuilder<GeoQuizDbContext>()
            .UseSqlite($"Data Source={dbName}.db")
            .Options;

        var context = new GeoQuizDbContext(options);
        context.Database.EnsureCreated();
        return context;
    }

    public static async Task<GeoQuizDbContext> CreateContextWithDataAsync()
    {
        var context = CreateSqliteContext();
        await SeedTestDataAsync(context);
        return context;
    }

    private static async Task SeedTestDataAsync(GeoQuizDbContext context)
    {
        // Add any common test data here if needed
        await context.SaveChangesAsync();
    }
}