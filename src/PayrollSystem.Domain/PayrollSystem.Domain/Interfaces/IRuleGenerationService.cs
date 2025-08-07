using PayrollSystem.Domain.Entities;

namespace PayrollSystem.Domain.Interfaces;

public interface IRuleGenerationService
{
    Task<string> ExtractIntentAsync(string ruleStatement, string description);
    Task<string> GenerateCodeAsync(string intent, string ruleStatement);
    Task<RuleGenerationRequest> CreateRuleAsync(string ruleStatement, string description, string createdBy);
}