namespace PayrollSystem.Domain.Interfaces;

/// <summary>
/// Base repository interface providing common CRUD operations
/// </summary>
/// <typeparam name="T">Entity type</typeparam>
public interface IBaseRepository<T> where T : class
{
    Task<T?> GetByIdAsync(Guid id);
    Task<T> AddAsync(T entity);
    Task<T> UpdateAsync(T entity);
    Task SaveChangesAsync();
}

/// <summary>
/// Extended repository interface for entities that support organization-based queries
/// </summary>
/// <typeparam name="T">Entity type</typeparam>
public interface IOrganizationRepository<T> : IBaseRepository<T> where T : class
{
    Task<List<T>> GetByOrganizationAsync(string organizationId);
}