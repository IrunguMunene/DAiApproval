using Microsoft.EntityFrameworkCore;
using PayrollSystem.Domain.Entities;
using PayrollSystem.Domain.Interfaces;
using PayrollSystem.Infrastructure.Data;

namespace PayrollSystem.Infrastructure.Repositories;

public class RuleCompilationAuditRepository : IRuleCompilationAuditRepository
{
    private readonly PayrollDbContext _context;

    public RuleCompilationAuditRepository(PayrollDbContext context)
    {
        _context = context;
    }

    public async Task<RuleCompilationAudit> AddAsync(RuleCompilationAudit audit)
    {
        var entry = await _context.RuleCompilationAudits.AddAsync(audit);
        return entry.Entity;
    }

    public async Task<List<RuleCompilationAudit>> GetByRuleIdAsync(Guid ruleId)
    {
        return await _context.RuleCompilationAudits
            .Where(a => a.RuleId == ruleId)
            .OrderByDescending(a => a.AttemptedAt)
            .ToListAsync();
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}