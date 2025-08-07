namespace PayrollSystem.Application.DTOs;

public class CompileRuleRequest
{
    public string RuleId { get; set; } = string.Empty;
    public string GeneratedCode { get; set; } = string.Empty;
    public string RuleDescription { get; set; } = string.Empty;
}