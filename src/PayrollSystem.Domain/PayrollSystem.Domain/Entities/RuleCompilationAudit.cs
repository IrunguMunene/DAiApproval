namespace PayrollSystem.Domain.Entities;

public class RuleCompilationAudit
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RuleId { get; set; }
    public string AttemptedCode { get; set; } = string.Empty;
    public bool CompilationSuccess { get; set; }
    public List<string> CompilationErrors { get; set; } = new();
    public List<string> CompilationWarnings { get; set; } = new();
    public DateTime AttemptedAt { get; set; } = DateTime.UtcNow;
    public string AttemptedBy { get; set; } = string.Empty;
    public string AttemptType { get; set; } = string.Empty; // "Manual", "Auto", "AI-Generated"
    public int RuleVersionAttempted { get; set; }
    
    // Navigation property
    public PayRule? PayRule { get; set; }
}