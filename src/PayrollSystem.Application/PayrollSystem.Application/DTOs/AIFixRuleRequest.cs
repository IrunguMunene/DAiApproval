namespace PayrollSystem.Application.DTOs;

public class AIFixRuleRequest
{
    public string RuleId { get; set; } = string.Empty;
    public string GeneratedCode { get; set; } = string.Empty;
    public List<string> CompilationErrors { get; set; } = new();
    public string RuleDescription { get; set; } = string.Empty;
    public string Intent { get; set; } = string.Empty;
}