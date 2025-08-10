using Microsoft.EntityFrameworkCore;
using PayrollSystem.Domain.Entities;
using PayrollSystem.Domain.Interfaces;
using PayrollSystem.Infrastructure.Data;

namespace PayrollSystem.Infrastructure.Repositories;

public class PayRuleRepository : OrganizationBaseRepository<PayRule>, IPayRuleRepository
{
    public PayRuleRepository(PayrollDbContext context) : base(context)
    {
    }

    public async Task<List<PayRule>> GetActiveRulesAsync(string organizationId)
    {
        return await _dbSet
            .Where(r => r.IsActive && r.OrganizationId == organizationId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
    }

    public async Task<List<PayRule>> GetAllRulesAsync(string organizationId)
    {
        return await _dbSet
            .Where(r => r.OrganizationId == organizationId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
    }

    public override async Task<List<PayRule>> GetByOrganizationAsync(string organizationId)
    {
        return await GetAllRulesAsync(organizationId);
    }
}

public class RuleExecutionRepository : BaseRepository<RuleExecution>, IRuleExecutionRepository
{
    public RuleExecutionRepository(PayrollDbContext context) : base(context)
    {
    }
}

public class RuleGenerationRepository : OrganizationBaseRepository<RuleGenerationRequest>, IRuleGenerationRepository
{
    public RuleGenerationRepository(PayrollDbContext context) : base(context)
    {
    }

    public override async Task<List<RuleGenerationRequest>> GetByOrganizationAsync(string organizationId)
    {
        return await _dbSet
            .Where(r => r.OrganizationId == organizationId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
    }
}