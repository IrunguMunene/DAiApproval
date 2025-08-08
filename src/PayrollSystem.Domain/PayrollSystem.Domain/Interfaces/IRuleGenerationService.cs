using PayrollSystem.Domain.Entities;

namespace PayrollSystem.Domain.Interfaces;

public interface IRuleGenerationService
{
    Task<string> ExtractIntentAsync(string ruleStatement, string description);
    Task<string> ExtractIntentAsync(string ruleStatement, string description, DateTime exampleShiftStart, DateTime exampleShiftEnd, string expectedOutcome);
    Task<string> GenerateCodeAsync(string intent, string ruleStatement);
    Task<RuleGenerationRequest> CreateRuleAsync(string ruleStatement, string description, string createdBy);
    Task<RuleGenerationRequest> CreateRuleAsync(string ruleStatement, string description, string createdBy, DateTime exampleShiftStart, DateTime exampleShiftEnd, string expectedOutcome);
}