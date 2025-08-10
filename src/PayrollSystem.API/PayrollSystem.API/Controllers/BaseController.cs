using Microsoft.AspNetCore.Mvc;

namespace PayrollSystem.API.Controllers;

/// <summary>
/// Base controller providing common functionality for all API controllers
/// </summary>
[ApiController]
public abstract class BaseController : ControllerBase
{
    /// <summary>
    /// Handles exceptions with consistent error response format
    /// </summary>
    /// <param name="ex">The exception to handle</param>
    /// <param name="context">Optional context information for logging</param>
    /// <returns>BadRequest response with error details</returns>
    protected IActionResult HandleError(Exception ex, string context = "")
    {
        // Log the error with context for debugging
        // In production, you might want to use ILogger here
        if (!string.IsNullOrEmpty(context))
        {
            Console.WriteLine($"Error in {context}: {ex.Message}");
        }
        else
        {
            Console.WriteLine($"API Error: {ex.Message}");
        }
        
        Console.WriteLine($"Stack trace: {ex.StackTrace}");

        // Return consistent error response format
        return BadRequest(new { error = ex.Message });
    }

    /// <summary>
    /// Handles exceptions with custom error message
    /// </summary>
    /// <param name="ex">The exception to handle</param>
    /// <param name="customMessage">Custom error message to return to client</param>
    /// <param name="context">Optional context information for logging</param>
    /// <returns>BadRequest response with custom error message</returns>
    protected IActionResult HandleError(Exception ex, string customMessage, string context = "")
    {
        // Log the actual error for debugging
        if (!string.IsNullOrEmpty(context))
        {
            Console.WriteLine($"Error in {context}: {ex.Message}");
        }
        else
        {
            Console.WriteLine($"API Error: {ex.Message}");
        }
        
        Console.WriteLine($"Stack trace: {ex.StackTrace}");

        // Return custom message to client
        return BadRequest(new { error = customMessage });
    }

    /// <summary>
    /// Creates a success response with optional message
    /// </summary>
    /// <param name="message">Success message</param>
    /// <returns>Ok response with success message</returns>
    protected IActionResult Success(string message)
    {
        return Ok(new { message = message });
    }

    /// <summary>
    /// Creates a success response with data
    /// </summary>
    /// <param name="data">Data to return</param>
    /// <param name="message">Optional success message</param>
    /// <returns>Ok response with data and optional message</returns>
    protected IActionResult Success<T>(T data, string? message = null)
    {
        if (string.IsNullOrEmpty(message))
        {
            return Ok(data);
        }

        return Ok(new { data = data, message = message });
    }

    /// <summary>
    /// Gets the user ID from request headers for audit purposes
    /// </summary>
    /// <returns>User ID or default demo user</returns>
    protected string GetCurrentUserId()
    {
        return Request.Headers["X-User-Id"].FirstOrDefault() ?? "demo-user";
    }
}