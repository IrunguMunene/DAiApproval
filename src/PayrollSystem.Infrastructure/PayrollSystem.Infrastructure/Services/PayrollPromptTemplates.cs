namespace PayrollSystem.Infrastructure.Services;

/// <summary>
/// Centralized template class for all AI prompts used in the payroll system.
/// This class provides consistent, maintainable prompts for rule generation and intent extraction.
/// </summary>
public static class PayrollPromptTemplates
{
    /// <summary>
    /// Template for extracting structured intent from natural language payroll rules.
    /// Uses a simple format for reliable intent extraction.
    /// </summary>
    /// <param name="ruleStatement">The natural language rule statement</param>
    /// <param name="description">Optional description or context for the rule</param>
    /// <param name="exampleShiftStart">Example shift start datetime for validation</param>
    /// <param name="exampleShiftEnd">Example shift end datetime for validation</param>
    /// <param name="expectedOutcome">Expected outcome description for the example</param>
    /// <returns>Formatted prompt for intent extraction</returns>
    public static string GetIntentExtractionPrompt(string ruleStatement, string description, DateTime exampleShiftStart, DateTime exampleShiftEnd, string expectedOutcome)
    {
        return $@"You are a specialized AI assistant for payroll system rule analysis. 
                        Extract structured intent from this natural language payroll rule statement with precision and clarity.
                        Think deeply.           
                        Focus on: time calculations, conditions, thresholds, pay code types.

                        Rule: ""{ruleStatement}""
                        Description: ""{description}""

                        EXAMPLE PROVIDED:
                        - Example Shift: {exampleShiftStart:yyyy-MM-dd HH:mm} to {exampleShiftEnd:yyyy-MM-dd HH:mm}
                        - Total Hours: {(exampleShiftEnd - exampleShiftStart).TotalHours:F2} hours
                        - Expected Outcome: ""{expectedOutcome}""

                        Use this example to validate your understanding of the rule and ensure your intent extraction aligns with the expected behavior.

                        Respond with structured intent in this format:
                        - Calculation Type: [overtime/regular/holiday/etc]
                        - Conditions: [time thresholds, day conditions, etc]
                        - Logic: [step-by-step calculation logic]
                        - Example Validation: [brief explanation of how this rule applies to the provided example]";
    }

    /// <summary>
    /// Overload for backward compatibility - uses simplified intent extraction without example.
    /// </summary>
    /// <param name="ruleStatement">The natural language rule statement</param>
    /// <param name="description">Optional description or context for the rule</param>
    /// <returns>Formatted prompt for intent extraction</returns>
    public static string GetIntentExtractionPrompt(string ruleStatement, string description)
    {
        return $@"You are a specialized AI assistant for payroll system rule analysis. 
                        Extract structured intent from this natural language payroll rule statement with precision and clarity.
                        Think deeply.           
                        Focus on: time calculations, conditions, thresholds, pay code types.

                        Rule: ""{ruleStatement}""
                        Description: ""{description}""

                        Respond with structured intent in this format:
                        - Calculation Type: [overtime/regular/holiday/etc]
                        - Conditions: [time thresholds, day conditions, etc]
                        - Logic: [step-by-step calculation logic]";
    }

    /// <summary>
    /// Template for generating C# code from extracted intent and rule statements.
    /// Includes comprehensive requirements and class definitions for accurate code generation.
    /// </summary>
    /// <param name="intent">The extracted intent from the rule statement</param>
    /// <param name="ruleStatement">The original rule statement</param>
    /// <param name="classDefinitions">Generated class definitions for the domain models</param>
    /// <returns>Formatted prompt for C# code generation</returns>
    public static string GetCodeGenerationPrompt(string intent, string ruleStatement, string classDefinitions)
    {
        return $@"Generate a C# method that implements this payroll rule intent.

                        INTENT: {intent}

                        RULE STATEMENT: {ruleStatement}

                        REQUIREMENTS:
                        - Method signature: public ShiftClassificationResult CalculatePayroll(Shift shift)
                        - Method must be NON-STATIC (instance method, not static)
                        - Focus on SINGLE PAYCODE CLASSIFICATION ONLY - create only ONE PayCodeAllocation per rule
                        - If rule involves multiple pay types, focus on the PRIMARY pay type mentioned
                        - Return ShiftClassificationResult with exactly ONE PayCodeAllocation entry
                        - Use DateTime calculations for time spans
                        - Handle edge cases appropriately
                        - Include descriptive comments explaining the single paycode logic
                        - Return the method declaration and body ONLY

                        EXACT CLASS DEFINITIONS (DO NOT MODIFY THESE):

                        {classDefinitions}

                        IMPORTANT: Use ONLY the properties listed above. Do NOT add, modify, or assume additional properties exist.

                        SINGLE PAYCODE FOCUS:
                        - Each rule should handle ONE specific pay code type (e.g., Overtime, Regular, Holiday, Night Differential)
                        - Calculate hours that qualify for that specific pay code only
                        - If shift has mixed time (regular + overtime), focus only on the overtime portion for an overtime rule
                        - Set Hours property to the calculated hours for that specific pay code
                        - Use descriptive PayCodeName that matches the rule intent

                        EXAMPLE OUTPUT STRUCTURE:
                        ```csharp
                        public ShiftClassificationResult CalculatePayroll(Shift shift)
                        {{
                            var result = new ShiftClassificationResult
                            {{
                                EmployeeName = shift.EmployeeName,
                                ShiftStart = shift.StartDateTime,
                                ShiftEnd = shift.EndDateTime,
                                PayCodeAllocations = new List<PayCodeAllocation>()
                            }};

                            // Calculate total hours worked
                            var totalHours = shift.Duration.TotalHours;
    
                            // Focus on single paycode classification
                            // Example: For overtime rule, calculate only overtime hours
                            var overtimeHours = Math.Max(0, totalHours - 8.0);
                            
                            if (overtimeHours > 0)
                            {{
                                result.PayCodeAllocations.Add(new PayCodeAllocation
                                {{
                                    PayCodeName = ""Overtime"",
                                    Hours = overtimeHours,
                                    Description = ""Overtime hours over 8 per day""
                                }});
                            }}
    
                            return result;
                        }}
                        ```

                        Generate ONLY the C# method code, no additional text.";
    }

