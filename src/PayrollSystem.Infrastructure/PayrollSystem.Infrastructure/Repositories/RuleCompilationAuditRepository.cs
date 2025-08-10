using Microsoft.EntityFrameworkCore;
using PayrollSystem.Domain.Entities;
using PayrollSystem.Domain.Interfaces;
using PayrollSystem.Infrastructure.Data;

namespace PayrollSystem.Infrastructure.Repositories;

public class RuleCompilationAuditRepository : BaseRepository<RuleCompilationAudit>, IRuleCompilationAuditRepository
{
    public RuleCompilationAuditRepository(PayrollDbContext context) : base(context)
    {
    }

    public async Task<List<RuleCompilationAudit>> GetByRuleIdAsync(Guid ruleId)
    {
        return await _dbSet
            .Where(a => a.RuleId == ruleId)
            .OrderByDescending(a => a.AttemptedAt)
            .ToListAsync();
    }
}