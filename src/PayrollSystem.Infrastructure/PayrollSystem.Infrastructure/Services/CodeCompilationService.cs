using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using PayrollSystem.Domain.Entities;
using PayrollSystem.Domain.Interfaces;
using PayrollSystem.Domain.Models;
using System.Collections.Concurrent;
using System.Runtime.Loader;

namespace PayrollSystem.Infrastructure.Services;

public class CodeCompilationService : ICodeCompilationService
{
    private readonly ConcurrentDictionary<string, IPayRuleClassifier> _loadedFunctions = new();
    private readonly ConcurrentDictionary<string, AssemblyLoadContext> _loadContexts = new();
    private readonly ConcurrentDictionary<string, bool> _loadedOrganizations = new();
    private readonly IPayRuleRepository _payRuleRepository;

    public CodeCompilationService(IPayRuleRepository payRuleRepository)
    {
        _payRuleRepository = payRuleRepository;
    }

    public async Task<CompilationResult> CompileCodeAsync(string code, string functionName)
    {
        var result = new CompilationResult();

        try
        {
            // Add required using statements if not present
            var fullCode = $@"
                                using System;
                                using System.Collections.Generic;
                                using System.Linq;
                                using PayrollSystem.Domain.Entities;
                                using PayrollSystem.Domain.Models;
                                using PayrollSystem.Domain.Interfaces;

                                namespace PayrollSystem.Generated
                                {{
                                    public class {functionName}Classifier : IPayRuleClassifier
                                    {{
                                        public string GetRuleName() => ""{functionName}"";
                                        public string GetRuleDescription() => ""{functionName} payroll rule"";

                                        {code}
                                    }}
                                }}";

            // Create compilation
            var syntaxTree = CSharpSyntaxTree.ParseText(fullCode);

            // Reference *all* loaded assemblies
            var references = AppDomain.CurrentDomain.GetAssemblies()
                .Where(a => !a.IsDynamic && !string.IsNullOrEmpty(a.Location))
                .Select(a => MetadataReference.CreateFromFile(a.Location))
                .ToList();

            // Add domain assembly reference
            var domainAssembly = AppDomain.CurrentDomain.GetAssemblies()
                .FirstOrDefault(a => a.GetName().Name?.Contains("PayrollSystem.Domain") == true);
            if (domainAssembly != null)
            {
                references.Add(MetadataReference.CreateFromFile(domainAssembly.Location));
            }

            var compilation = CSharpCompilation.Create(
                $"{functionName}Assembly",
                new[] { syntaxTree },
                references,
                new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary));

            using var ms = new MemoryStream();
            var compilationResult = compilation.Emit(ms);

            if (compilationResult.Success)
            {
                result.Success = true;
                result.CompiledAssembly = ms.ToArray();
            }
            else
            {
                result.Success = false;
                result.Errors = compilationResult.Diagnostics
                    .Where(d => d.Severity == DiagnosticSeverity.Error)
                    .Select(d => d.GetMessage())
                    .ToList();
                result.Warnings = compilationResult.Diagnostics
                    .Where(d => d.Severity == DiagnosticSeverity.Warning)
                    .Select(d => d.GetMessage())
                    .ToList();
            }
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.Errors.Add($"Compilation exception: {ex.Message}");
        }

