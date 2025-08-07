using PayrollSystem.Domain.Entities;
using PayrollSystem.Domain.Models;

namespace PayrollSystem.Domain.Interfaces;

public interface IPayRuleClassifier
{
    ShiftClassificationResult CalculatePayroll(Shift shift);
    string GetRuleName();
    string GetRuleDescription();
}