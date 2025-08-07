using PayrollSystem.Domain.Entities;

namespace PayrollSystem.Domain.Interfaces;

public interface IPayRuleRepository
{
    Task<List<PayRule>> GetActiveRulesAsync(string organizationId);
    Task<PayRule?> GetByIdAsync(Guid id);
    Task<PayRule> AddAsync(PayRule rule);
    Task<PayRule> UpdateAsync(PayRule rule);
    Task SaveChangesAsync();
}

public interface IRuleExecutionRepository
{
    Task<RuleExecution> AddAsync(RuleExecution execution);
    Task SaveChangesAsync();
}

public interface IRuleGenerationRepository
{
    Task<List<RuleGenerationRequest>> GetByOrganizationAsync(string organizationId);
    Task<RuleGenerationRequest?> GetByIdAsync(Guid id);
    Task<RuleGenerationRequest> AddAsync(RuleGenerationRequest request);
    Task<RuleGenerationRequest> UpdateAsync(RuleGenerationRequest request);
    Task SaveChangesAsync();
}