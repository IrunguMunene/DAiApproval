using System.Text;
using System.Text.Json;
using System.Reflection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PayrollSystem.Domain.Interfaces;
using PayrollSystem.Domain.Entities;
using PayrollSystem.Domain.Models;

namespace PayrollSystem.Infrastructure.Services;

public class OllamaService : IRuleGenerationService
{
    private readonly HttpClient _httpClient;
    private readonly string _ollamaBaseUrl;

    public OllamaService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _ollamaBaseUrl = configuration.GetValue<string>("Ollama:BaseUrl") ?? "http://localhost:11434";
    }
    public async Task<string> ExtractIntentAsync(string ruleStatement, string description)
    {
        var prompt = $@"Extract the intent from this payroll rule statement.
                        Focus on: time calculations, conditions, thresholds, pay code types.

                        Rule: ""{ruleStatement}""
                        Description: ""{description}""

                        Respond with structured intent in this format:
                        - Calculation Type: [overtime/regular/holiday/etc]
                        - Conditions: [time thresholds, day conditions, etc]
                        - Logic: [step-by-step calculation logic]";

        var request = new
        {
            model = "llama3.2",
            prompt = prompt,
            stream = false
        };

        var response = await _httpClient.PostAsync($"{_ollamaBaseUrl}/api/generate", 
            new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json"));

        if (response.IsSuccessStatusCode)
        {
            var responseContent = await response.Content.ReadAsStringAsync();
            var responseJson = JsonSerializer.Deserialize<JsonElement>(responseContent);
            return responseJson.GetProperty("response").GetString() ?? "";
        }

        throw new Exception($"Failed to extract intent: {response.StatusCode}");
    }
    public async Task<string> GenerateCodeAsync(string intent, string ruleStatement)
    {
        // Generate class definitions dynamically using reflection
        var classDefinitions = GenerateClassDefinitions();
        
        var prompt = $@"Generate a C# method that implements this payroll rule intent.

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

        var request = new
        {
            model = "qwen2.5-coder",
            prompt = prompt,
            stream = false
        };

        var response = await _httpClient.PostAsync($"{_ollamaBaseUrl}/api/generate",
            new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json"));

        if (response.IsSuccessStatusCode)
        {
            var responseContent = await response.Content.ReadAsStringAsync();
            var responseJson = JsonSerializer.Deserialize<JsonElement>(responseContent);
            var generatedCode = responseJson.GetProperty("response").GetString() ?? "";
            
            // Clean up the generated code
            return CleanGeneratedCode(generatedCode);
        }

        throw new Exception($"Failed to generate code: {response.StatusCode}");
    }
    public async Task<RuleGenerationRequest> CreateRuleAsync(string ruleStatement, string description, string createdBy)
    {
        var request = new RuleGenerationRequest
        {
            RuleDescription = ruleStatement + " - " + description,
            CreatedBy = createdBy,
            Status = "Generating"
        };

        try
        {
            // Extract intent
            var intent = await ExtractIntentAsync(ruleStatement, description);
            request.Intent = intent;
            request.Status = "IntentExtracted";

            // Generate code
            var code = await GenerateCodeAsync(intent, ruleStatement);
            request.GeneratedCode = code;
            request.Status = "CodeGenerated";

            return request;
        }
        catch (Exception ex)
        {
            request.Status = "Failed";
            request.CompilationErrors = ex.Message;
            return request;
        }
    }
    private static string GenerateClassDefinitions()
    {
        var sb = new StringBuilder();
        
        // Generate Shift class definition
        sb.AppendLine(GenerateClassDefinition(typeof(Shift)));
        sb.AppendLine();
        
        // Generate ShiftClassificationResult class definition
        sb.AppendLine(GenerateClassDefinition(typeof(ShiftClassificationResult)));
        sb.AppendLine();
        
        // Generate PayCodeAllocation class definition
        sb.AppendLine(GenerateClassDefinition(typeof(PayCodeAllocation)));
        
        return sb.ToString();
    }
    private static string GenerateClassDefinition(Type type)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"public class {type.Name}");
        sb.AppendLine("{");
        
        // Get all public properties
        var properties = type.GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Where(p => p.CanRead) // Only include readable properties
            .OrderBy(p => p.Name);
        
        foreach (var property in properties)
        {
            var propertyType = GetFriendlyTypeName(property.PropertyType);
            var defaultValue = GetDefaultValueString(property);
            
            if (property.CanWrite)
            {
                // Regular property with getter and setter
                sb.AppendLine($"    public {propertyType} {property.Name} {{ get; set; }}{defaultValue}");
            }
            else
            {
                // Read-only computed property
                sb.AppendLine($"    public {propertyType} {property.Name} {{ get; }} // Computed property");
            }
        }
        
        sb.AppendLine("}");
        return sb.ToString();
    }
    private static string GetFriendlyTypeName(Type type)
    {
        if (type == typeof(string)) return "string";
        if (type == typeof(int)) return "int";
        if (type == typeof(double)) return "double";
        if (type == typeof(decimal)) return "decimal";
        if (type == typeof(bool)) return "bool";
        if (type == typeof(DateTime)) return "DateTime";
        if (type == typeof(TimeSpan)) return "TimeSpan";
        if (type == typeof(Guid)) return "Guid";
        
        // Handle generic types like List<T>
        if (type.IsGenericType)
        {
            var genericTypeDef = type.GetGenericTypeDefinition();
            if (genericTypeDef == typeof(List<>))
            {
                var elementType = type.GetGenericArguments()[0];
                return $"List<{GetFriendlyTypeName(elementType)}>";
            }
            if (genericTypeDef == typeof(Nullable<>))
            {
                var elementType = type.GetGenericArguments()[0];
                return $"{GetFriendlyTypeName(elementType)}?";
            }
        }
        
        return type.Name;
    }
    private static string GetDefaultValueString(PropertyInfo property)
    {
        // Only add default values for settable properties
        if (!property.CanWrite) return "";
        
        var propertyType = property.PropertyType;
        
        // Check for DefaultValueAttribute first
        var defaultValueAttr = property.GetCustomAttribute<System.ComponentModel.DefaultValueAttribute>();
        if (defaultValueAttr != null)
        {
            return $" = {FormatDefaultValue(defaultValueAttr.Value!)};";
        }
        
        // Common default patterns based on type
        if (propertyType == typeof(string))
            return " = string.Empty;";
        if (propertyType == typeof(List<PayCodeAllocation>))
            return " = new();";
        if (propertyType.IsGenericType && propertyType.GetGenericTypeDefinition() == typeof(List<>))
            return " = new();";
        if (propertyType == typeof(Guid))
            return " = Guid.NewGuid();";
        if (propertyType == typeof(DateTime))
            return " = DateTime.UtcNow;";
        if (propertyType == typeof(bool))
            return " = false;";
        if (propertyType.IsValueType && Nullable.GetUnderlyingType(propertyType) == null)
            return $" = default({GetFriendlyTypeName(propertyType)});";
        
        return "";
    }
    private static string FormatDefaultValue(object value)
    {
        if (value == null) return "null";
        if (value is string s) return $"\"{s}\"";
        if (value is bool b) return b.ToString().ToLower();
        if (value is decimal d) return $"{d}m";
        return value.ToString() ?? "null";
    }
    private static string CleanGeneratedCode(string code)
    {
        // Remove markdown code blocks if present
        if (code.StartsWith("```csharp"))
        {
            code = code.Substring(9);
        }
        if (code.StartsWith("```"))
        {
            code = code.Substring(3);
        }
        if (code.EndsWith("```"))
        {
            code = code.Substring(0, code.Length - 3);
        }

        return code.Trim();
    }
}

// Add this to register HttpClient in DI container
public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddOllamaService(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHttpClient<OllamaService>();
        services.AddScoped<IRuleGenerationService, OllamaService>();
        return services;
    }
}