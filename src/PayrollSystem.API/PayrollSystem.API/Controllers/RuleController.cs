using Microsoft.AspNetCore.Mvc;
using PayrollSystem.Application.DTOs;
using PayrollSystem.Application.Services;

namespace PayrollSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RuleController : ControllerBase
{
    private readonly IRuleManagementService _ruleManagementService;

    public RuleController(IRuleManagementService ruleManagementService)
    {
        _ruleManagementService = ruleManagementService;
    }

    [HttpPost("generate")]
    public async Task<IActionResult> GenerateRule([FromBody] RuleGenerationRequestDto request)
    {
        try
        {
            // For demo purposes, use a default user
            var createdBy = Request.Headers["X-User-Id"].FirstOrDefault() ?? "demo-user";
            var result = await _ruleManagementService.GenerateRuleAsync(request, createdBy);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
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
                return Ok(new { message = "Rule activated successfully" });
            }
            return BadRequest(new { error = "Failed to activate rule" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
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
                return Ok(new { message = "Rule deactivated successfully" });
            }
            return NotFound(new { error = "Rule not found" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("active")]
    public async Task<IActionResult> GetActiveRules([FromQuery] string organizationId = "demo-org")
    {
        try
        {
            var rules = await _ruleManagementService.GetActiveRulesAsync(organizationId);
            return Ok(rules);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("generation-requests")]
    public async Task<IActionResult> GetGenerationRequests([FromQuery] string organizationId = "demo-org")
    {
        try
        {
            var requests = await _ruleManagementService.GetRuleGenerationRequestsAsync(organizationId);
            return Ok(requests);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
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
            return Ok(rule);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("compilation-errors")]
    public async Task<IActionResult> GetRulesWithCompilationErrors([FromQuery] string organizationId = "demo-org")
    {
        try
        {
            var rulesWithErrors = await _ruleManagementService.GetRulesWithCompilationErrorsAsync(organizationId);
            return Ok(rulesWithErrors);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}