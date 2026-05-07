using Microsoft.EntityFrameworkCore;
using WeddingSong.Api.Models;

namespace WeddingSong.Api.Data;

public class WeddingDbContext(DbContextOptions<WeddingDbContext> options) : DbContext(options)
{
    public DbSet<Person> People => Set<Person>();
    public DbSet<Wedding> Weddings => Set<Wedding>();
    public DbSet<WeddingRoleAssignment> WeddingRoleAssignments => Set<WeddingRoleAssignment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Person>(e =>
        {
            e.ToTable("People");
            e.HasOne(p => p.Father).WithMany().HasForeignKey(p => p.FatherId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne(p => p.Mother).WithMany().HasForeignKey(p => p.MotherId).OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Wedding>(e =>
        {
            e.ToTable("Weddings");
            e.Property(w => w.GroomFamilyName).HasMaxLength(200);
            e.Property(w => w.BrideFamilyName).HasMaxLength(200);
            e.Property(w => w.Status).HasMaxLength(40);
        });

        modelBuilder.Entity<WeddingRoleAssignment>(e =>
        {
            e.ToTable("WeddingRoleAssignments");
            e.Property(a => a.RoleCode).HasConversion<byte>();
            e.Property(a => a.DisplayName).HasMaxLength(200);
            e.HasIndex(a => new { a.WeddingId, a.RoleCode }).IsUnique();
            e.HasOne(a => a.Wedding).WithMany(w => w.RoleAssignments).HasForeignKey(a => a.WeddingId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(a => a.Person).WithMany().HasForeignKey(a => a.PersonId).OnDelete(DeleteBehavior.NoAction);
        });
    }
}
