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
    
    // Enhanced error analysis for auto-fix
    public List<CompilationError> DetailedErrors { get; set; } = new();
    public bool IsAutoFixable { get; set; } = false;
    public string? GeneratedFullCode { get; set; } // For debugging
}

public class CompilationError
{
    public string Code { get; set; } = string.Empty; // Error code like CS0103
    public string Message { get; set; } = string.Empty;
    public int LineNumber { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty; // NameResolution, TypeConversion, etc.
    public bool AutoFixable { get; set; } = false;
}