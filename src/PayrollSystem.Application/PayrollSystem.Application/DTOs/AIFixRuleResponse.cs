namespace PayrollSystem.Application.DTOs;

public class AIFixRuleResponse
{
    public bool Success { get; set; }
    public string? FixedCode { get; set; }
    public List<string>? RemainingErrors { get; set; }
    public string? Message { get; set; }
}