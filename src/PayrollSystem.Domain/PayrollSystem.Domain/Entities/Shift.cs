namespace PayrollSystem.Domain.Entities;

public class Shift
{
    public string EmployeeName { get; set; } = string.Empty;
    public DateTime StartDateTime { get; set; }
    public DateTime EndDateTime { get; set; }
    public string OrganizationId { get; set; } = string.Empty;
    
    public TimeSpan Duration => EndDateTime - StartDateTime;
}