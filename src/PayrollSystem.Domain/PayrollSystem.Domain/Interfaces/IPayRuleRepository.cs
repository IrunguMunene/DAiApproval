using PayrollSystem.Domain.Entities;

namespace PayrollSystem.Domain.Interfaces;

public interface IPayRuleRepository : IOrganizationRepository<PayRule>
{
    Task<List<PayRule>> GetActiveRulesAsync(string organizationId);
    Task<List<PayRule>> GetAllRulesAsync(string organizationId);
}

public interface IRuleExecutionRepository : IBaseRepository<RuleExecution>
{
    // RuleExecution specific methods can be added here if needed
}

public interface IRuleGenerationRepository : IOrganizationRepository<RuleGenerationRequest>
{
    // RuleGenerationRequest specific methods can be added here if needed
}