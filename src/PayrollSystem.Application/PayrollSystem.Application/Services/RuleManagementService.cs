using PayrollSystem.Application.DTOs;
using PayrollSystem.Domain.Entities;
using PayrollSystem.Domain.Interfaces;
using PayrollSystem.Domain.Models;

namespace PayrollSystem.Application.Services;

public class RuleManagementService : IRuleManagementService
{
    private readonly IRuleGenerationRepository _generationRepository;
    private readonly IPayRuleRepository _payRuleRepository;
    private readonly IRuleGenerationService _ruleGenerationService;
    private readonly ICodeCompilationService _compilationService;
    private readonly ICodeFixingPromptService _codeFixingPromptService;
    private readonly IRuleCompilationAuditRepository _auditRepository;
    private readonly IVectorSimilarityService _vectorSimilarityService;

    public RuleManagementService(
        IRuleGenerationRepository generationRepository,
        IPayRuleRepository payRuleRepository,
        IRuleGenerationService ruleGenerationService,
        ICodeCompilationService compilationService,
        ICodeFixingPromptService codeFixingPromptService,
        IRuleCompilationAuditRepository auditRepository,
        IVectorSimilarityService vectorSimilarityService)
    {
        _generationRepository = generationRepository;
        _payRuleRepository = payRuleRepository;
        _ruleGenerationService = ruleGenerationService;
        _compilationService = compilationService;
        _codeFixingPromptService = codeFixingPromptService;
        _auditRepository = auditRepository;
        _vectorSimilarityService = vectorSimilarityService;
    }

    public async Task<RuleGenerationResponseDto> ExtractIntentAsync(RuleGenerationRequestDto request, string createdBy)
    {
        // Create initial rule generation request with only intent extraction
        RuleGenerationRequest generationRequest;
        
        if (request.ExampleShiftStart != default && request.ExampleShiftEnd != default && !string.IsNullOrEmpty(request.ExpectedOutcome))
        {
            // Extract intent with example
            var intent = await _ruleGenerationService.ExtractIntentAsync(
                request.RuleStatement, 
                request.RuleDescription, 
                request.ExampleShiftStart, 
                request.ExampleShiftEnd, 
                request.ExpectedOutcome);

            generationRequest = new RuleGenerationRequest
            {
                RuleStatement = request.RuleStatement,
                RuleDescription = request.RuleDescription,
                OrganizationId = request.OrganizationId,
                CreatedBy = createdBy,
                Intent = intent,
                Status = "IntentExtracted",
                ExampleShiftStart = request.ExampleShiftStart,
                ExampleShiftEnd = request.ExampleShiftEnd,
                ExpectedOutcome = request.ExpectedOutcome
            };
        }
        else
        {
            // Extract intent without example
            var intent = await _ruleGenerationService.ExtractIntentAsync(request.RuleStatement, request.RuleDescription);

            generationRequest = new RuleGenerationRequest
            {
                RuleStatement = request.RuleStatement,
                RuleDescription = request.RuleDescription,
                OrganizationId = request.OrganizationId,
                CreatedBy = createdBy,
                Intent = intent,
                Status = "IntentExtracted"
            };
        }

        // Save to database
        await _generationRepository.AddAsync(generationRequest);
        await _generationRepository.SaveChangesAsync();

        return new RuleGenerationResponseDto
        {
            Id = generationRequest.Id,
            RuleStatement = request.RuleStatement,
            RuleDescription = request.RuleDescription,
            Intent = generationRequest.Intent,
            GeneratedCode = generationRequest.GeneratedCode,
            Status = generationRequest.Status,
            CompilationErrors = new List<string>(),
            CreatedAt = generationRequest.CreatedAt,
            CreatedBy = createdBy
        };
    }

