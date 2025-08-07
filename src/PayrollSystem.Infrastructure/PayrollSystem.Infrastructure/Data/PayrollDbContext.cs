using Microsoft.EntityFrameworkCore;
using PayrollSystem.Domain.Entities;

namespace PayrollSystem.Infrastructure.Data;

public class PayrollDbContext : DbContext
{
    public PayrollDbContext(DbContextOptions<PayrollDbContext> options) : base(options)
    {
    }

    public DbSet<PayRule> PayRules { get; set; }
    public DbSet<RuleExecution> RuleExecutions { get; set; }
    public DbSet<RuleGenerationRequest> RuleGenerationRequests { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // PayRule configuration
        modelBuilder.Entity<PayRule>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.RuleStatement).HasMaxLength(500).IsRequired();
            entity.Property(e => e.RuleDescription).HasMaxLength(1000);
            entity.Property(e => e.FunctionName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.GeneratedCode).HasColumnType("NVARCHAR(MAX)");
            entity.Property(e => e.OrganizationId).HasMaxLength(50).IsRequired();
            entity.Property(e => e.CreatedBy).HasMaxLength(100);
            
            entity.HasIndex(e => e.OrganizationId);
            entity.HasIndex(e => new { e.FunctionName, e.IsActive });
        });

        // RuleExecution configuration
        modelBuilder.Entity<RuleExecution>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EmployeeName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.ResultJson).HasColumnType("NVARCHAR(MAX)");
            
            entity.HasOne(e => e.Rule)
                  .WithMany()
                  .HasForeignKey(e => e.RuleId)
                  .OnDelete(DeleteBehavior.Cascade);
                  
            entity.HasIndex(e => e.ExecutedAt);
            entity.HasIndex(e => e.RuleId);
        });

        // RuleGenerationRequest configuration
        modelBuilder.Entity<RuleGenerationRequest>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.RuleDescription).HasMaxLength(1000).IsRequired();
            entity.Property(e => e.Intent).HasColumnType("NVARCHAR(MAX)");
            entity.Property(e => e.GeneratedCode).HasColumnType("NVARCHAR(MAX)");
            entity.Property(e => e.Status).HasMaxLength(50).IsRequired();
            entity.Property(e => e.CompilationErrors).HasColumnType("NVARCHAR(MAX)");
            entity.Property(e => e.OrganizationId).HasMaxLength(50).IsRequired();
            entity.Property(e => e.CreatedBy).HasMaxLength(100);
            
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.OrganizationId);
        });
    }
}