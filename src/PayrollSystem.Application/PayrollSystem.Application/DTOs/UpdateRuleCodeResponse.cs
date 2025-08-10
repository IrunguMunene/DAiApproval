using PayrollSystem.Domain.Entities;

namespace PayrollSystem.Application.DTOs;

public class UpdateRuleCodeResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public PayRule? UpdatedRule { get; set; }
    public List<string> CompilationErrors { get; set; } = new();
    public List<string> CompilationWarnings { get; set; } = new();
    public bool HasCompilationErrors => CompilationErrors.Any();
}