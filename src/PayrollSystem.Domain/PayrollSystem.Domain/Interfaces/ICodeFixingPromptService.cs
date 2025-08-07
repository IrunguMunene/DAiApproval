using PayrollSystem.Domain.Entities;

namespace PayrollSystem.Domain.Interfaces;

public interface ICodeFixingPromptService
{
    string GenerateCodeFixingPrompt(RuleGenerationRequest failedRequest, string compilationErrors);
    string AnalyzeCompilationErrors(string compilationErrors);
}