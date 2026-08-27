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
    public DbSet<AdminNotificationEntity> AdminNotifications => Set<AdminNotificationEntity>();
    public DbSet<AdminTaskEntity> AdminTasks => Set<AdminTaskEntity>();
    public DbSet<TicketEntity> Tickets => Set<TicketEntity>();
    public DbSet<TicketMessageEntity> TicketMessages => Set<TicketMessageEntity>();
    public DbSet<ChatMessageEntity> ChatMessages => Set<ChatMessageEntity>();
    public DbSet<CommentEntity> Comments => Set<CommentEntity>();
    public DbSet<ProjectEntity> Projects => Set<ProjectEntity>();
    public DbSet<ProjectMemberEntity> ProjectMembers => Set<ProjectMemberEntity>();
    public DbSet<ProjectActivityEntity> ProjectActivities => Set<ProjectActivityEntity>();
    public DbSet<CalendarEventEntity> CalendarEvents => Set<CalendarEventEntity>();

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
            entity.Property(e => e.TwoFactorEnabled).HasDefaultValue(false);
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
            entity.Property(e => e.StorageProvider).HasMaxLength(50);
            entity.Property(e => e.StorageKey).HasMaxLength(500);
            entity.Property(e => e.ContentType).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Extension).HasMaxLength(20);
            entity.Property(e => e.Sha256Hash).HasMaxLength(64);
            entity.HasIndex(e => new { e.Sha256Hash, e.SizeBytes });
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

        // AdminNotification
        modelBuilder.Entity<AdminNotificationEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.PublicId).IsUnique();
            entity.HasIndex(e => new { e.GroupKey, e.Read, e.CreatedAt });
            entity.Property(e => e.PublicId).IsRequired().HasMaxLength(64);
            entity.Property(e => e.GroupKey).IsRequired().HasMaxLength(30);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(120);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(1000);
            entity.Property(e => e.ToastType).IsRequired().HasMaxLength(20);
            entity.Property(e => e.LinkUrl).HasMaxLength(500);
            entity.Property(e => e.MetadataJson).IsRequired().HasMaxLength(2000);
        });

        // AdminTask
        modelBuilder.Entity<AdminTaskEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.PublicId).IsUnique();
            entity.HasIndex(e => new { e.Status, e.DueAt });
            entity.Property(e => e.PublicId).IsRequired().HasMaxLength(64);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(120);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Assignee).IsRequired().HasMaxLength(80);
            entity.Property(e => e.Priority).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(20);
            entity.Property(e => e.BlockedReason).HasMaxLength(500);
            entity.Property(e => e.CompletionNote).HasMaxLength(500);
            entity.Property(e => e.CreatedBy).HasMaxLength(50);
        });

        modelBuilder.Entity<TicketEntity>(entity =>
        {
            entity.ToTable("Tickets");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.PublicId).IsUnique();
            entity.HasIndex(e => new { e.Status, e.UpdatedAt });
            entity.Property(e => e.PublicId).IsRequired().HasMaxLength(32);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(120);
            entity.Property(e => e.Requester).IsRequired().HasMaxLength(80);
            entity.Property(e => e.Category).IsRequired().HasMaxLength(40);
            entity.Property(e => e.Priority).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(2000);
            entity.HasMany(e => e.Messages)
                .WithOne(m => m.Ticket)
                .HasForeignKey(m => m.TicketId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TicketMessageEntity>(entity =>
        {
            entity.ToTable("TicketMessages");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.PublicId).IsUnique();
            entity.HasIndex(e => new { e.TicketId, e.CreatedAt });
            entity.Property(e => e.PublicId).IsRequired().HasMaxLength(64);
            entity.Property(e => e.Content).IsRequired().HasMaxLength(2000);
            entity.Property(e => e.Direction).IsRequired().HasMaxLength(20);
        });

        modelBuilder.Entity<ChatMessageEntity>(entity =>
        {
            entity.ToTable("ChatMessages");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.PublicId).IsUnique();
            entity.HasIndex(e => e.CreatedAt);
            entity.Property(e => e.PublicId).IsRequired().HasMaxLength(64);
            entity.Property(e => e.Content).IsRequired().HasMaxLength(2000);
            entity.Property(e => e.Direction).IsRequired().HasMaxLength(20);
        });

        modelBuilder.Entity<CommentEntity>(entity =>
        {
            entity.ToTable("Comments");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.PublicId).IsUnique();
            entity.HasIndex(e => new { e.TargetType, e.TargetId, e.CreatedAt });
            entity.Property(e => e.PublicId).IsRequired().HasMaxLength(64);
            entity.Property(e => e.TargetType).IsRequired().HasMaxLength(20);
            entity.Property(e => e.TargetId).IsRequired().HasMaxLength(64);
            entity.Property(e => e.Body).IsRequired().HasMaxLength(2000);
            entity.Property(e => e.UserName).IsRequired().HasMaxLength(80);
        });

        modelBuilder.Entity<ProjectEntity>(entity =>
        {
            entity.ToTable("Projects");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.PublicId).IsUnique();
            entity.HasIndex(e => e.Status);
            entity.Property(e => e.PublicId).IsRequired().HasMaxLength(32);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(120);
            entity.Property(e => e.Summary).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Owner).IsRequired().HasMaxLength(80);
            entity.Property(e => e.Department).IsRequired().HasMaxLength(80);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(20);
            entity.Property(e => e.StartAt).IsRequired().HasMaxLength(10);
            entity.Property(e => e.EndAt).IsRequired().HasMaxLength(10);
            entity.HasMany(e => e.Members)
                .WithOne(m => m.Project)
                .HasForeignKey(m => m.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(e => e.Activities)
                .WithOne(a => a.Project)
                .HasForeignKey(a => a.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProjectMemberEntity>(entity =>
        {
            entity.ToTable("ProjectMembers");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.ProjectId, e.PublicId }).IsUnique();
            entity.Property(e => e.PublicId).IsRequired().HasMaxLength(32);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(80);
            entity.Property(e => e.Role).IsRequired().HasMaxLength(40);
            entity.Property(e => e.Color).IsRequired().HasMaxLength(20);
        });

        modelBuilder.Entity<ProjectActivityEntity>(entity =>
        {
            entity.ToTable("ProjectActivities");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.ProjectId, e.PublicId }).IsUnique();
            entity.Property(e => e.PublicId).IsRequired().HasMaxLength(32);
            entity.Property(e => e.Label).IsRequired().HasMaxLength(80);
            entity.Property(e => e.Content).IsRequired().HasMaxLength(500);
            entity.Property(e => e.Color).IsRequired().HasMaxLength(20);
        });

        modelBuilder.Entity<CalendarEventEntity>(entity =>
        {
            entity.ToTable("CalendarEvents");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.PublicId).IsUnique();
            entity.HasIndex(e => new { e.Date, e.Start });
            entity.Property(e => e.PublicId).IsRequired().HasMaxLength(64);
            entity.Property(e => e.Date).IsRequired().HasMaxLength(10);
            entity.Property(e => e.Start).IsRequired().HasMaxLength(5);
            entity.Property(e => e.End).IsRequired().HasMaxLength(5);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(120);
            entity.Property(e => e.Type).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Location).IsRequired().HasMaxLength(200);
        });
    }
}
