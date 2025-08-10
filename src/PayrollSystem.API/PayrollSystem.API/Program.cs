using Microsoft.EntityFrameworkCore;
using PayrollSystem.Application.Services;
using PayrollSystem.Domain.Interfaces;
using PayrollSystem.Infrastructure.Data;
using PayrollSystem.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();

// Add Entity Framework with SQLite
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Data Source=PayrollSystem.db";

builder.Services.AddDbContext<PayrollDbContext>(options =>
    options.UseSqlite(connectionString));

// Add repositories
builder.Services.AddScoped<IPayRuleRepository, PayrollSystem.Infrastructure.Repositories.PayRuleRepository>();
builder.Services.AddScoped<IRuleExecutionRepository, PayrollSystem.Infrastructure.Repositories.RuleExecutionRepository>();
builder.Services.AddScoped<IRuleGenerationRepository, PayrollSystem.Infrastructure.Repositories.RuleGenerationRepository>();
builder.Services.AddScoped<IRuleCompilationAuditRepository, PayrollSystem.Infrastructure.Repositories.RuleCompilationAuditRepository>();

// Add application services
builder.Services.AddScoped<IShiftClassificationService, ShiftClassificationService>();
builder.Services.AddScoped<IRuleManagementService, RuleManagementService>();
builder.Services.AddScoped<ICodeCompilationService, CodeCompilationService>();
builder.Services.AddScoped<PayrollSystem.Infrastructure.Services.IDatabaseInitializationService, PayrollSystem.Infrastructure.Services.DatabaseInitializationService>();
builder.Services.AddScoped<ICodeFixingPromptService, PayrollSystem.Infrastructure.Services.CodeFixingPromptService>();

// Add Ollama service
builder.Services.AddOllamaService(builder.Configuration);

// Add CORS for frontend
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/openapi/v1.json", "Payroll System API V1");
    });
}

app.UseCors();
app.UseHttpsRedirection();
app.MapControllers();

// Initialize database with enhanced error handling
try
{
    using var scope = app.Services.CreateScope();
    var dbInitService = scope.ServiceProvider.GetRequiredService<PayrollSystem.Infrastructure.Services.IDatabaseInitializationService>();
    await dbInitService.InitializeAsync();
}
catch (Exception ex)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogCritical(ex, "Failed to initialize database. Application cannot start.");
    
    // Print user-friendly error message
    Console.WriteLine("\n=== DATABASE INITIALIZATION FAILED ===");
    Console.WriteLine("Error: " + ex.Message);
    Console.WriteLine("\nThis application requires SQLite support.");
    Console.WriteLine("Please ensure you have the latest .NET runtime installed.");
    Console.WriteLine("If the problem persists, check the logs for more details.\n");
    
    throw;
}

app.Run();
