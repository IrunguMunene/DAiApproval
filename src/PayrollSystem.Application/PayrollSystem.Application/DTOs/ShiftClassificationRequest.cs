using PayrollSystem.Domain.Models;

namespace PayrollSystem.Application.DTOs;

public class ShiftClassificationRequest
{
    public string EmployeeName { get; set; } = string.Empty;
    public DateTime StartDateTime { get; set; }
    public DateTime EndDateTime { get; set; }
    public string OrganizationId { get; set; } = string.Empty;
}

public class BatchShiftClassificationRequest
{
    public List<ShiftClassificationRequest> Shifts { get; set; } = new();
    public string OrganizationId { get; set; } = string.Empty;
}

public class AllRulesTestRequest
{
    public ShiftClassificationRequest Shift { get; set; } = new();
    public string OrganizationId { get; set; } = string.Empty;
}

public class BatchAllRulesTestRequest
{
    public List<ShiftClassificationRequest> Shifts { get; set; } = new();
    public string OrganizationId { get; set; } = string.Empty;
}

public class RuleTestResult
{
    public Guid RuleId { get; set; }
    public string RuleStatement { get; set; } = string.Empty;
    public string RuleDescription { get; set; } = string.Empty;
    public bool ExecutedSuccessfully { get; set; }
    public ShiftClassificationResult? Result { get; set; }
    public string? ErrorMessage { get; set; }
}

public class RuleOrchestrationResult
{
    public string EmployeeName { get; set; } = string.Empty;
    public DateTime ShiftStart { get; set; }
    public DateTime ShiftEnd { get; set; }
    public double TotalShiftHours { get; set; }
    
    // Individual rule results
    public List<RuleTestResult> IndividualRuleResults { get; set; } = new();
    
    // Orchestrated final result
    public ShiftClassificationResult? CombinedResult { get; set; }
    
    // Conflict detection
    public List<RuleConflict> Conflicts { get; set; } = new();
    public bool HasConflicts => Conflicts.Any();
}

public class RuleConflict
{
    public string PayCodeName { get; set; } = string.Empty;
    public List<ConflictingRule> ConflictingRules { get; set; } = new();
    public string Description { get; set; } = string.Empty;
}

public class ConflictingRule
{
    public Guid RuleId { get; set; }
    public string RuleStatement { get; set; } = string.Empty;
    public double Hours { get; set; }
    public string Description { get; set; } = string.Empty;
}