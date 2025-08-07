namespace PayrollSystem.Application.DTOs;

public class RuleGenerationRequestDto
{
    public string RuleStatement { get; set; } = string.Empty;
    public string RuleDescription { get; set; } = string.Empty;
    public string OrganizationId { get; set; } = string.Empty;
}

public class RuleGenerationResponseDto
{
    public Guid Id { get; set; }
    public string RuleStatement { get; set; } = string.Empty;
    public string RuleDescription { get; set; } = string.Empty;
    public string Intent { get; set; } = string.Empty;
    public string GeneratedCode { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public List<string> CompilationErrors { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}