using PayrollSystem.Application.DTOs;
using PayrollSystem.Domain.Entities;
using PayrollSystem.Domain.Interfaces;
using PayrollSystem.Domain.Models;

namespace PayrollSystem.Application.Services;

public class ShiftClassificationService : IShiftClassificationService
{
    private readonly IPayRuleRepository _payRuleRepository;
    private readonly IRuleExecutionRepository _executionRepository;
    private readonly ICodeCompilationService _compilationService;

    public ShiftClassificationService(
        IPayRuleRepository payRuleRepository,
        IRuleExecutionRepository executionRepository,
        ICodeCompilationService compilationService)
    {
        _payRuleRepository = payRuleRepository;
        _executionRepository = executionRepository;
        _compilationService = compilationService;
    }

    public async Task<ShiftClassificationResult> ClassifyShiftAsync(ShiftClassificationRequest request)
    {
        var shift = new Shift
        {
            EmployeeName = request.EmployeeName,
            StartDateTime = request.StartDateTime,
            EndDateTime = request.EndDateTime,
            OrganizationId = request.OrganizationId
        };

        // Ensure organization rules are loaded
        await EnsureOrganizationRulesLoadedAsync(request.OrganizationId);

        // Get active rules for the organization
        var activeRules = await _payRuleRepository.GetActiveRulesAsync(request.OrganizationId);

        ShiftClassificationResult? result = null;

        // Try to apply rules in order
        foreach (var rule in activeRules)
        {
            var classifier = await _compilationService.GetLoadedFunctionAsync(rule.FunctionName);
            if (classifier != null)
            {
                try
                {
                    result = classifier.CalculatePayroll(shift);
                    
                    // Log the execution
                    await LogRuleExecutionAsync(rule.Id, shift, result);
                    break;
                }
                catch (Exception ex)
                {
                    // Log error and try next rule
                    Console.WriteLine($"Error executing rule {rule.FunctionName}: {ex.Message}");
                }
            }
        }

        // Fallback to default rule if no active rules worked
        if (result == null)
        {
            result = ApplyDefaultRule(shift);
        }

        return result;
    }

    public async Task<List<ShiftClassificationResult>> ClassifyBatchAsync(BatchShiftClassificationRequest request)
    {
        var results = new List<ShiftClassificationResult>();

        foreach (var shiftRequest in request.Shifts)
        {
            shiftRequest.OrganizationId = request.OrganizationId;
            var result = await ClassifyShiftAsync(shiftRequest);
            results.Add(result);
        }

        return results;
    }

    public async Task<ShiftClassificationResult> TestRuleAsync(Guid ruleId, ShiftClassificationRequest shiftRequest)
    {
        var rule = await _payRuleRepository.GetByIdAsync(ruleId);
        if (rule == null)
        {
            throw new ArgumentException("Rule not found", nameof(ruleId));
        }

        var shift = new Shift
        {
            EmployeeName = shiftRequest.EmployeeName,
            StartDateTime = shiftRequest.StartDateTime,
            EndDateTime = shiftRequest.EndDateTime,
            OrganizationId = shiftRequest.OrganizationId
        };

        // Try to get existing loaded function first (for active rules)
        var classifier = await _compilationService.GetLoadedFunctionAsync(rule.FunctionName);
        
        // If not loaded (e.g., after restart or inactive rule), compile temporarily
        if (classifier == null)
        {
            // Generate unique temporary function name to avoid conflicts
            var tempFunctionName = $"Test_{rule.FunctionName}_{Guid.NewGuid():N}";
            classifier = await _compilationService.CompileAndLoadTemporaryAsync(rule.GeneratedCode, tempFunctionName);
            
            if (classifier == null)
            {
                throw new InvalidOperationException("Failed to compile rule for testing. The rule may contain compilation errors.");
            }
        }

        try
        {
            var result = classifier.CalculatePayroll(shift);
            
            // Log the test execution (optional - helps with debugging)
            await LogRuleExecutionAsync(rule.Id, shift, result);
            
            return result;
        }
        finally
        {
            // Clean up temporary classifier if it's disposable
            if (classifier is IDisposable disposableClassifier)
            {
                disposableClassifier.Dispose();
            }
        }
    }

