using GeoQuizApi.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace GeoQuizApi.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(GeoQuizDbContext context)
    {
        // Ensure database is created
        await context.Database.EnsureCreatedAsync();

        // Check if we already have data
        if (await context.Users.AnyAsync())
        {
            return; // Database has been seeded
        }

        // Create test users for development
        var testUsers = new List<User>
        {
            new User
            {
                Id = Guid.NewGuid(),
                Email = "test@example.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
                Name = "Test User",
                Provider = "email",
                CreatedAt = DateTime.UtcNow
            },
            new User
            {
                Id = Guid.NewGuid(),
                Email = "admin@example.com", 
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                Name = "Admin User",
                Provider = "email",
                CreatedAt = DateTime.UtcNow
            }
        };

        await context.Users.AddRangeAsync(testUsers);
        await context.SaveChangesAsync();

        // Create some test game sessions
        var testSessions = new List<GameSession>
        {
            new GameSession
            {
                Id = Guid.NewGuid(),
                UserId = testUsers[0].Id,
                GameType = "countries",
                CorrectAnswers = 8,
                WrongAnswers = 2,
                SessionStartTime = DateTime.UtcNow.AddHours(-1),
                SessionEndTime = DateTime.UtcNow.AddMinutes(-30),
                SessionDurationMs = 1800000, // 30 minutes
                CreatedAt = DateTime.UtcNow.AddHours(-1)
            },
            new GameSession
            {
                Id = Guid.NewGuid(),
                UserId = testUsers[1].Id,
                GameType = "flags",
                CorrectAnswers = 15,
                WrongAnswers = 5,
                SessionStartTime = DateTime.UtcNow.AddHours(-2),
                SessionEndTime = DateTime.UtcNow.AddHours(-1).AddMinutes(-45),
                SessionDurationMs = 900000, // 15 minutes
                CreatedAt = DateTime.UtcNow.AddHours(-2)
            }
        };

        await context.GameSessions.AddRangeAsync(testSessions);
        await context.SaveChangesAsync();
    }
}