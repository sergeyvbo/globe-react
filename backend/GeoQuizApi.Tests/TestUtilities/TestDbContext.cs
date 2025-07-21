using GeoQuizApi.Data;
using Microsoft.EntityFrameworkCore;

namespace GeoQuizApi.Tests.TestUtilities;

public static class TestDbContext
{
    public static GeoQuizDbContext CreateInMemoryContext(string? databaseName = null)
    {
        var options = new DbContextOptionsBuilder<GeoQuizDbContext>()
            .UseInMemoryDatabase(databaseName: databaseName ?? Guid.NewGuid().ToString())
            .Options;

        return new GeoQuizDbContext(options);
    }

    public static async Task<GeoQuizDbContext> CreateContextWithDataAsync()
    {
        var context = CreateInMemoryContext();
        await SeedTestDataAsync(context);
        return context;
    }

    private static async Task SeedTestDataAsync(GeoQuizDbContext context)
    {
        // Add any common test data here if needed
        await context.SaveChangesAsync();
    }
}