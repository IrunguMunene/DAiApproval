using PayrollSystem.Domain.Models;

namespace PayrollSystem.Domain.Interfaces;

public interface ICodeCompilationService
{
    Task<CompilationResult> CompileCodeAsync(string code, string functionName);
    Task<bool> LoadCompiledFunctionAsync(string functionName, byte[] compiledAssembly);
    Task<IPayRuleClassifier?> GetLoadedFunctionAsync(string functionName);
    Task<IPayRuleClassifier?> CompileAndLoadTemporaryAsync(string code, string functionName);
    Task UnloadFunctionAsync(string functionName);
    
    // Organization-scoped rule management
    Task<bool> PreloadOrganizationRulesAsync(string organizationId);
    Task<bool> IsOrganizationLoadedAsync(string organizationId);
    Task UnloadOrganizationRulesAsync(string organizationId);
}

public class CompilationResult
{
    public bool Success { get; set; }
    public byte[]? CompiledAssembly { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
}