using PayrollSystem.Domain.Entities;
using PayrollSystem.Domain.Interfaces;
using System.Text;

namespace PayrollSystem.Infrastructure.Services;

public class CodeFixingPromptService : ICodeFixingPromptService
{
    public string GenerateCodeFixingPrompt(RuleGenerationRequest failedRequest, string compilationErrors)
    {
        var errorAnalysis = AnalyzeCompilationErrors(compilationErrors);
        
        var prompt = new StringBuilder();
        
        prompt.AppendLine("# CODE FIXING REQUEST");
        prompt.AppendLine();
        prompt.AppendLine("You are tasked with fixing C# code that failed to compile. This is an automatic retry attempt.");
        prompt.AppendLine("CRITICAL: You must fix the compilation errors while preserving the original business logic and intent.");
        prompt.AppendLine();
        
        prompt.AppendLine("## ORIGINAL RULE DESCRIPTION");
        prompt.AppendLine($"```");
        prompt.AppendLine(failedRequest.RuleDescription);
        prompt.AppendLine("```");
        prompt.AppendLine();
        
        prompt.AppendLine("## EXTRACTED INTENT");
        prompt.AppendLine($"```");
        prompt.AppendLine(failedRequest.Intent);
        prompt.AppendLine("```");
        prompt.AppendLine();
        
        prompt.AppendLine("## FAILED CODE THAT NEEDS FIXING");
        prompt.AppendLine("```csharp");
        prompt.AppendLine(failedRequest.GeneratedCode);
        prompt.AppendLine("```");
        prompt.AppendLine();
        
        prompt.AppendLine("## COMPILATION ERRORS");
        prompt.AppendLine("```");
        prompt.AppendLine(compilationErrors);
        prompt.AppendLine("```");
        prompt.AppendLine();
        
        prompt.AppendLine("## ERROR ANALYSIS");
        prompt.AppendLine(errorAnalysis);
        prompt.AppendLine();
        
        prompt.AppendLine("## REQUIRED METHOD SIGNATURE");
        prompt.AppendLine("```csharp");
        prompt.AppendLine("public static ShiftClassificationResult CalculatePayroll(Shift shift)");
        prompt.AppendLine("```");
        prompt.AppendLine();
        
        prompt.AppendLine("## AVAILABLE CLASSES AND PROPERTIES");
        prompt.AppendLine(GetClassDefinitions());
        prompt.AppendLine();
        
        prompt.AppendLine("## WORKING CODE EXAMPLE");
        prompt.AppendLine(GetWorkingCodeExample());
        prompt.AppendLine();
        
        prompt.AppendLine("## FIXING INSTRUCTIONS");
        prompt.AppendLine("1. **PRESERVE THE ORIGINAL BUSINESS LOGIC** - Do not change the payroll calculation intent");
        prompt.AppendLine("2. **FIX COMPILATION ERRORS ONLY** - Focus on syntax, type issues, and missing references");
        prompt.AppendLine("3. **USE EXACT CLASS DEFINITIONS** - Only use properties and methods shown above");
        prompt.AppendLine("4. **MAINTAIN METHOD SIGNATURE** - Keep the exact signature: `public static ShiftClassificationResult CalculatePayroll(Shift shift)`");
        prompt.AppendLine("5. **RETURN PROPER RESULT** - Always return a valid ShiftClassificationResult object");
        prompt.AppendLine("6. **HANDLE EDGE CASES** - Include null checks and validation as needed");
        prompt.AppendLine("7. **USE DATETIME ARITHMETIC** - Use TimeSpan for time calculations");
        prompt.AppendLine("8. **PROVIDE DESCRIPTIVE COMMENTS** - Add comments explaining the calculation logic");
        prompt.AppendLine();
        
        prompt.AppendLine("## RESPONSE FORMAT");
        prompt.AppendLine("Provide ONLY the corrected C# method code. No explanations, no markdown formatting, just the pure C# code:");
        prompt.AppendLine();
        prompt.AppendLine("```csharp");
        prompt.AppendLine("public static ShiftClassificationResult CalculatePayroll(Shift shift)");
        prompt.AppendLine("{");
        prompt.AppendLine("    // Your fixed implementation here");
        prompt.AppendLine("}");
        prompt.AppendLine("```");
        
        return prompt.ToString();
    }

