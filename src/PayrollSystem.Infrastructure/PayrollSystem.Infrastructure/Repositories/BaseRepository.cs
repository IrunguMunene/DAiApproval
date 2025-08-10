using Microsoft.EntityFrameworkCore;
using PayrollSystem.Domain.Interfaces;
using PayrollSystem.Infrastructure.Data;

namespace PayrollSystem.Infrastructure.Repositories;

/// <summary>
/// Base repository implementation providing common CRUD operations
/// </summary>
/// <typeparam name="T">Entity type</typeparam>
public abstract class BaseRepository<T> : IBaseRepository<T> where T : class
{
    protected readonly PayrollDbContext _context;
    protected readonly DbSet<T> _dbSet;

    protected BaseRepository(PayrollDbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    public virtual async Task<T?> GetByIdAsync(Guid id)
    {
        return await _dbSet.FindAsync(id);
    }

    public virtual Task<T> AddAsync(T entity)
    {
        _dbSet.Add(entity);
        return Task.FromResult(entity);
    }

    public virtual Task<T> UpdateAsync(T entity)
    {
        _dbSet.Update(entity);
        return Task.FromResult(entity);
    }

    public virtual async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}

/// <summary>
/// Base repository for entities that support organization-based queries
/// </summary>
/// <typeparam name="T">Entity type that has OrganizationId property</typeparam>
public abstract class OrganizationBaseRepository<T> : BaseRepository<T>, IOrganizationRepository<T> 
    where T : class
{
    protected OrganizationBaseRepository(PayrollDbContext context) : base(context)
    {
    }

    public abstract Task<List<T>> GetByOrganizationAsync(string organizationId);
}