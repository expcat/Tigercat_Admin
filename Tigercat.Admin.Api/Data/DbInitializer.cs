using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Data.Entities;

namespace Tigercat.Admin.Api.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(AdminDbContext context)
    {
        await context.Database.EnsureCreatedAsync();

        // Skip seeding if users already exist
        if (await context.Users.AnyAsync())
        {
            return;
        }

        var defaultUsers = new (string Username, string Password)[]
        {
            ("admin", "admin"),
            ("Admin", "Admin"),
            ("test", "test")
        };

        foreach (var (username, password) in defaultUsers)
        {
            var user = new UserEntity
            {
                Username = username,
                PasswordHash = PasswordHasher.Hash(password),
                CreatedAt = DateTime.UtcNow
            };
            context.Users.Add(user);
        }

        await context.SaveChangesAsync();
    }
}
