namespace PayrollSystem.Domain.Models;

public class ShiftClassificationResult
{
    public string EmployeeName { get; set; } = string.Empty;
    public DateTime ShiftStart { get; set; }
    public DateTime ShiftEnd { get; set; }
    public List<PayCodeAllocation> PayCodeAllocations { get; set; } = new();
    public double TotalHours => PayCodeAllocations.Sum(p => p.Hours);
}

public class PayCodeAllocation
{
    public string PayCodeName { get; set; } = string.Empty;
    public double Hours { get; set; }
    public string Description { get; set; } = string.Empty;
}