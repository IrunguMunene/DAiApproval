using PayrollSystem.Application.DTOs;
using PayrollSystem.Domain.Entities;
using PayrollSystem.Domain.Models;

namespace PayrollSystem.Application.Services;

public interface IRuleManagementService
{
    Task<RuleGenerationResponseDto> ExtractIntentAsync(RuleGenerationRequestDto request, string createdBy);
    Task<RuleGenerationResponseDto> GenerateCodeAsync(Guid ruleId, string reviewedIntent);
    Task<RuleGenerationResponseDto> GenerateRuleAsync(RuleGenerationRequestDto request, string createdBy);
    Task<bool> ActivateRuleAsync(Guid ruleId);
    Task<bool> DeactivateRuleAsync(Guid ruleId);
    Task<List<PayRule>> GetActiveRulesAsync(string organizationId);
    Task<List<PayRule>> GetAllRulesAsync(string organizationId);
    Task<List<RuleGenerationResponseDto>> GetRuleGenerationRequestsAsync(string organizationId);
    Task<PayRule?> GetRuleByIdAsync(Guid ruleId);
    Task<List<RuleGenerationResponseDto>> GetRulesWithCompilationErrorsAsync(string organizationId);
    Task<bool> RegenerateFailedRuleAsync(Guid ruleId);
    Task<UpdateRuleCodeResponse> UpdateRuleCodeAsync(Guid ruleId, UpdateRuleCodeRequest request);
    Task<VectorSearchResult> SearchSimilarRulesAsync(string ruleText, string organizationId);
}