    public async Task<RuleOrchestrationResult> TestAllRulesAsync(AllRulesTestRequest request)
    {
        var shift = new Shift
        {
            EmployeeName = request.Shift.EmployeeName,
            StartDateTime = request.Shift.StartDateTime,
            EndDateTime = request.Shift.EndDateTime,
            OrganizationId = request.OrganizationId
        };

        // Ensure organization rules are loaded
        await EnsureOrganizationRulesLoadedAsync(request.OrganizationId);

        // Get all active rules for the organization
        var activeRules = await _payRuleRepository.GetActiveRulesAsync(request.OrganizationId);

        var orchestrationResult = new RuleOrchestrationResult
        {
            EmployeeName = shift.EmployeeName,
            ShiftStart = shift.StartDateTime,
            ShiftEnd = shift.EndDateTime,
            TotalShiftHours = shift.Duration.TotalHours
        };

        // Test each rule individually
        var individualResults = new List<RuleTestResult>();
        var validResults = new List<(PayRule Rule, ShiftClassificationResult Result)>();

        foreach (var rule in activeRules)
        {
            var testResult = new RuleTestResult
            {
                RuleId = rule.Id,
                RuleStatement = rule.RuleStatement,
                RuleDescription = rule.RuleDescription
            };

            try
            {
                var classifier = await _compilationService.GetLoadedFunctionAsync(rule.FunctionName);
                if (classifier != null)
                {
                    var result = classifier.CalculatePayroll(shift);
                    testResult.ExecutedSuccessfully = true;
                    testResult.Result = result;
                    validResults.Add((rule, result));

                    // Log individual rule execution
                    await LogRuleExecutionAsync(rule.Id, shift, result);
                }
                else
                {
                    testResult.ExecutedSuccessfully = false;
                    testResult.ErrorMessage = "Rule function not loaded";
                }
            }
            catch (Exception ex)
            {
                testResult.ExecutedSuccessfully = false;
                testResult.ErrorMessage = ex.Message;
            }

            individualResults.Add(testResult);
        }

        orchestrationResult.IndividualRuleResults = individualResults;

        // Orchestrate results and detect conflicts
        if (validResults.Any())
        {
            orchestrationResult.CombinedResult = OrchestateRuleResults(shift, validResults, out var conflicts);
            orchestrationResult.Conflicts = conflicts;
        }
        else
        {
            // Fallback to default rule if no rules worked
            orchestrationResult.CombinedResult = ApplyDefaultRule(shift);
        }

        return orchestrationResult;
    }

    public async Task<List<RuleOrchestrationResult>> TestAllRulesBatchAsync(BatchAllRulesTestRequest request)
    {
        var results = new List<RuleOrchestrationResult>();

        // Group shifts by employee and date for optimization
        var groupedShifts = request.Shifts
            .GroupBy(s => new { s.EmployeeName, Date = s.StartDateTime.Date })
            .ToList();

        foreach (var group in groupedShifts)
        {
            foreach (var shiftRequest in group)
            {
                var testRequest = new AllRulesTestRequest
                {
                    Shift = shiftRequest,
                    OrganizationId = request.OrganizationId
                };

                var result = await TestAllRulesAsync(testRequest);
                results.Add(result);
            }
        }

        return results;
    }

