namespace PayrollSystem.Domain.Entities;

public class RuleGenerationRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string RuleDescription { get; set; } = string.Empty;
    public string Intent { get; set; } = string.Empty;
    public string GeneratedCode { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending"; // Pending, Generated, Compiled, Active, Failed
    public string? CompilationErrors { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string CreatedBy { get; set; } = string.Empty;
    public string OrganizationId { get; set; } = string.Empty;
}