    public async Task<RuleGenerationResponseDto> GenerateCodeAsync(Guid ruleId, string reviewedIntent)
    {
        var generationRequest = await _generationRepository.GetByIdAsync(ruleId);
        if (generationRequest == null)
        {
            throw new ArgumentException("Rule generation request not found", nameof(ruleId));
        }

        if (generationRequest.Status != "IntentExtracted")
        {
            throw new InvalidOperationException("Rule must be in 'IntentExtracted' status to generate code");
        }

        try
        {
            // Update the intent with user's reviewed version
            generationRequest.Intent = reviewedIntent;
            generationRequest.Status = "GeneratingCode";
            generationRequest.LastModified = DateTime.UtcNow;
            await _generationRepository.UpdateAsync(generationRequest);
            await _generationRepository.SaveChangesAsync();

            // Generate code using the reviewed intent
            var code = await _ruleGenerationService.GenerateCodeAsync(reviewedIntent, generationRequest.RuleStatement);
            
            generationRequest.GeneratedCode = code;
            generationRequest.Status = "CodeGenerated";
            generationRequest.LastModified = DateTime.UtcNow;
            
            await _generationRepository.UpdateAsync(generationRequest);
            await _generationRepository.SaveChangesAsync();

            return ConvertToDto(generationRequest);
        }
        catch (Exception ex)
        {
            generationRequest.Status = "CodeGenerationFailed";
            generationRequest.CompilationErrors = ex.Message;
            generationRequest.LastModified = DateTime.UtcNow;
            await _generationRepository.UpdateAsync(generationRequest);
            await _generationRepository.SaveChangesAsync();
            throw;
        }
    }

    public async Task<RuleGenerationResponseDto> GenerateRuleAsync(RuleGenerationRequestDto request, string createdBy)
    {
        // Generate the rule using AI service with example data if provided
        RuleGenerationRequest generationRequest;
        
        if (request.ExampleShiftStart != default && request.ExampleShiftEnd != default && !string.IsNullOrEmpty(request.ExpectedOutcome))
        {
            // Use enhanced rule generation with example
            generationRequest = await _ruleGenerationService.CreateRuleAsync(
                request.RuleStatement, 
                request.RuleDescription, 
                createdBy,
                request.ExampleShiftStart,
                request.ExampleShiftEnd,
                request.ExpectedOutcome);
        }
        else
        {
            // Fall back to original method
            generationRequest = await _ruleGenerationService.CreateRuleAsync(
                request.RuleStatement, 
                request.RuleDescription, 
                createdBy);
        }

        generationRequest.OrganizationId = request.OrganizationId;

        // Save to database
        await _generationRepository.AddAsync(generationRequest);
        await _generationRepository.SaveChangesAsync();

        return new RuleGenerationResponseDto
        {
            Id = generationRequest.Id,
            RuleStatement = request.RuleStatement,
            RuleDescription = request.RuleDescription,
            Intent = generationRequest.Intent,
            GeneratedCode = generationRequest.GeneratedCode,
            Status = generationRequest.Status,
            CompilationErrors = string.IsNullOrEmpty(generationRequest.CompilationErrors) 
                ? new List<string>() 
                : generationRequest.CompilationErrors.Split(new[] { "; " }, StringSplitOptions.RemoveEmptyEntries).ToList(),
            CreatedAt = generationRequest.CreatedAt
        };
    }

