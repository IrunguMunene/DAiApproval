using Microsoft.EntityFrameworkCore;
using PayrollSystem.Domain.Entities;
using PayrollSystem.Domain.Interfaces;
using PayrollSystem.Infrastructure.Data;

namespace PayrollSystem.Infrastructure.Repositories;

public class PayRuleRepository : IPayRuleRepository
{
    private readonly PayrollDbContext _context;

    public PayRuleRepository(PayrollDbContext context)
    {
        _context = context;
    }

    public async Task<List<PayRule>> GetActiveRulesAsync(string organizationId)
    {
        return await _context.PayRules
            .Where(r => r.IsActive && r.OrganizationId == organizationId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
    }

    public async Task<PayRule?> GetByIdAsync(Guid id)
    {
        return await _context.PayRules.FindAsync(id);
    }

    public Task<PayRule> AddAsync(PayRule rule)
    {
        _context.PayRules.Add(rule);
        return Task.FromResult(rule);
    }

    public Task<PayRule> UpdateAsync(PayRule rule)
    {
        _context.PayRules.Update(rule);
        return Task.FromResult(rule);
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}

public class RuleExecutionRepository : IRuleExecutionRepository
{
    private readonly PayrollDbContext _context;

    public RuleExecutionRepository(PayrollDbContext context)
    {
        _context = context;
    }

    public Task<RuleExecution> AddAsync(RuleExecution execution)
    {
        _context.RuleExecutions.Add(execution);
        return Task.FromResult(execution);
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}

public class RuleGenerationRepository : IRuleGenerationRepository
{
    private readonly PayrollDbContext _context;

    public RuleGenerationRepository(PayrollDbContext context)
    {
        _context = context;
    }

    public async Task<List<RuleGenerationRequest>> GetByOrganizationAsync(string organizationId)
    {
        return await _context.RuleGenerationRequests
            .Where(r => r.OrganizationId == organizationId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
    }

    public async Task<RuleGenerationRequest?> GetByIdAsync(Guid id)
    {
        var ruleGenerationRequest = await _context.RuleGenerationRequests.FindAsync(id);
        return ruleGenerationRequest;
    }

    public Task<RuleGenerationRequest> AddAsync(RuleGenerationRequest request)
    {
        _context.RuleGenerationRequests.Add(request);
        return Task.FromResult(request);
    }

    public Task<RuleGenerationRequest> UpdateAsync(RuleGenerationRequest request)
    {
        _context.RuleGenerationRequests.Update(request);
        return Task.FromResult(request);
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}