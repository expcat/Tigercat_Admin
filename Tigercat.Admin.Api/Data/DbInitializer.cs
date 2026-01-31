using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Data.Entities;

namespace Tigercat.Admin.Api.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(AdminDbContext context, CancellationToken ct = default)
    {
        await context.Database.EnsureCreatedAsync(ct);

        // Skip seeding if users already exist
        if (await context.Users.AnyAsync(ct))
        {
            return;
        }

        // Seed default admin user as specified in ROADMAP.md
        var user = new UserEntity
        {
            Username = "admin",
            PasswordHash = PasswordHasher.Hash("admin123"),
            CreatedAt = DateTime.UtcNow
        };
        context.Users.Add(user);

        await context.SaveChangesAsync(ct);
    }
}
