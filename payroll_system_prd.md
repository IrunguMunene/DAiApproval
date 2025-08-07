# AI-Orchestrated Payroll System - Comprehensive PRD

## Table of Contents
1. [Introduction](#introduction)
2. [Step-by-Step Development Plan](#step-by-step-development-plan)
3. [Detailed Development Tasks and User Stories](#detailed-development-tasks-and-user-stories)
4. [System Architecture Overview](#system-architecture-overview)
5. [Clarifying Questions](#clarifying-questions)

---

## Introduction

This document outlines the comprehensive requirements for building an AI-orchestrated payroll system that can dynamically generate and hot-plug C# rule functions. The system leverages AI to manage the selection and creation of rule-specific functions ("agents") that perform the actual classification of employee work hours into various pay codes.

### Key Features
- **Dynamic Rule Generation**: AI-powered creation of C# functions for new payroll rules
- **Hot-Plugging**: Runtime compilation and loading of new rule functions
- **Multi-Organization Support**: Scalable architecture supporting 100+ organizations and 10,000+ employees
- **Human-in-the-Loop**: All AI-generated code requires human approval before deployment
- **Comprehensive Audit Trail**: Complete logging of all decisions and changes

---

## Step-by-Step Development Plan

### Step 1: Core Infrastructure Setup

**Objective**: Create a .NET 8.0 Web API project with clean architecture foundation

#### Requirements:
1. **Project Structure**: Following clean architecture principles
2. **Entity Framework Core**: SQL Server integration for data persistence
3. **OpenAI API Integration**: Using OpenAI .NET SDK for AI capabilities
4. **Core Models**:
   - **Shift**: `EmployeeId`, `StartTime`, `EndTime`, `OrganizationId`
   - **PayRule**: `Id`, `Name`, `Description`, `GeneratedCode`, `IsActive`, `CreatedDate`
   - **ClassificationResult**: `ShiftId`, `PayCode`, `Hours`, `Rate`
   - **RuleGenerationRequest**: `RuleDescription`, `Intent`, `GeneratedCode`, `Status`

5. **Core Interfaces**:
   - `IPayRuleClassifier`: For dynamically loaded functions
   - `IRuleGenerationService`: For AI rule creation
   - `ICodeCompilationService`: For hot-plugging C# code

6. **Essential NuGet Packages**:
   - `Microsoft.EntityFrameworkCore.SqlServer`
   - `OpenAI` (official SDK)
   - `Microsoft.CodeAnalysis.CSharp` (for runtime compilation)
   - `Swashbuckle.AspNetCore` (for API docs)

7. **Infrastructure Setup**:
   - Basic DbContext with migrations
   - Dependency injection configuration
   - Development environment configuration for local SQL Server

---

### Step 2: AI-Powered Rule Generation System

**Objective**: Implement the intelligent rule generation and intent extraction system

#### Components:

1. **RuleGenerationService**:
   - Takes natural language rule descriptions
   - Uses OpenAI API to extract structured intent
   - Uses OpenAI API to generate C# function code
   - Validates generated code syntax
   - Stores results in database

2. **Intent Extraction Prompt Design**:
   ```
   Extract the intent from this payroll rule statement.
   Focus on: time calculations, conditions, thresholds, pay code types.

   Rule: "{ruleStatement}"
   Description: "{description}"

   Respond with structured intent in this format:
   - Calculation Type: [overtime/regular/holiday/etc]
   - Conditions: [time thresholds, day conditions, etc]
   - Logic: [step-by-step calculation logic]
   ```

3. **Code Generation Prompt Design**:
   ```csharp
   // Prompt template for code generation
   Generate a C# method that implements this payroll rule intent.

   INTENT: {extractedIntent}

   REQUIREMENTS:
   - Method signature: public static ShiftClassificationResult CalculatePayroll(Shift shift)
   - Return ShiftClassificationResult with PayCodeAllocations
   - Use DateTime calculations for time spans
   - Handle edge cases appropriately
   - Include descriptive comments

   EXAMPLE OUTPUT STRUCTURE:
   public static ShiftClassificationResult CalculatePayroll(Shift shift)
   {
     // Implementation here
     return new ShiftClassificationResult { ... };
   }
   ```

4. **Example Rule Scenarios**:
   - "Overtime pay at 1.5x rate after 8 hours in a day"
   - "Double time on Sundays for all hours worked"
   - "Night differential of $2/hour for shifts between 11 PM and 7 AM"

5. **CodeCompilationService**:
   - Compiles C# code at runtime using Roslyn
   - Loads compiled assemblies dynamically
   - Manages function lifecycle and cleanup
   - Handles compilation errors gracefully

---

### Step 3: Dynamic Function Loading System

**Objective**: Enable hot-plugging of AI-generated rules with safety measures

#### Components:

1. **DynamicRuleExecutor**:
   - Maintains registry of active rule functions
   - Loads compiled C# functions at runtime
   - Routes shift data to appropriate functions
   - Handles function lifecycle (add, remove, update)
   - Manages function isolation and error handling

2. **Function Template System**:
   - Standard function signature for all generated rules
   - Common helper methods available to generated functions
   - Standard input/output contracts
   - Safe execution environment with timeouts

3. **Rule Orchestrator**:
   - Determines which rules apply to each shift
   - Executes rules in proper order
   - Combines results from multiple rules
   - Handles conflicts and precedence

4. **Hot-Plug API Endpoints**:
   - `POST /api/rules/generate` - Generate new rule from description
   - `POST /api/rules/{id}/activate` - Activate a generated rule
   - `GET /api/rules/active` - List active rules
   - `DELETE /api/rules/{id}` - Deactivate a rule

5. **Safety Features**:
   - Sandboxed execution environment
   - Memory and CPU limits for generated functions
   - Automatic rollback on function errors
   - Audit trail of all rule changes

---

### Step 4: API Controllers and Business Logic

**Objective**: Create comprehensive API endpoints and business services

#### Controllers:

1. **ShiftController**:
   - `POST /api/shifts/classify` - Classify single shift or batch
   - `GET /api/shifts/{id}/classification` - Get classification results
   - `POST /api/shifts/test-rule` - Test a rule against sample data

2. **RuleManagementController**:
   - `POST /api/rules/create-from-description` - Create rule from natural language
   - `GET /api/rules` - List all rules with status
   - `PUT /api/rules/{id}/status` - Activate/deactivate rule
   - `GET /api/rules/{id}/code` - View generated code
   - `POST /api/rules/{id}/test` - Test rule with sample data

3. **Core Business Services**:
   - **ShiftClassificationService**: Main orchestrator
   - **RuleValidationService**: Validate generated rules
   - **TestDataService**: Generate test scenarios

4. **Built-in Default Rule**:
   ```csharp
   public static ShiftClassificationResult CalculateRegularHours(Shift shift)
   {
     var totalHours = shift.EndDateTime - shift.StartDateTime;
     return new ShiftClassificationResult
     {
       EmployeeName = shift.EmployeeName,
       ShiftStart = shift.StartDateTime,
       ShiftEnd = shift.EndDateTime,
       PayCodeAllocations = new List<PayCodeAllocation>
       {
         new PayCodeAllocation
         {
           PayCodeName = "Regular",
           Hours = totalHours,
           Description = "Regular working hours"
         }
       }
     };
   }
   ```

5. **Request/Response DTOs**:
   - `ShiftClassificationRequest`/`Response`
   - `RuleGenerationRequest`/`Response`
   - `TestRuleRequest`/`Response`

6. **Error Handling**:
   - Global exception handler
   - Validation error responses
   - AI service timeout handling
   - Database connection error handling

---

### Step 5: Angular 20 Frontend

**Objective**: Create a compelling demo interface showcasing AI rule generation

#### Key Pages and Components:

1. **Rule Generation Page**:
   - Text area for entering natural language rule descriptions
   - "Generate Rule" button that calls the AI service
   - Display of extracted intent in structured format
   - Display of generated C# code with syntax highlighting
   - "Test Rule" functionality with sample shift data
   - "Activate Rule" button to make the rule live

2. **Rule Management Dashboard**:
   - List of all rules (active/inactive)
   - Rule performance metrics
   - Quick activate/deactivate toggles
   - Code preview in collapsible sections

3. **Shift Testing Interface**:
   - Form to input shift details manually
   - CSV upload for batch testing
   - Real-time classification results
   - Comparison view showing which rules applied

4. **Live Demo Components**:
   - Step-by-step wizard showing the entire process
   - Sample rule descriptions users can try
   - Before/after comparison showing rule effects

5. **Technical Features**:
   - Real-time API calls with loading states
   - Error handling and user feedback
   - Code syntax highlighting using Prism.js
   - Responsive design with Angular Material
   - Form validation and input sanitization

---

### Step 6: Testing and Demo Scenarios

**Objective**: Comprehensive testing framework and compelling demo scenarios

#### Demo Rule Scenarios:

1. **Basic Overtime**: "Overtime at 1.5x rate after 8 hours, double time after 12 hours"
2. **Night Differential**: "Night shift differential: $3/hour extra for shifts starting after 10 PM"
3. **Weekend Premium**: "Weekend premium: 1.25x rate for Saturday, 1.5x rate for Sunday"
4. **Holiday Pay**: "Holiday pay: double time for work on federal holidays"

#### Test Data Generator:
- Various shift patterns (regular, overtime, night, weekend, holiday)
- Edge cases (midnight crossover, very short shifts, very long shifts)
- Multiple employee scenarios
- Different organizations with different rules

#### Integration Tests:
- End-to-end rule generation flow
- Function hot-plugging and execution
- Multiple rules working together
- Error scenarios and recovery
- Performance with multiple concurrent rules

#### Demo Script:
1. **Step 1**: System starts with basic overtime rule
2. **Step 2**: User enters new rule description
3. **Step 3**: AI extracts intent and shows structured data
4. **Step 4**: AI generates C# code
5. **Step 5**: User tests rule with sample data
6. **Step 6**: User activates rule
7. **Step 7**: System processes shifts using new rule
8. **Step 8**: Results show new rule in action

#### Validation Tests:
- Verify generated functions compile correctly
- Ensure rule logic matches description
- Test function isolation and safety
- Validate performance and memory usage

---

## Detailed Development Tasks and User Stories

### Phase 1: Core Infrastructure Setup

#### Task 1.1: Database Schema Setup

**User Story**: As a system administrator, I need the database schemas created so that rules and shift data can be stored.

**Technical Tasks**:
- Create SQL Server database `PayrollPOC`
- Create `Rules` table:
  ```sql
  CREATE TABLE Rules (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    RuleStatement NVARCHAR(500) NOT NULL,
    RuleDescription NVARCHAR(1000),
    FunctionName NVARCHAR(100) NOT NULL,
    IsActive BIT DEFAULT 1,
    Version INT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(100)
  )
  ```
- Create `RuleExecutions` table for audit:
  ```sql
  CREATE TABLE RuleExecutions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    RuleId UNIQUEIDENTIFIER REFERENCES Rules(Id),
    EmployeeName NVARCHAR(100),
    ShiftStart DATETIME2,
    ShiftEnd DATETIME2,
    ResultJson NVARCHAR(MAX),
    ExecutedAt DATETIME2 DEFAULT GETUTCDATE()
  )
  ```
- Create `GeneratedFunctions` table:
  ```sql
  CREATE TABLE GeneratedFunctions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    RuleId UNIQUEIDENTIFIER REFERENCES Rules(Id),
    FunctionName NVARCHAR(100),
    GeneratedCode NVARCHAR(MAX),
    CompilationStatus NVARCHAR(50),
    CompilationErrors NVARCHAR(MAX),
    CreatedAt DATETIME2 DEFAULT GETUTCDATE()
  )
  ```

#### Task 1.2: Qdrant Vector Database Setup

**User Story**: As a system, I need vector storage capability to find similar rules efficiently.

**Technical Tasks**:
- Set up Qdrant Docker container
- Create collection `rule_embeddings` with 384-dimensional vectors (for sentence transformers)
- Create connection service and configuration
- Implement embedding generation using sentence-transformers model

#### Task 1.3: Ollama Integration Setup

**User Story**: As a system, I need LLM capabilities for intent extraction and code generation.

**Technical Tasks**:
- Install and configure Ollama with llama3.2 and qwen2.5-coder models
- Create `IOllamaService` interface
- Implement Ollama HTTP client wrapper
- Create prompt templates for intent extraction and code generation

### Phase 2: Core Domain Models & Services

#### Task 2.1: Domain Models

**User Story**: As a developer, I need well-defined models to represent shifts, rules, and classifications.

**Technical Tasks**:
- Create `Shift` model:
  ```csharp
  public class Shift
  {
    public string EmployeeName { get; set; }
    public DateTime StartDateTime { get; set; }
    public DateTime EndDateTime { get; set; }
  }
  ```
- Create `Rule` entity model
- Create `ShiftClassificationResult` and `PayCodeAllocation` models
- Create DTOs for API contracts

#### Task 2.2: Repository Pattern Implementation

**User Story**: As a developer, I need data access abstractions for clean architecture.

**Technical Tasks**:
- Create `IRuleRepository` interface
- Implement `RuleRepository` with Entity Framework Core
- Create `IVectorRepository` interface for Qdrant operations
- Implement `VectorRepository` with Qdrant client

#### Task 2.3: Rule Management Service

**User Story**: As a system, I need centralized rule management logic.

**Technical Tasks**:
- Create `IRuleManagementService` interface
- Implement core methods:
  - `GetSimilarRulesAsync(string ruleStatement)`
  - `CreateRuleAsync(string statement, string description)`
  - `GetRuleByIdAsync(Guid id)`
  - `GetActiveRulesAsync()`

### Phase 3: LLM Integration & Code Generation

#### Task 3.1: Intent Extraction Service

**User Story**: As a system, I need to extract intent from natural language rule statements.

**Technical Tasks**:
- Create `IIntentExtractionService` interface
- Implement service using llama3.2 model
- Create structured prompt template:
  ```
  Extract the intent from this payroll rule statement.
  Focus on: time calculations, conditions, thresholds, pay code types.

  Rule: "{ruleStatement}"
  Description: "{description}"

  Respond with structured intent in this format:
  - Calculation Type: [overtime/regular/holiday/etc]
  - Conditions: [time thresholds, day conditions, etc]
  - Logic: [step-by-step calculation logic]
  ```

#### Task 3.2: Code Generation Service

**User Story**: As a system, I need to generate C# functions that implement payroll rules.

**Technical Tasks**:
- Create `ICodeGenerationService` interface
- Implement service using qwen2.5-coder model
- Create detailed prompt template with function signature requirements:
  ```csharp
  // Prompt template for code generation
  Generate a C# method that implements this payroll rule intent.

  INTENT: {extractedIntent}

  REQUIREMENTS:
  - Method signature: public static ShiftClassificationResult CalculatePayroll(Shift shift)
  - Return ShiftClassificationResult with PayCodeAllocations
  - Use DateTime calculations for time spans
  - Handle edge cases appropriately
  - Include descriptive comments

  EXAMPLE OUTPUT STRUCTURE:
  public static ShiftClassificationResult CalculatePayroll(Shift shift)
  {
    // Implementation here
    return new ShiftClassificationResult { ... };
  }
  ```

#### Task 3.3: Dynamic Code Compilation Service

**User Story**: As a system, I need to compile and load generated C# code at runtime.

**Technical Tasks**:
- Create `ICodeCompilationService` interface
- Implement using Microsoft.CodeAnalysis.CSharp
- Create isolated Assembly Loading Context
- Implement function registry for managing loaded functions
- Add compilation error handling and logging

---

## System Architecture Overview

### Technology Stack
- **Backend**: .NET 8.0 Web API
- **Database**: SQL Server + Entity Framework Core
- **Vector Database**: Qdrant
- **AI/LLM**: Ollama (llama3.2 + qwen2.5-coder)
- **Frontend**: Angular 20
- **Runtime Compilation**: Microsoft.CodeAnalysis.CSharp

### Key Architectural Patterns
- **Clean Architecture**: Separation of concerns with domain, application, and infrastructure layers
- **Repository Pattern**: Data access abstraction
- **Dependency Injection**: Loose coupling and testability
- **CQRS**: Command and Query Responsibility Segregation for complex operations
- **Event-Driven**: Audit logging and rule lifecycle management

### Security Considerations
- **Role-Based Access Control (RBAC)**: Multiple user roles with specific permissions
- **Audit Logging**: Comprehensive tracking of all system actions
- **Code Sandboxing**: Safe execution of dynamically generated functions
- **Input Validation**: Protection against injection attacks
- **Data Encryption**: Secure handling of sensitive employee data

### Scalability Features
- **Multi-Tenant Architecture**: Support for 100+ organizations
- **Horizontal Scaling**: Stateless design enabling load balancing
- **Caching Strategy**: Performance optimization for frequently used rules
- **Batch Processing**: Efficient handling of large shift datasets
- **Resource Limits**: Memory and CPU constraints for generated functions

---

## Next Steps

1. **Set Up Development Environment**: Configure local development infrastructure
2. **Phase 1 Implementation**: Begin with core infrastructure setup
3. **Iterative Development**: Follow the 6-step development plan with regular reviews
4. **Testing & Validation**: Implement comprehensive testing at each phase
5. **Demo Preparation**: Create compelling demonstration scenarios

This comprehensive PRD provides the foundation for building a robust, scalable, and innovative AI-orchestrated payroll system that can adapt to diverse organizational needs while maintaining security and compliance standards.