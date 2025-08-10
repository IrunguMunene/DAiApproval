using Microsoft.AspNetCore.Mvc;
using PayrollSystem.Application.DTOs;
using PayrollSystem.Application.Services;
using PayrollSystem.Domain.Interfaces;

namespace PayrollSystem.API.Controllers;

[Route("api/[controller]")]
public class RuleController : BaseController
{
    private readonly IRuleManagementService _ruleManagementService;
    private readonly IVectorSimilarityService _vectorSimilarityService;

    public RuleController(IRuleManagementService ruleManagementService, IVectorSimilarityService vectorSimilarityService)
    {
        _ruleManagementService = ruleManagementService;
        _vectorSimilarityService = vectorSimilarityService;
    }

    [HttpPost("extract-intent")]
    public async Task<IActionResult> ExtractIntent([FromBody] RuleGenerationRequestDto request)
    {
        try
        {
            var createdBy = GetCurrentUserId();
            var result = await _ruleManagementService.ExtractIntentAsync(request, createdBy);
            return Success(result);
        }
        catch (Exception ex)
        {
            return HandleError(ex, "extract-intent");
        }
    }

    [HttpPost("{ruleId}/generate-code")]
    public async Task<IActionResult> GenerateCode(Guid ruleId, [FromBody] IntentReviewDto intentReview)
    {
        try
        {
            var result = await _ruleManagementService.GenerateCodeAsync(ruleId, intentReview.ReviewedIntent);
            return Success(result);
        }
        catch (Exception ex)
        {
            return HandleError(ex, "generate-code");
        }
    }

    [HttpPost("generate")]
    public async Task<IActionResult> GenerateRule([FromBody] RuleGenerationRequestDto request)
    {
        try
        {
            var createdBy = GetCurrentUserId();
            var result = await _ruleManagementService.GenerateRuleAsync(request, createdBy);
            return Success(result);
        }
        catch (Exception ex)
        {
            return HandleError(ex, "generate-rule");
        }
    }

    [HttpPost("{ruleId}/activate")]
    public async Task<IActionResult> ActivateRule(Guid ruleId)
    {
        try
        {
            var success = await _ruleManagementService.ActivateRuleAsync(ruleId);
            if (success)
            {
                return Success("Rule activated successfully");
            }
            return HandleError(new InvalidOperationException("Failed to activate rule"), "activate-rule");
        }
        catch (Exception ex)
        {
            return HandleError(ex, "activate-rule");
        }
    }

    [HttpPost("{ruleId}/deactivate")]
    public async Task<IActionResult> DeactivateRule(Guid ruleId)
    {
        try
        {
            var success = await _ruleManagementService.DeactivateRuleAsync(ruleId);
            if (success)
            {
                return Success("Rule deactivated successfully");
            }
            return NotFound(new { error = "Rule not found" });
        }
        catch (Exception ex)
        {
            return HandleError(ex, "deactivate-rule");
        }
    }

    [HttpGet("active")]
    public async Task<IActionResult> GetActiveRules([FromQuery] string organizationId = "demo-org")
    {
        try
        {
            var rules = await _ruleManagementService.GetActiveRulesAsync(organizationId);
            return Success(rules);
        }
        catch (Exception ex)
        {
            return HandleError(ex, "get-active-rules");
        }
    }

    [HttpGet("all")]
    public async Task<IActionResult> GetAllRules([FromQuery] string organizationId = "demo-org")
    {
        try
        {
            var rules = await _ruleManagementService.GetAllRulesAsync(organizationId);
            return Success(rules);
        }
        catch (Exception ex)
        {
            return HandleError(ex, "get-all-rules");
        }
    }

    [HttpGet("generation-requests")]
    public async Task<IActionResult> GetGenerationRequests([FromQuery] string organizationId = "demo-org")
    {
        try
        {
            var requests = await _ruleManagementService.GetRuleGenerationRequestsAsync(organizationId);
            return Success(requests);
        }
        catch (Exception ex)
        {
            return HandleError(ex, "get-generation-requests");
        }
    }

    [HttpGet("{ruleId}")]
    public async Task<IActionResult> GetRule(Guid ruleId)
    {
        try
        {
            var rule = await _ruleManagementService.GetRuleByIdAsync(ruleId);
            if (rule == null)
            {
                return NotFound(new { error = "Rule not found" });
            }
            return Success(rule);
        }
        catch (Exception ex)
        {
            return HandleError(ex, "get-rule");
        }
    }

    [HttpGet("compilation-errors")]
    public async Task<IActionResult> GetRulesWithCompilationErrors([FromQuery] string organizationId = "demo-org")
    {
        try
        {
            var rulesWithErrors = await _ruleManagementService.GetRulesWithCompilationErrorsAsync(organizationId);
            return Success(rulesWithErrors);
        }
        catch (Exception ex)
        {
            return HandleError(ex, "get-compilation-errors");
        }
    }

    [HttpPost("{ruleId}/regenerate")]
    public async Task<IActionResult> RegenerateRule(Guid ruleId)
    {
        try
        {
            var success = await _ruleManagementService.RegenerateFailedRuleAsync(ruleId);
            if (success)
            {
                return Success("Rule regeneration initiated successfully");
            }
            return HandleError(new InvalidOperationException("Failed to regenerate rule"), "regenerate-rule");
        }
        catch (Exception ex)
        {
            return HandleError(ex, "regenerate-rule");
        }
    }

    [HttpPut("{ruleId}/update-code")]
    public async Task<IActionResult> UpdateRuleCode(Guid ruleId, [FromBody] UpdateRuleCodeRequest request)
    {
        try
        {
            Console.WriteLine($"UpdateRuleCode called with ruleId: {ruleId}");
            Console.WriteLine($"Request body: UpdatedCode length = {request?.UpdatedCode?.Length}, ModifiedBy = {request?.ModifiedBy}");
            
            if (request == null)
            {
                Console.WriteLine("Request is null!");
                return BadRequest(new { error = "Request body is null" });
            }

            // Set the ModifiedBy from header if not provided
            if (string.IsNullOrEmpty(request.ModifiedBy))
            {
                request.ModifiedBy = GetCurrentUserId();
            }

            Console.WriteLine($"Final request: UpdatedCode length = {request.UpdatedCode?.Length}, ModifiedBy = {request.ModifiedBy}");

            var result = await _ruleManagementService.UpdateRuleCodeAsync(ruleId, request);
            
            if (result.Success)
            {
                return Success(result);
            }
            else
            {
                return BadRequest(result);
            }
        }
        catch (Exception ex)
        {
            return HandleError(ex, "update-rule-code");
        }
    }

    [HttpPost("search-similar")]
    public async Task<IActionResult> SearchSimilarRules([FromBody] SimilaritySearchRequest request)
    {
        try
        {
            var result = await _ruleManagementService.SearchSimilarRulesAsync(request.RuleText, request.OrganizationId);
            return Success(result);
        }
        catch (Exception ex)
        {
            return HandleError(ex, "search-similar");
        }
    }

    [HttpGet("vector-stats")]
    public async Task<IActionResult> GetVectorStats()
    {
        try
        {
            var stats = await _vectorSimilarityService.GetCollectionStatsAsync();
            return Success(stats);
        }
        catch (Exception ex)
        {
            return HandleError(ex, "get-vector-stats");
        }
    }
}

public class SimilaritySearchRequest
{
    public string RuleText { get; set; } = string.Empty;
    public string OrganizationId { get; set; } = "demo-org";
}