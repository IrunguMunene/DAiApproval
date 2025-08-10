using PayrollSystem.Domain.Entities;

namespace PayrollSystem.Domain.Interfaces;

public interface IRuleCompilationAuditRepository
{
    Task<RuleCompilationAudit> AddAsync(RuleCompilationAudit audit);
    Task<List<RuleCompilationAudit>> GetByRuleIdAsync(Guid ruleId);
    Task SaveChangesAsync();
}