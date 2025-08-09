namespace PayrollSystem.Application.DTOs;

public class RuleGenerationRequestDto
{
    public string RuleStatement { get; set; } = string.Empty;
    public string RuleDescription { get; set; } = string.Empty;
    public string OrganizationId { get; set; } = string.Empty;
    public DateTime ExampleShiftStart { get; set; }
    public DateTime ExampleShiftEnd { get; set; }
    public string ExpectedOutcome { get; set; } = string.Empty;
}

public class RuleGenerationResponseDto
{
    public Guid Id { get; set; }
    public string RuleStatement { get; set; } = string.Empty;
    public string RuleDescription { get; set; } = string.Empty;
    public string Intent { get; set; } = string.Empty;
    public string GeneratedCode { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public List<string> CompilationErrors { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    
    // Auto-fix tracking fields
    public int GenerationAttemptCount { get; set; } = 1;
    public bool AutoFixAttempted { get; set; } = false;
    public string? OriginalGeneratedCode { get; set; }
    public string? OriginalCompilationErrors { get; set; }
    public DateTime? AutoFixAttemptedAt { get; set; }
    public bool RequiresManualReview { get; set; } = false;
    public string? AutoFixReason { get; set; }
    public DateTime LastModified { get; set; }
}

public class IntentReviewDto
{
    public string ReviewedIntent { get; set; } = string.Empty;
}