    private ShiftClassificationResult OrchestateRuleResults(
        Shift shift, 
        List<(PayRule Rule, ShiftClassificationResult Result)> ruleResults, 
        out List<RuleConflict> conflicts)
    {
        conflicts = new List<RuleConflict>();
        var combinedAllocations = new Dictionary<string, PayCodeAllocation>();
        var payCodeRuleMap = new Dictionary<string, List<(Guid RuleId, string RuleStatement, PayCodeAllocation Allocation)>>();

        // Collect all pay code allocations from all rules
        foreach (var (rule, result) in ruleResults)
        {
            foreach (var allocation in result.PayCodeAllocations)
            {
                var payCode = allocation.PayCodeName;
                
                if (!payCodeRuleMap.ContainsKey(payCode))
                {
                    payCodeRuleMap[payCode] = new List<(Guid, string, PayCodeAllocation)>();
                }

                payCodeRuleMap[payCode].Add((rule.Id, rule.RuleStatement, allocation));
            }
        }

        // Detect conflicts and orchestrate results
        foreach (var kvp in payCodeRuleMap)
        {
            var payCode = kvp.Key;
            var allocations = kvp.Value;

            if (allocations.Count > 1)
            {
                // Conflict detected - multiple rules affecting same pay code
                var conflict = new RuleConflict
                {
                    PayCodeName = payCode,
                    ConflictingRules = allocations.Select(a => new ConflictingRule
                    {
                        RuleId = a.RuleId,
                        RuleStatement = a.RuleStatement,
                        Hours = a.Allocation.Hours,
                        Description = a.Allocation.Description
                    }).ToList(),
                    Description = $"Multiple rules allocate hours to {payCode}: {string.Join(", ", allocations.Select(a => $"{a.Allocation.Hours}h"))}"
                };
                conflicts.Add(conflict);

                // For orchestration, use the rule with the most hours (or implement more sophisticated logic)
                var winningAllocation = allocations.OrderByDescending(a => a.Allocation.Hours).First().Allocation;
                combinedAllocations[payCode] = new PayCodeAllocation
                {
                    PayCodeName = winningAllocation.PayCodeName,
                    Hours = winningAllocation.Hours,
                    Description = $"{winningAllocation.Description} (resolved from {allocations.Count} conflicts)"
                };
            }
            else
            {
                // No conflict, use the allocation directly
                combinedAllocations[payCode] = allocations.First().Allocation;
            }
        }

        return new ShiftClassificationResult
        {
            EmployeeName = shift.EmployeeName,
            ShiftStart = shift.StartDateTime,
            ShiftEnd = shift.EndDateTime,
            PayCodeAllocations = combinedAllocations.Values.ToList()
        };
    }

    private async Task LogRuleExecutionAsync(Guid ruleId, Shift shift, ShiftClassificationResult result)
    {
        var execution = new RuleExecution
        {
            RuleId = ruleId,
            EmployeeName = shift.EmployeeName,
            ShiftStart = shift.StartDateTime,
            ShiftEnd = shift.EndDateTime,
            ResultJson = System.Text.Json.JsonSerializer.Serialize(result)
        };

        await _executionRepository.AddAsync(execution);
        await _executionRepository.SaveChangesAsync();
    }

    private async Task EnsureOrganizationRulesLoadedAsync(string organizationId)
    {
        // Check if organization rules are already loaded
        var isLoaded = await _compilationService.IsOrganizationLoadedAsync(organizationId);
        if (!isLoaded)
        {
            // Preload all rules for this organization
            await _compilationService.PreloadOrganizationRulesAsync(organizationId);
        }
    }

    private static ShiftClassificationResult ApplyDefaultRule(Shift shift)
    {
        var totalHours = shift.Duration.TotalHours;
        
        return new ShiftClassificationResult
        {
            EmployeeName = shift.EmployeeName,
            ShiftStart = shift.StartDateTime,
            ShiftEnd = shift.EndDateTime,
            PayCodeAllocations = new List<PayCodeAllocation>
            {
                new PayCodeAllocation
                {
                    PayCodeName = "Regular",
                    Hours = totalHours,
                    Description = "Regular working hours (default rule)"
                }
            }
        };
    }
}