    public async Task<bool> ActivateRuleAsync(Guid ruleId)
    {
        var generationRequest = await _generationRepository.GetByIdAsync(ruleId);
        // Rule must exist and have generated code to be activated
        if (generationRequest == null)
        {
            throw new ArgumentException($"Rule with ID {ruleId} not found");
        }
        
        if (string.IsNullOrEmpty(generationRequest.GeneratedCode))
        {
            throw new InvalidOperationException($"Rule {ruleId} does not have generated code. Current status: {generationRequest.Status}");
        }

        // Rule must have completed code generation (supports both old and new workflow)
        var validStatuses = new[] { "CodeGenerated", "Generated", "Complete" };
        if (!validStatuses.Contains(generationRequest.Status))
        {
            throw new InvalidOperationException($"Rule {ruleId} cannot be activated. Current status: {generationRequest.Status}. Expected one of: {string.Join(", ", validStatuses)}");
        }

        try
        {
            // Generate function name (replace hyphens with underscores to make valid C# identifier)
            var functionName = $"Rule_{ruleId:N}".Replace("-", "_");

            // Compile the code
            var compilationResult = await _compilationService.CompileCodeAsync(
                generationRequest.GeneratedCode, 
                functionName);

            if (!compilationResult.Success)
            {
                // Check if we should attempt auto-fix
                if (compilationResult.IsAutoFixable && !generationRequest.AutoFixAttempted && generationRequest.GenerationAttemptCount == 1)
                {
                    generationRequest.Status = "AutoFixing";
                    generationRequest.LastModified = DateTime.UtcNow;
                    await _generationRepository.UpdateAsync(generationRequest);
                    await _generationRepository.SaveChangesAsync();

                    // Attempt auto-fix
                    var autoFixResult = await AttemptAutoFixAsync(generationRequest, compilationResult.Errors);
                    return autoFixResult;
                }
                else
                {
                    // Set status based on auto-fix history
                    if (generationRequest.AutoFixAttempted)
                    {
                        generationRequest.Status = "RequiresManualReview";
                        generationRequest.RequiresManualReview = true;
                        generationRequest.AutoFixReason = "Auto-fix attempted but compilation still failed";
                    }
                    else
                    {
                        generationRequest.Status = "CompilationFailed";
                    }

                    generationRequest.CompilationErrors = string.Join("; ", compilationResult.Errors);
                    generationRequest.LastModified = DateTime.UtcNow;
                    await _generationRepository.UpdateAsync(generationRequest);
                    await _generationRepository.SaveChangesAsync();
                    return false;
                }
            }

            // Load the compiled function
            var loadSuccess = await _compilationService.LoadCompiledFunctionAsync(
                functionName, 
                compilationResult.CompiledAssembly!);

            if (!loadSuccess)
            {
                generationRequest.Status = "LoadFailed";
                await _generationRepository.UpdateAsync(generationRequest);
                await _generationRepository.SaveChangesAsync();
                return false;
            }

            // Check if PayRule already exists (might be inactive)
            var existingPayRule = await _payRuleRepository.GetByIdAsync(generationRequest.Id);
            
            if (existingPayRule != null)
            {
                // Update existing PayRule to active
                existingPayRule.IsActive = true;
                existingPayRule.FunctionName = functionName;
                existingPayRule.GeneratedCode = generationRequest.GeneratedCode;
                existingPayRule.LastModified = DateTime.UtcNow;
                await _payRuleRepository.UpdateAsync(existingPayRule);
            }
            else
            {
                // Create new PayRule entity
                var payRule = new PayRule
                {
                    Id = generationRequest.Id, // Use the same ID as the generation request
                    RuleStatement = generationRequest.RuleDescription.Split(" - ")[0],
                    RuleDescription = generationRequest.RuleDescription,
                    FunctionName = functionName,
                    GeneratedCode = generationRequest.GeneratedCode,
                    OrganizationId = generationRequest.OrganizationId,
                    CreatedBy = generationRequest.CreatedBy,
                    IsActive = true
                };

                await _payRuleRepository.AddAsync(payRule);
            }
            generationRequest.Status = "Active";
            await _generationRepository.UpdateAsync(generationRequest);
            
            await _payRuleRepository.SaveChangesAsync();
            await _generationRepository.SaveChangesAsync();
            
            // Store rule vector for similarity search (if enabled)
            var finalPayRule = existingPayRule ?? await _payRuleRepository.GetByIdAsync(generationRequest.Id);
            if (finalPayRule != null)
            {
                await StoreRuleVectorAsync(finalPayRule, generationRequest);
            }
            
            return true;
        }
        catch (Exception ex)
        {
            generationRequest.Status = "ActivationFailed";
            generationRequest.CompilationErrors = ex.Message;
            await _generationRepository.UpdateAsync(generationRequest);
            await _generationRepository.SaveChangesAsync();
            
            // Log the error for debugging
            Console.WriteLine($"Rule activation failed: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            
            return false;
        }
    }

    public async Task<bool> DeactivateRuleAsync(Guid ruleId)
    {
        var rule = await _payRuleRepository.GetByIdAsync(ruleId);
        if (rule == null)
        {
            return false;
        }

        rule.IsActive = false;
        await _compilationService.UnloadFunctionAsync(rule.FunctionName);
        await _payRuleRepository.UpdateAsync(rule);
        await _payRuleRepository.SaveChangesAsync();
        
        return true;
    }

    public async Task<List<PayRule>> GetActiveRulesAsync(string organizationId)
    {
        return await _payRuleRepository.GetActiveRulesAsync(organizationId);
    }

    public async Task<List<PayRule>> GetAllRulesAsync(string organizationId)
    {
        return await _payRuleRepository.GetAllRulesAsync(organizationId);
    }

    public async Task<List<RuleGenerationResponseDto>> GetRuleGenerationRequestsAsync(string organizationId)
    {
        var requests = await _generationRepository.GetByOrganizationAsync(organizationId);
        return requests.Select(ConvertToDto).ToList();
    }

    public async Task<PayRule?> GetRuleByIdAsync(Guid ruleId)
    {
        return await _payRuleRepository.GetByIdAsync(ruleId);
    }

    public async Task<List<RuleGenerationResponseDto>> GetRulesWithCompilationErrorsAsync(string organizationId)
    {
        var allRequests = await _generationRepository.GetByOrganizationAsync(organizationId);
        var requestsWithErrors = allRequests.Where(r => r.Status == "CompilationFailed" || r.Status == "ActivationFailed" || !string.IsNullOrEmpty(r.CompilationErrors));
        return requestsWithErrors.Select(ConvertToDto).ToList();
    }

    private RuleGenerationResponseDto ConvertToDto(RuleGenerationRequest generationRequest)
    {
        return new RuleGenerationResponseDto
        {
            Id = generationRequest.Id,
            RuleStatement = generationRequest.RuleDescription, // Use RuleDescription as RuleStatement
            RuleDescription = generationRequest.RuleDescription,
            Intent = generationRequest.Intent,
            GeneratedCode = generationRequest.GeneratedCode,
            Status = generationRequest.Status,
            CompilationErrors = string.IsNullOrEmpty(generationRequest.CompilationErrors) 
                ? new List<string>() 
                : generationRequest.CompilationErrors.Split(new[] { "; " }, StringSplitOptions.RemoveEmptyEntries).ToList(),
            CreatedAt = generationRequest.CreatedAt,
            CreatedBy = generationRequest.CreatedBy,
            GenerationAttemptCount = generationRequest.GenerationAttemptCount,
            AutoFixAttempted = generationRequest.AutoFixAttempted,
            OriginalGeneratedCode = generationRequest.OriginalGeneratedCode,
            OriginalCompilationErrors = generationRequest.OriginalCompilationErrors,
            AutoFixAttemptedAt = generationRequest.AutoFixAttemptedAt,
            RequiresManualReview = generationRequest.RequiresManualReview,
            AutoFixReason = generationRequest.AutoFixReason,
            LastModified = generationRequest.LastModified
        };
    }

    private async Task<bool> AttemptAutoFixAsync(RuleGenerationRequest generationRequest, List<string> compilationErrors)
    {
        try
        {
            // Store original code and errors
            generationRequest.OriginalGeneratedCode = generationRequest.GeneratedCode;
            generationRequest.OriginalCompilationErrors = string.Join("; ", compilationErrors);
            generationRequest.AutoFixAttemptedAt = DateTime.UtcNow;
            generationRequest.AutoFixAttempted = true;
            generationRequest.GenerationAttemptCount++;
            generationRequest.AutoFixReason = $"Compilation failed with {compilationErrors.Count} error(s): " + 
                                              string.Join(", ", compilationErrors.Take(3));

            // Generate fixing prompt
            var fixingPrompt = _codeFixingPromptService.GenerateCodeFixingPrompt(
                generationRequest, 
                string.Join("\n", compilationErrors));

            // Request code fix from LLM using the code fixing prompt
            // Since the GenerateCodeAsync method expects intent and ruleStatement, we'll pass the prompt as intent
            var fixedCodeResponse = await _ruleGenerationService.GenerateCodeAsync(fixingPrompt, generationRequest.RuleDescription);
            
            if (string.IsNullOrWhiteSpace(fixedCodeResponse))
            {
                generationRequest.Status = "RequiresManualReview";
                generationRequest.RequiresManualReview = true;
                generationRequest.AutoFixReason += " - LLM failed to generate fixed code";
                generationRequest.LastModified = DateTime.UtcNow;
                await _generationRepository.UpdateAsync(generationRequest);
                await _generationRepository.SaveChangesAsync();
                return false;
            }

            // Clean and extract the C# code from LLM response
            var cleanedCode = ExtractCSharpCode(fixedCodeResponse);
            generationRequest.GeneratedCode = cleanedCode;
            generationRequest.Status = "CodeGenerated";
            generationRequest.LastModified = DateTime.UtcNow;

            await _generationRepository.UpdateAsync(generationRequest);
            await _generationRepository.SaveChangesAsync();

            // Try to compile the fixed code by recursively calling ActivateRuleAsync
            // This will handle the next compilation attempt and potentially mark for manual review if it fails again
            return await ActivateRuleAsync(generationRequest.Id);
        }
        catch (Exception ex)
        {
            generationRequest.Status = "RequiresManualReview";
            generationRequest.RequiresManualReview = true;
            generationRequest.AutoFixReason = $"Auto-fix failed with exception: {ex.Message}";
            generationRequest.CompilationErrors = $"Auto-fix exception: {ex.Message}";
            generationRequest.LastModified = DateTime.UtcNow;
            
            await _generationRepository.UpdateAsync(generationRequest);
            await _generationRepository.SaveChangesAsync();
            return false;
        }
    }

    private string ExtractCSharpCode(string llmResponse)
    {
        // Remove markdown code block markers if present
        var response = llmResponse.Trim();
        
        // Remove ```csharp and ``` markers
        if (response.StartsWith("```csharp"))
        {
            response = response.Substring(9);
        }
        else if (response.StartsWith("```"))
        {
            response = response.Substring(3);
        }
        
        if (response.EndsWith("```"))
        {
            response = response.Substring(0, response.Length - 3);
        }

        // Clean up extra whitespace
        response = response.Trim();

        // Ensure we have a complete method
        if (!response.Contains("public static ShiftClassificationResult CalculatePayroll"))
        {
            throw new InvalidOperationException("LLM response does not contain the required method signature");
        }

        return response;
    }

    public async Task<bool> RegenerateFailedRuleAsync(Guid ruleId)
    {
        var generationRequest = await _generationRepository.GetByIdAsync(ruleId);
        if (generationRequest == null)
        {
            return false;
        }

        try
        {
            // Reset the rule for regeneration
            generationRequest.Status = "Pending";
            generationRequest.AutoFixAttempted = false;
            generationRequest.RequiresManualReview = false;
            generationRequest.GenerationAttemptCount = 1;
            generationRequest.AutoFixReason = null;
            generationRequest.CompilationErrors = null;
            generationRequest.LastModified = DateTime.UtcNow;

            // Generate new rule code
            var newGenerationRequest = await _ruleGenerationService.CreateRuleAsync(
                generationRequest.RuleDescription.Split(" - ")[0], // Extract rule statement
                generationRequest.RuleDescription,
                generationRequest.CreatedBy);

            // Update with new generated code
            generationRequest.GeneratedCode = newGenerationRequest.GeneratedCode;
            generationRequest.Intent = newGenerationRequest.Intent;
            generationRequest.Status = newGenerationRequest.Status;

            await _generationRepository.UpdateAsync(generationRequest);
            await _generationRepository.SaveChangesAsync();

            return true;
        }
        catch (Exception ex)
        {
            generationRequest.Status = "RegenerationFailed";
            generationRequest.CompilationErrors = $"Regeneration failed: {ex.Message}";
            generationRequest.LastModified = DateTime.UtcNow;
            await _generationRepository.UpdateAsync(generationRequest);
            await _generationRepository.SaveChangesAsync();
            return false;
        }
    }

    public async Task<UpdateRuleCodeResponse> UpdateRuleCodeAsync(Guid ruleId, UpdateRuleCodeRequest request)
    {
        // First check if it's an active rule in PayRules table
        var rule = await _payRuleRepository.GetByIdAsync(ruleId);
        
        // If not found in PayRules, check if it's a generation request with compilation errors
        var generationRequest = rule == null ? await _generationRepository.GetByIdAsync(ruleId) : null;
        
        if (rule == null && generationRequest == null)
        {
            return new UpdateRuleCodeResponse
            {
                Success = false,
                Message = $"Rule with ID {ruleId} not found in active rules or generation requests"
            };
        }

        // Handle updates to generation requests (rules with compilation errors)
        if (rule == null && generationRequest != null)
        {
            return await UpdateGenerationRequestCodeAsync(generationRequest, request);
        }

        // Create audit record for the attempt
        var auditRecord = new RuleCompilationAudit
        {
            RuleId = ruleId,
            AttemptedCode = request.UpdatedCode,
            AttemptedBy = request.ModifiedBy,
            AttemptType = "Manual",
            RuleVersionAttempted = rule.Version
        };

        try
        {
            // Compile the updated code
            var compilationResult = await _compilationService.CompileCodeAsync(request.UpdatedCode, rule.FunctionName);
            
            // Update audit record with compilation results
            auditRecord.CompilationSuccess = compilationResult.Success;
            auditRecord.CompilationErrors = compilationResult.Errors;
            auditRecord.CompilationWarnings = compilationResult.Warnings;
            
            await _auditRepository.AddAsync(auditRecord);
            await _auditRepository.SaveChangesAsync();

            if (!compilationResult.Success)
            {
                return new UpdateRuleCodeResponse
                {
                    Success = false,
                    Message = "Code compilation failed",
                    CompilationErrors = compilationResult.Errors,
                    CompilationWarnings = compilationResult.Warnings
                };
            }

            // Store original code if this is the first manual edit
            if (string.IsNullOrEmpty(rule.OriginalGeneratedCode))
            {
                rule.OriginalGeneratedCode = rule.GeneratedCode;
            }

            // Update rule with new code and increment version
            rule.GeneratedCode = request.UpdatedCode;
            rule.Version += 1;
            rule.LastModified = DateTime.UtcNow;
            rule.LastModifiedBy = request.ModifiedBy;

            // If rule is active, reload the compiled function
            if (rule.IsActive)
            {
                var loadSuccess = await _compilationService.LoadCompiledFunctionAsync(rule.FunctionName, compilationResult.CompiledAssembly!);
                if (!loadSuccess)
                {
                    return new UpdateRuleCodeResponse
                    {
                        Success = false,
                        Message = "Code compiled successfully but failed to load the function"
                    };
                }
            }

            await _payRuleRepository.UpdateAsync(rule);
            await _payRuleRepository.SaveChangesAsync();

            return new UpdateRuleCodeResponse
            {
                Success = true,
                Message = $"Rule code updated successfully. New version: {rule.Version}",
                UpdatedRule = rule,
                CompilationWarnings = compilationResult.Warnings
            };
        }
        catch (Exception ex)
        {
            // Update audit record with exception
            auditRecord.CompilationSuccess = false;
            auditRecord.CompilationErrors = new List<string> { $"Exception: {ex.Message}" };
            await _auditRepository.AddAsync(auditRecord);
            await _auditRepository.SaveChangesAsync();

            return new UpdateRuleCodeResponse
            {
                Success = false,
                Message = $"An error occurred while updating rule code: {ex.Message}"
            };
        }
    }

    public async Task<VectorSearchResult> SearchSimilarRulesAsync(string ruleText, string organizationId)
    {
        try
        {
            if (!await _vectorSimilarityService.IsEnabledAsync())
            {
                return new VectorSearchResult(); // Return empty result if disabled
            }

            var searchRequest = new VectorSearchRequest
            {
                RuleText = ruleText,
                OrganizationId = organizationId,
                SimilarityThreshold = 0.8, // Could be configurable
                MaxResults = 5
            };

            return await _vectorSimilarityService.SearchSimilarRulesAsync(searchRequest);
        }
        catch (Exception ex)
        {
            // Log error but don't throw - similarity search is not critical
            // Could add logging here if needed
            return new VectorSearchResult();
        }
    }

    private async Task StoreRuleVectorAsync(PayRule payRule, RuleGenerationRequest generationRequest)
    {
        try
        {
            if (!await _vectorSimilarityService.IsEnabledAsync())
            {
                return; // Skip if vector similarity is disabled
            }

            var intentText = generationRequest?.Intent ?? "";
            
            // Combine rule statement, description, and final reviewed intent for embedding
            var ruleText = $"{payRule.RuleStatement} {payRule.RuleDescription} {intentText}";
            
            var metadata = new Dictionary<string, object>
            {
                ["rule_id"] = payRule.Id.ToString(),
                ["rule_statement"] = payRule.RuleStatement,
                ["rule_description"] = payRule.RuleDescription,
                ["intent"] = intentText,
                ["organization_id"] = payRule.OrganizationId,
                ["created_by"] = payRule.CreatedBy,
                ["created_at"] = payRule.CreatedAt.ToString("O"),
                ["status"] = "Active"
            };

            await _vectorSimilarityService.StoreRuleVectorAsync(payRule.Id, ruleText, metadata);
        }
        catch (Exception ex)
        {
            // Log error but don't throw - vector storage is not critical for rule activation
            // Could add logging here if needed
        }
    }

    private async Task<UpdateRuleCodeResponse> UpdateGenerationRequestCodeAsync(RuleGenerationRequest generationRequest, UpdateRuleCodeRequest request)
    {
        try
        {
            // Compile the updated code (replace hyphens with underscores to make valid C# identifier)
            var compilationResult = await _compilationService.CompileCodeAsync(request.UpdatedCode, $"CalculatePayroll_{generationRequest.Id}".Replace("-", "_"));
            
            // Update the generation request with new code
            generationRequest.GeneratedCode = request.UpdatedCode;
            generationRequest.LastModified = DateTime.UtcNow;
            generationRequest.GenerationAttemptCount += 1;

            if (!compilationResult.Success)
            {
                // Still save the updated code even if compilation fails
                generationRequest.Status = "CompilationFailed";
                generationRequest.CompilationErrors = string.Join("; ", compilationResult.Errors);
                
                await _generationRepository.UpdateAsync(generationRequest);
                await _generationRepository.SaveChangesAsync();

                return new UpdateRuleCodeResponse
                {
                    Success = false,
                    Message = "Code compilation failed",
                    CompilationErrors = compilationResult.Errors,
                    CompilationWarnings = compilationResult.Warnings
                };
            }

            // Compilation succeeded - update status and potentially create/update active rule
            generationRequest.Status = "CodeGenerated";
            generationRequest.CompilationErrors = string.Empty;
            
            await _generationRepository.UpdateAsync(generationRequest);
            await _generationRepository.SaveChangesAsync();

            // Try to create or update the corresponding PayRule
            PayRule updatedRule = null;
            try
            {
                var existingRule = await _payRuleRepository.GetByIdAsync(generationRequest.Id);
                
                if (existingRule != null)
                {
                    // Update existing rule
                    if (string.IsNullOrEmpty(existingRule.OriginalGeneratedCode))
                    {
                        existingRule.OriginalGeneratedCode = existingRule.GeneratedCode;
                    }
                    existingRule.GeneratedCode = request.UpdatedCode;
                    existingRule.Version += 1;
                    existingRule.LastModified = DateTime.UtcNow;
                    existingRule.LastModifiedBy = request.ModifiedBy;
                    
                    updatedRule = await _payRuleRepository.UpdateAsync(existingRule);
                }
                else
                {
                    // Create new active rule
                    var newRule = new PayRule
                    {
                        Id = generationRequest.Id,
                        RuleStatement = generationRequest.RuleStatement,
                        RuleDescription = generationRequest.RuleDescription,
                        FunctionName = $"CalculatePayroll_{generationRequest.Id}".Replace("-", "_"),
                        GeneratedCode = request.UpdatedCode,
                        IsActive = false, // User needs to explicitly activate it
                        Version = 1,
                        CreatedAt = generationRequest.CreatedAt,
                        LastModified = DateTime.UtcNow,
                        CreatedBy = generationRequest.CreatedBy,
                        LastModifiedBy = request.ModifiedBy,
                        OrganizationId = generationRequest.OrganizationId
                    };
                    
                    await _payRuleRepository.AddAsync(newRule);
                    updatedRule = newRule;
                }
                
                await _payRuleRepository.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                // Log the error but don't fail the operation
                Console.WriteLine($"Failed to create/update PayRule: {ex.Message}");
            }

            return new UpdateRuleCodeResponse
            {
                Success = true,
                Message = "Code updated and compiled successfully",
                UpdatedRule = updatedRule,
                CompilationErrors = new List<string>(),
                CompilationWarnings = compilationResult.Warnings
            };
        }
        catch (Exception ex)
        {
            return new UpdateRuleCodeResponse
            {
                Success = false,
                Message = $"Error updating rule code: {ex.Message}",
                CompilationErrors = new List<string> { ex.Message }
            };
        }
    }
}