        return await Task.FromResult(result);
    }
    public async Task<bool> LoadCompiledFunctionAsync(string functionName, byte[] compiledAssembly)
    {
        try
        {
            // Unload existing function if present
            await UnloadFunctionAsync(functionName);

            // Create new load context
            var loadContext = new AssemblyLoadContext($"{functionName}Context", isCollectible: true);
            _loadContexts[functionName] = loadContext;

            // Load assembly
            using var ms = new MemoryStream(compiledAssembly);
            var assembly = loadContext.LoadFromStream(ms);

            // Find and instantiate the classifier
            var classifierType = assembly.GetType($"PayrollSystem.Generated.{functionName}Classifier");
            if (classifierType != null)
            {
                var instance = Activator.CreateInstance(classifierType) as IPayRuleClassifier;
                if (instance != null)
                {
                    _loadedFunctions[functionName] = instance;
                    return true;
                }
            }

            return false;
        }
        catch (Exception)
        {
            return false;
        }
    }
    public async Task<IPayRuleClassifier?> GetLoadedFunctionAsync(string functionName)
    {
        _loadedFunctions.TryGetValue(functionName, out var function);
        return await Task.FromResult(function);
    }
    public async Task<IPayRuleClassifier?> CompileAndLoadTemporaryAsync(string code, string functionName)
    {
        try
        {
            // Compile the code
            var compilationResult = await CompileCodeAsync(code, functionName);
            if (!compilationResult.Success || compilationResult.CompiledAssembly == null)
            {
                return null;
            }

            // Create temporary load context (collectible)
            var loadContext = new AssemblyLoadContext($"{functionName}TempContext", isCollectible: true);

            // Load assembly temporarily
            using var ms = new MemoryStream(compilationResult.CompiledAssembly);
            var assembly = loadContext.LoadFromStream(ms);

            // Find and instantiate the classifier
            var classifierType = assembly.GetType($"PayrollSystem.Generated.{functionName}Classifier");
            if (classifierType != null)
            {
                var instance = Activator.CreateInstance(classifierType) as IPayRuleClassifier;
                
                // Important: Store the load context reference in the instance for cleanup
                // We'll use a wrapper that handles cleanup automatically
                if (instance != null)
                {
                    return new TemporaryPayRuleClassifier(instance, loadContext);
                }
            }

            // Cleanup on failure
            loadContext.Unload();
            return null;
        }
        catch (Exception)
        {
            return null;
        }
    }
    public async Task UnloadFunctionAsync(string functionName)
    {
        // Remove from loaded functions
        _loadedFunctions.TryRemove(functionName, out _);

        // Unload assembly context
        if (_loadContexts.TryRemove(functionName, out var context))
        {
            context.Unload();
        }

        await Task.CompletedTask;
    }

    public async Task<bool> PreloadOrganizationRulesAsync(string organizationId)
    {
        if (_loadedOrganizations.ContainsKey(organizationId))
        {
            return true; // Already loaded
        }

        try
        {
            // Get all active rules for the organization
            var activeRules = await _payRuleRepository.GetActiveRulesAsync(organizationId);
            
            var loadedCount = 0;
            var failedRules = new List<string>();

            foreach (var rule in activeRules)
            {
                try
                {
                    // Compile and load each rule
                    var compilationResult = await CompileCodeAsync(rule.GeneratedCode, rule.FunctionName);
                    if (compilationResult.Success && compilationResult.CompiledAssembly != null)
                    {
                        var loadSuccess = await LoadCompiledFunctionAsync(rule.FunctionName, compilationResult.CompiledAssembly);
                        if (loadSuccess)
                        {
                            loadedCount++;
                        }
                        else
                        {
                            failedRules.Add(rule.FunctionName);
                        }
                    }
                    else
                    {
                        failedRules.Add(rule.FunctionName);
                    }
                }
                catch (Exception ex)
                {
                    // Log individual rule failures but continue loading others
                    Console.WriteLine($"Failed to load rule {rule.FunctionName}: {ex.Message}");
                    failedRules.Add(rule.FunctionName);
                }
            }

            // Mark organization as loaded even if some rules failed
            // This prevents repeated loading attempts for the same organization
            _loadedOrganizations[organizationId] = true;
            
            // Consider it successful if at least some rules loaded
            // Or if there were no rules to load
            return loadedCount > 0 || activeRules.Count == 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to preload rules for organization {organizationId}: {ex.Message}");
            return false;
        }
    }

    public async Task<bool> IsOrganizationLoadedAsync(string organizationId)
    {
        return await Task.FromResult(_loadedOrganizations.ContainsKey(organizationId));
    }

    public async Task UnloadOrganizationRulesAsync(string organizationId)
    {
        if (!_loadedOrganizations.ContainsKey(organizationId))
        {
            return; // Not loaded
        }

        try
        {
            // Get all rules for the organization to unload them
            var activeRules = await _payRuleRepository.GetActiveRulesAsync(organizationId);
            
            foreach (var rule in activeRules)
            {
                await UnloadFunctionAsync(rule.FunctionName);
            }

            // Remove organization from loaded set
            _loadedOrganizations.TryRemove(organizationId, out _);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to unload rules for organization {organizationId}: {ex.Message}");
        }
    }
}

internal class TemporaryPayRuleClassifier : IPayRuleClassifier, IDisposable
{
    private readonly IPayRuleClassifier _innerClassifier;
    private readonly AssemblyLoadContext _loadContext;
    private bool _disposed = false;

    public TemporaryPayRuleClassifier(IPayRuleClassifier innerClassifier, AssemblyLoadContext loadContext)
    {
        _innerClassifier = innerClassifier;
        _loadContext = loadContext;
    }

    public ShiftClassificationResult CalculatePayroll(Shift shift)
    {
        if (_disposed)
            throw new ObjectDisposedException(nameof(TemporaryPayRuleClassifier));
        
        return _innerClassifier.CalculatePayroll(shift);
    }

    public string GetRuleName() => _innerClassifier.GetRuleName();
    public string GetRuleDescription() => _innerClassifier.GetRuleDescription();

    public void Dispose()
    {
        if (!_disposed)
        {
            _loadContext.Unload();
            _disposed = true;
        }
    }
}