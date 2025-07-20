using Microsoft.EntityFrameworkCore;
using GeoQuizApi.Models.Entities;

namespace GeoQuizApi.Data;

public class GeoQuizDbContext : DbContext
{
    public GeoQuizDbContext(DbContextOptions<GeoQuizDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<GameSession> GameSessions { get; set; }
    public DbSet<RefreshToken> RefreshTokens { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User entity configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(100);
            entity.Property(e => e.Avatar).HasMaxLength(500);
            entity.Property(e => e.Provider).IsRequired().HasMaxLength(50).HasDefaultValue("email");
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.PreferencesJson).HasColumnType("TEXT");
        });

        // GameSession entity configuration
        modelBuilder.Entity<GameSession>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.GameType);
            entity.HasIndex(e => e.CreatedAt);
            entity.Property(e => e.GameType).IsRequired().HasMaxLength(50);
            entity.Property(e => e.CorrectAnswers).IsRequired();
            entity.Property(e => e.WrongAnswers).IsRequired();
            entity.Property(e => e.SessionStartTime).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();

            // Foreign key relationship
            entity.HasOne(e => e.User)
                  .WithMany(u => u.GameSessions)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // RefreshToken entity configuration
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Token).IsUnique();
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.ExpiresAt);
            entity.Property(e => e.Token).IsRequired().HasMaxLength(500);
            entity.Property(e => e.ExpiresAt).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.IsRevoked).IsRequired().HasDefaultValue(false);

            // Foreign key relationship
            entity.HasOne(e => e.User)
                  .WithMany(u => u.RefreshTokens)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}