    public string AnalyzeCompilationErrors(string compilationErrors)
    {
        var analysis = new StringBuilder();
        analysis.AppendLine("Based on the compilation errors, here are the likely issues to fix:");
        analysis.AppendLine();

        if (compilationErrors.Contains("CS0103") || compilationErrors.Contains("does not exist"))
        {
            analysis.AppendLine("- **Missing or incorrect property names**: Check property names against the class definitions");
            analysis.AppendLine("- **Typos in variable names**: Verify all variable names are spelled correctly");
        }

        if (compilationErrors.Contains("CS0117") || compilationErrors.Contains("does not contain a definition"))
        {
            analysis.AppendLine("- **Invalid method calls**: Check that you're using correct methods on objects");
            analysis.AppendLine("- **Property access errors**: Ensure you're accessing existing properties");
        }

        if (compilationErrors.Contains("CS0029") || compilationErrors.Contains("cannot implicitly convert"))
        {
            analysis.AppendLine("- **Type conversion issues**: Check data types and casting");
            analysis.AppendLine("- **DateTime/TimeSpan issues**: Use proper time arithmetic methods");
        }

        if (compilationErrors.Contains("CS1002") || compilationErrors.Contains("syntax error"))
        {
            analysis.AppendLine("- **Syntax errors**: Check for missing semicolons, braces, or parentheses");
            analysis.AppendLine("- **Malformed expressions**: Verify all expressions are properly structured");
        }

        if (compilationErrors.Contains("CS0161") || compilationErrors.Contains("not all code paths return"))
        {
            analysis.AppendLine("- **Missing return statement**: Ensure all code paths return a ShiftClassificationResult");
        }

        if (compilationErrors.Contains("CS0246") || compilationErrors.Contains("type or namespace"))
        {
            analysis.AppendLine("- **Missing type references**: Use only the predefined classes shown above");
        }

        return analysis.ToString();
    }

    private string GetClassDefinitions()
    {
        return @"```csharp
// Shift class - Input parameter
public class Shift
{
    public string EmployeeName { get; set; }
    public DateTime StartDateTime { get; set; }
    public DateTime EndDateTime { get; set; }
}

// ShiftClassificationResult class - Return type
public class ShiftClassificationResult
{
    public string EmployeeName { get; set; }
    public DateTime ShiftStart { get; set; }
    public DateTime ShiftEnd { get; set; }
    public List<PayCodeAllocation> PayCodeAllocations { get; set; } = new List<PayCodeAllocation>();
}

// PayCodeAllocation class - Individual pay allocations
public class PayCodeAllocation
{
    public string PayCodeName { get; set; } = string.Empty;
    public double Hours { get; set; }
    public double HourlyRate { get; set; } = 15.0; // Default rate
    public double Amount => Hours * HourlyRate;
    public string Description { get; set; } = string.Empty;
}
```";
    }

    private string GetWorkingCodeExample()
    {
        return @"```csharp
// WORKING EXAMPLE: Basic overtime rule
public static ShiftClassificationResult CalculatePayroll(Shift shift)
{
    var totalHours = (shift.EndDateTime - shift.StartDateTime).TotalHours;
    var payCodeAllocations = new List<PayCodeAllocation>();
    
    if (totalHours > 8)
    {
        // Regular hours (first 8 hours)
        payCodeAllocations.Add(new PayCodeAllocation
        {
            PayCodeName = ""Regular"",
            Hours = 8,
            HourlyRate = 15.0,
            Description = ""Regular working hours""
        });
        
        // Overtime hours (above 8 hours)
        var overtimeHours = totalHours - 8;
        payCodeAllocations.Add(new PayCodeAllocation
        {
            PayCodeName = ""Overtime"",
            Hours = overtimeHours,
            HourlyRate = 22.5, // 1.5x rate
            Description = ""Overtime pay at 1.5x rate""
        });
    }
    else
    {
        // All regular hours
        payCodeAllocations.Add(new PayCodeAllocation
        {
            PayCodeName = ""Regular"",
            Hours = totalHours,
            HourlyRate = 15.0,
            Description = ""Regular working hours""
        });
    }
    
    return new ShiftClassificationResult
    {
        EmployeeName = shift.EmployeeName,
        ShiftStart = shift.StartDateTime,
        ShiftEnd = shift.EndDateTime,
        PayCodeAllocations = payCodeAllocations
    };
}
```";
    }
}