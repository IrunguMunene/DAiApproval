namespace PayrollSystem.Application.DTOs;

public class CompileRuleResponse
{
    public bool Success { get; set; }
    public List<string>? Errors { get; set; }
    public string? Message { get; set; }
}