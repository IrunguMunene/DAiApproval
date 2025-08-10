using PayrollSystem.Domain.Entities;

namespace PayrollSystem.Domain.Interfaces;

public interface IRuleCompilationAuditRepository : IBaseRepository<RuleCompilationAudit>
{
    Task<List<RuleCompilationAudit>> GetByRuleIdAsync(Guid ruleId);
}