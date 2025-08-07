using PayrollSystem.Application.DTOs;
using PayrollSystem.Domain.Entities;

namespace PayrollSystem.Application.Services;

public interface IRuleManagementService
{
    Task<RuleGenerationResponseDto> GenerateRuleAsync(RuleGenerationRequestDto request, string createdBy);
    Task<bool> ActivateRuleAsync(Guid ruleId);
    Task<bool> DeactivateRuleAsync(Guid ruleId);
    Task<List<PayRule>> GetActiveRulesAsync(string organizationId);
    Task<List<RuleGenerationResponseDto>> GetRuleGenerationRequestsAsync(string organizationId);
    Task<PayRule?> GetRuleByIdAsync(Guid ruleId);
    Task<List<RuleGenerationResponseDto>> GetRulesWithCompilationErrorsAsync(string organizationId);
    Task<bool> RegenerateFailedRuleAsync(Guid ruleId);
}