    /// <summary>
    /// Gets the AI model name to use for intent extraction.
    /// Centralized model configuration for consistency.
    /// </summary>
    /// <returns>Model name for intent extraction</returns>
    public static string GetIntentExtractionModel() => "llama3.2";

    /// <summary>
    /// Gets the AI model name to use for C# code generation.
    /// Centralized model configuration for consistency.
    /// </summary>
    /// <returns>Model name for code generation</returns>
    public static string GetCodeGenerationModel() => "qwen2.5-coder";

    /// <summary>
    /// Template for rule regeneration when compilation errors occur.
    /// Provides additional context and error information to improve code generation.
    /// </summary>
    /// <param name="originalRuleStatement">The original rule statement</param>
    /// <param name="originalIntent">The previously extracted intent</param>
    /// <param name="compilationErrors">The compilation errors encountered</param>
    /// <param name="classDefinitions">Generated class definitions for domain models</param>
    /// <returns>Formatted prompt for rule regeneration</returns>
    public static string GetRuleRegenerationPrompt(string originalRuleStatement, string originalIntent, string compilationErrors, string classDefinitions)
    {
        return $@"The previous code generation attempt failed with compilation errors. Please generate a corrected C# method.

                        ORIGINAL RULE STATEMENT: {originalRuleStatement}

                        ORIGINAL INTENT: {originalIntent}

                        COMPILATION ERRORS TO FIX:
                        {compilationErrors}

                        REQUIREMENTS:
                        - Method signature: public ShiftClassificationResult CalculatePayroll(Shift shift)
                        - Method must be NON-STATIC (instance method, not static)
                        - Focus on SINGLE PAYCODE CLASSIFICATION ONLY - create only ONE PayCodeAllocation per rule
                        - Return ShiftClassificationResult with exactly ONE PayCodeAllocation entry
                        - Use DateTime calculations for time spans
                        - Handle edge cases appropriately
                        - Include descriptive comments explaining the single paycode logic
                        - Return the method declaration and body ONLY
                        - MUST FIX THE COMPILATION ERRORS LISTED ABOVE

                        EXACT CLASS DEFINITIONS (DO NOT MODIFY THESE):

                        {classDefinitions}

                        IMPORTANT: 
                        - Use ONLY the properties listed above
                        - Ensure all variable declarations are correct
                        - Verify all method calls and property accesses match the class definitions
                        - Handle null values appropriately
                        - Use proper C# syntax and conventions

                        Generate ONLY the corrected C# method code, no additional text.";
    }

    /// <summary>
    /// Template for enhanced intent extraction with structured JSON output.
    /// Provides more detailed intent analysis for complex rules.
    /// </summary>
    /// <param name="ruleStatement">The natural language rule statement</param>
    /// <param name="description">Optional description or context</param>
    /// <returns>Formatted prompt for enhanced intent extraction</returns>
    public static string GetEnhancedIntentExtractionPrompt(string ruleStatement, string description)
    {
        return $@"You are a specialized AI assistant for payroll system rule analysis. Extract structured intent from this natural language payroll rule with precision and clarity.

                        **Rule Statement:** {ruleStatement}
                        **Description:** {description ?? ""}

                        Analyze the rule and respond with structured intent in this exact JSON format:

                        {{
                            ""calculation_type"": ""[overtime/regular/holiday/premium/shift_differential/etc]"",
                            ""conditions"": [
                                {{
                                    ""parameter"": ""[hours_threshold/day_of_week/time_of_day/employee_type/etc]"",
                                    ""operator"": ""[greater_than/less_than/equal_to/between/on/etc]"",
                                    ""value"": ""[threshold_value_or_condition]"",
                                    ""unit"": ""[hours/days/minutes/date/etc]""
                                }}
                            ],
                            ""pay_code_name"": ""[specific_pay_code_name]"",
                            ""multiplier"": ""[rate_multiplier_if_applicable]"",
                            ""logic_steps"": [
                                ""Step 1: [detailed_calculation_step]"",
                                ""Step 2: [detailed_calculation_step]"",
                                ""Step 3: [detailed_calculation_step]""
                            ],
                            ""edge_cases"": [
                                ""[potential_edge_case_to_handle]""
                            ]
                        }}

                        Focus on:
                        - Exact thresholds and conditions
                        - Single pay code classification only
                        - Implementable calculation steps
                        - Potential edge cases to handle
                        - Precise terminology for pay codes";
    }
}