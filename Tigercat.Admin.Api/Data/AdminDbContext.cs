using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Data.Entities;

namespace Tigercat.Admin.Api.Data;

public class AdminDbContext : DbContext
{
    public AdminDbContext(DbContextOptions<AdminDbContext> options) : base(options)
    {
    }

    public DbSet<UserEntity> Users => Set<UserEntity>();
    public DbSet<SessionEntity> Sessions => Set<SessionEntity>();
    public DbSet<RoleEntity> Roles => Set<RoleEntity>();
    public DbSet<PermissionEntity> Permissions => Set<PermissionEntity>();
    public DbSet<UserRoleEntity> UserRoles => Set<UserRoleEntity>();
    public DbSet<RolePermissionEntity> RolePermissions => Set<RolePermissionEntity>();
    public DbSet<SystemSettingEntity> SystemSettings => Set<SystemSettingEntity>();
    public DbSet<MediaResourceEntity> MediaResources => Set<MediaResourceEntity>();
    public DbSet<MediaReferenceEntity> MediaReferences => Set<MediaReferenceEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User
        modelBuilder.Entity<UserEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Username).IsUnique();
            entity.Property(e => e.Username).IsRequired().HasMaxLength(50);
            entity.Property(e => e.PasswordHash).IsRequired().HasMaxLength(128);
            entity.Property(e => e.DisplayName).HasMaxLength(100);
            entity.Property(e => e.Status).HasConversion<int>();
            entity.HasOne(e => e.AvatarMedia)
                .WithMany()
                .HasForeignKey(e => e.AvatarMediaId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Session
        modelBuilder.Entity<SessionEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Token).IsUnique();
            entity.Property(e => e.Token).IsRequired().HasMaxLength(64);
            entity.Property(e => e.Username).IsRequired().HasMaxLength(50);
        });

        // Role
        modelBuilder.Entity<RoleEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Name).IsUnique();
            entity.Property(e => e.Name).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Description).HasMaxLength(200);
        });

        // Permission
        modelBuilder.Entity<PermissionEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.Code).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(200);
        });

        // UserRole (many-to-many join table)
        modelBuilder.Entity<UserRoleEntity>(entity =>
        {
            entity.HasKey(e => new { e.UserId, e.RoleId });

            entity.HasOne(e => e.User)
                .WithMany(u => u.UserRoles)
                .HasForeignKey(e => e.UserId);

            entity.HasOne(e => e.Role)
                .WithMany(r => r.UserRoles)
                .HasForeignKey(e => e.RoleId);
        });

        // RolePermission (many-to-many join table)
        modelBuilder.Entity<RolePermissionEntity>(entity =>
        {
            entity.HasKey(e => new { e.RoleId, e.PermissionId });

            entity.HasOne(e => e.Role)
                .WithMany(r => r.RolePermissions)
                .HasForeignKey(e => e.RoleId);

            entity.HasOne(e => e.Permission)
                .WithMany(p => p.RolePermissions)
                .HasForeignKey(e => e.PermissionId);
        });

        // SystemSetting
        modelBuilder.Entity<SystemSettingEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Key).IsUnique();
            entity.Property(e => e.Key).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Value).IsRequired().HasMaxLength(2000);
            entity.Property(e => e.Description).HasMaxLength(500);
        });

        // MediaResource
        modelBuilder.Entity<MediaResourceEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.PublicId).IsUnique();
            entity.Property(e => e.PublicId).IsRequired().HasMaxLength(64);
            entity.Property(e => e.OriginalFileName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.StoredFileName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.ContentType).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Extension).HasMaxLength(20);
            entity.Property(e => e.UploadedBy).HasMaxLength(50);
        });

        // MediaReference
        modelBuilder.Entity<MediaReferenceEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.ReferenceType, e.ReferenceKey }).IsUnique();
            entity.Property(e => e.ReferenceType).IsRequired().HasMaxLength(50);
            entity.Property(e => e.ReferenceKey).IsRequired().HasMaxLength(100);
            entity.Property(e => e.DisplayName).HasMaxLength(200);

            entity.HasOne(e => e.MediaResource)
                .WithMany(m => m.References)
                .HasForeignKey(e => e.MediaResourceId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
