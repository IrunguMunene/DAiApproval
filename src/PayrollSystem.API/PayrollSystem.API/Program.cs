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

// Add Entity Framework
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Server=(localdb)\\mssqllocaldb;Database=PayrollSystemDb;Trusted_Connection=true;MultipleActiveResultSets=true";

builder.Services.AddDbContext<PayrollDbContext>(options =>
    options.UseSqlServer(connectionString));

// Add repositories
builder.Services.AddScoped<IPayRuleRepository, PayrollSystem.Infrastructure.Repositories.PayRuleRepository>();
builder.Services.AddScoped<IRuleExecutionRepository, PayrollSystem.Infrastructure.Repositories.RuleExecutionRepository>();
builder.Services.AddScoped<IRuleGenerationRepository, PayrollSystem.Infrastructure.Repositories.RuleGenerationRepository>();

// Add application services
builder.Services.AddScoped<IShiftClassificationService, ShiftClassificationService>();
builder.Services.AddScoped<IRuleManagementService, RuleManagementService>();
builder.Services.AddScoped<ICodeCompilationService, CodeCompilationService>();

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

// Create database if it doesn't exist
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<PayrollDbContext>();
    await context.Database.EnsureCreatedAsync();
}

app.Run();
