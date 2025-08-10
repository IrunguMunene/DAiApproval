namespace PayrollSystem.Domain.Entities;

public class PayRule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string RuleStatement { get; set; } = string.Empty;
    public string RuleDescription { get; set; } = string.Empty;
    public string FunctionName { get; set; } = string.Empty;
    public string GeneratedCode { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int Version { get; set; } = 1;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastModified { get; set; } = DateTime.UtcNow;
    public string CreatedBy { get; set; } = string.Empty;
    public string LastModifiedBy { get; set; } = string.Empty;
    public string OrganizationId { get; set; } = string.Empty;
    public string? OriginalGeneratedCode { get; set; } = string.Empty; // Store original AI-generated code
}