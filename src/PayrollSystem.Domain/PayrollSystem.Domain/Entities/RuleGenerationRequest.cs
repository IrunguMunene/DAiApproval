namespace PayrollSystem.Domain.Entities;

public class RuleGenerationRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string RuleDescription { get; set; } = string.Empty;
    public string Intent { get; set; } = string.Empty;
    public string GeneratedCode { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending"; // Pending, Generated, Compiled, Active, Failed, AutoFixing, RequiresManualReview
    public string? CompilationErrors { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string CreatedBy { get; set; } = string.Empty;
    public string OrganizationId { get; set; } = string.Empty;
    
    // Auto-fix tracking fields
    public int GenerationAttemptCount { get; set; } = 1;
    public bool AutoFixAttempted { get; set; } = false;
    public string? OriginalGeneratedCode { get; set; } // Store original code before auto-fix
    public string? OriginalCompilationErrors { get; set; } // Store original errors that triggered auto-fix
    public DateTime? AutoFixAttemptedAt { get; set; }
    public bool RequiresManualReview { get; set; } = false;
    public string? AutoFixReason { get; set; } // Why auto-fix was triggered
    public DateTime LastModified { get; set; } = DateTime.UtcNow;
}