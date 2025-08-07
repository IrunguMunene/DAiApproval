using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using PayrollSystem.Infrastructure.Data;

namespace PayrollSystem.Infrastructure.Services;

public interface IDatabaseInitializationService
{
    Task InitializeAsync();
}

public class DatabaseInitializationService : IDatabaseInitializationService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<DatabaseInitializationService> _logger;

    public DatabaseInitializationService(IServiceProvider serviceProvider, ILogger<DatabaseInitializationService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    public async Task InitializeAsync()
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<PayrollDbContext>();

            _logger.LogInformation("Starting database initialization...");

            // Ensure database is created
            var created = await context.Database.EnsureCreatedAsync();
            
            if (created)
            {
                _logger.LogInformation("Database created successfully.");
            }
            else
            {
                _logger.LogInformation("Database already exists.");
            }

            // Verify database connectivity
            await context.Database.CanConnectAsync();
            _logger.LogInformation("Database connectivity verified.");

            // Verify tables exist
            await VerifyTablesExist(context);

            _logger.LogInformation("Database initialization completed successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize database: {Message}", ex.Message);
            
            // Try to create a more informative error message
            if (ex.InnerException != null)
            {
                _logger.LogError(ex.InnerException, "Inner exception: {Message}", ex.InnerException.Message);
            }

            throw new InvalidOperationException(
                $"Failed to initialize database. This may be due to missing SQLite support on this system. " +
                $"Original error: {ex.Message}", ex);
        }
    }

    private async Task VerifyTablesExist(PayrollDbContext context)
    {
        try
        {
            // Test that we can query each table
            var payRulesCount = await context.PayRules.CountAsync();
            var ruleExecutionsCount = await context.RuleExecutions.CountAsync();
            var ruleGenerationRequestsCount = await context.RuleGenerationRequests.CountAsync();

            _logger.LogInformation("Database tables verified - PayRules: {PayRulesCount}, RuleExecutions: {RuleExecutionsCount}, RuleGenerationRequests: {RuleGenerationRequestsCount}",
                payRulesCount, ruleExecutionsCount, ruleGenerationRequestsCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to verify database tables: {Message}", ex.Message);
            throw;
        }
    }
}