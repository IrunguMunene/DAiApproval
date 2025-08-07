using PayrollSystem.Application.DTOs;
using PayrollSystem.Domain.Models;

namespace PayrollSystem.Application.Services;

public interface IShiftClassificationService
{
    Task<ShiftClassificationResult> ClassifyShiftAsync(ShiftClassificationRequest request);
    Task<List<ShiftClassificationResult>> ClassifyBatchAsync(BatchShiftClassificationRequest request);
    Task<ShiftClassificationResult> TestRuleAsync(Guid ruleId, ShiftClassificationRequest shift);
    
    // New orchestration methods
    Task<RuleOrchestrationResult> TestAllRulesAsync(AllRulesTestRequest request);
    Task<List<RuleOrchestrationResult>> TestAllRulesBatchAsync(BatchAllRulesTestRequest request);
}