using PayrollSystem.Application.DTOs;
using PayrollSystem.Domain.Entities;
using PayrollSystem.Domain.Interfaces;

namespace PayrollSystem.Application.Services;

public class RuleManagementService : IRuleManagementService
{
    private readonly IRuleGenerationRepository _generationRepository;
    private readonly IPayRuleRepository _payRuleRepository;
    private readonly IRuleGenerationService _ruleGenerationService;
    private readonly ICodeCompilationService _compilationService;

    public RuleManagementService(
        IRuleGenerationRepository generationRepository,
        IPayRuleRepository payRuleRepository,
        IRuleGenerationService ruleGenerationService,
        ICodeCompilationService compilationService)
    {
        _generationRepository = generationRepository;
        _payRuleRepository = payRuleRepository;
        _ruleGenerationService = ruleGenerationService;
        _compilationService = compilationService;
    }

    public async Task<RuleGenerationResponseDto> GenerateRuleAsync(RuleGenerationRequestDto request, string createdBy)
    {
        // Generate the rule using AI service
        var generationRequest = await _ruleGenerationService.CreateRuleAsync(
            request.RuleStatement, 
            request.RuleDescription, 
            createdBy);

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
        if (generationRequest == null || generationRequest.Status != "CodeGenerated")
        {
            return false;
        }

        try
        {
            // Generate function name
            var functionName = $"Rule_{ruleId:N}";

            // Compile the code
            var compilationResult = await _compilationService.CompileCodeAsync(
                generationRequest.GeneratedCode, 
                functionName);

            if (!compilationResult.Success)
            {
                generationRequest.Status = "CompilationFailed";
                generationRequest.CompilationErrors = string.Join("; ", compilationResult.Errors);
                await _generationRepository.UpdateAsync(generationRequest);
                await _generationRepository.SaveChangesAsync();
                return false;
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

            // Create PayRule entity
            var payRule = new PayRule
            {
                RuleStatement = generationRequest.RuleDescription.Split(" - ")[0],
                RuleDescription = generationRequest.RuleDescription,
                FunctionName = functionName,
                GeneratedCode = generationRequest.GeneratedCode,
                OrganizationId = generationRequest.OrganizationId,
                CreatedBy = generationRequest.CreatedBy,
                IsActive = true
            };

            await _payRuleRepository.AddAsync(payRule);
            generationRequest.Status = "Active";
            await _generationRepository.UpdateAsync(generationRequest);
            
            await _payRuleRepository.SaveChangesAsync();
            await _generationRepository.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            generationRequest.Status = "ActivationFailed";
            generationRequest.CompilationErrors = ex.Message;
            await _generationRepository.UpdateAsync(generationRequest);
            await _generationRepository.SaveChangesAsync();
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
            CreatedAt = generationRequest.CreatedAt
        };
    }
}