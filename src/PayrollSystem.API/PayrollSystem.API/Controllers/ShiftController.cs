using Microsoft.AspNetCore.Mvc;
using PayrollSystem.Application.DTOs;
using PayrollSystem.Application.Services;

namespace PayrollSystem.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ShiftController : ControllerBase
{
    private readonly IShiftClassificationService _classificationService;

    public ShiftController(IShiftClassificationService classificationService)
    {
        _classificationService = classificationService;
    }

    [HttpPost("classify")]
    public async Task<IActionResult> ClassifyShift([FromBody] ShiftClassificationRequest request)
    {
        try
        {
            var result = await _classificationService.ClassifyShiftAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("classify-batch")]
    public async Task<IActionResult> ClassifyBatch([FromBody] BatchShiftClassificationRequest request)
    {
        try
        {
            var results = await _classificationService.ClassifyBatchAsync(request);
            return Ok(results);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("test-rule/{ruleId}")]
    public async Task<IActionResult> TestRule(Guid ruleId, [FromBody] ShiftClassificationRequest request)
    {
        try
        {
            var result = await _classificationService.TestRuleAsync(ruleId, request);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("test-all-rules")]
    public async Task<IActionResult> TestAllRules([FromBody] AllRulesTestRequest request)
    {
        try
        {
            var result = await _classificationService.TestAllRulesAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("test-all-rules-batch")]
    public async Task<IActionResult> TestAllRulesBatch([FromBody] BatchAllRulesTestRequest request)
    {
        try
        {
            var results = await _classificationService.TestAllRulesBatchAsync(request);
            return Ok(results);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}