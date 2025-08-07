# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **fully implemented AI-Orchestrated Payroll System** that dynamically generates and hot-plugs C# rule functions for payroll classification. The system uses AI to create payroll rules from natural language descriptions and compiles them at runtime.

## Build and Run Commands

### Prerequisites
- .NET 9.0 SDK
- Ollama with llama3.2 and qwen2.5-coder models (optional for AI features)

**Note**: No database installation required - uses SQLite with automatic creation.

### Build Commands
```bash
# Build the entire solution
dotnet build

# Run the API (creates database automatically)
cd src/PayrollSystem.API/PayrollSystem.API
dotnet run
```

### Test Commands
```bash
# Run tests (when implemented)
dotnet test

# Check for build errors
dotnet build --verbosity normal
```

## Architecture Implementation

**Clean Architecture** with the following layers:
- **Domain** (`PayrollSystem.Domain`): Core entities, interfaces, and business models
- **Application** (`PayrollSystem.Application`): Business logic, services, and DTOs
- **Infrastructure** (`PayrollSystem.Infrastructure`): Data access, external services, and implementations
- **API** (`PayrollSystem.API`): Web API controllers and dependency injection setup

**Technology Stack**:
- **.NET 9.0 Web API** backend with clean architecture
- **Entity Framework Core 9.0** with SQLite (cross-platform, auto-creating)
- **Ollama Integration** (llama3.2 + qwen2.5-coder models) for AI rule generation
- **Microsoft.CodeAnalysis.CSharp** for runtime C# compilation
- **Repository Pattern** for data access abstraction
- **Swagger/OpenAPI** for API documentation

## Key System Components (Implemented)

1. **Rule Generation System** (`OllamaService`): AI-powered creation of C# functions from natural language
2. **Dynamic Function Loading** (`CodeCompilationService`): Hot-plugging of compiled C# rule functions at runtime
3. **Repository Pattern**: Clean data access with `IPayRuleRepository`, `IRuleExecutionRepository`, `IRuleGenerationRepository`
4. **Audit Trail**: Complete logging of rule executions and changes
5. **RESTful API**: Comprehensive endpoints for rule management and shift classification

## API Endpoints

### Rule Management
- `POST /api/rule/generate` - Generate new rule from natural language description
- `POST /api/rule/{id}/activate` - Activate a generated rule for use
- `POST /api/rule/{id}/deactivate` - Deactivate an active rule
- `GET /api/rule/active?organizationId=demo-org` - List active rules
- `GET /api/rule/generation-requests?organizationId=demo-org` - List rule generation requests
- `GET /api/rule/{id}` - Get specific rule by ID

### Shift Classification
- `POST /api/shift/classify` - Classify a single shift using active rules
- `POST /api/shift/classify-batch` - Classify multiple shifts in batch
- `POST /api/shift/test-rule/{ruleId}` - Test a specific rule against sample shift data

## Key Domain Models

### Core Entities
- **Shift**: Employee work periods with start/end times and organization
- **PayRule**: Generated rules with C# code, metadata, and activation status
- **RuleExecution**: Audit log of rule executions with results
- **RuleGenerationRequest**: AI rule creation requests with status tracking

### Result Models
- **ShiftClassificationResult**: Output of payroll classification with pay code allocations
- **PayCodeAllocation**: Individual pay code with hours, rate, and calculated amount
- **CompilationResult**: Results of C# code compilation with errors/warnings

## Database Schema

The system uses SQLite with Entity Framework Code-First approach:
- **PayRules**: Stores generated payroll rules and their C# code
- **RuleExecutions**: Audit trail of all rule executions
- **RuleGenerationRequests**: Tracks AI-generated rule requests and their status

Database is created automatically on first run with comprehensive initialization and error handling.

## Configuration

### Connection Strings
Default SQLite connection string in `appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=PayrollSystem.db"
  },
  "Ollama": {
    "BaseUrl": "http://localhost:11434"
  }
}
```

**Database File**: The SQLite database file `PayrollSystem.db` is created automatically in the API project directory on first run.

### Ollama Setup (Optional)
To use AI rule generation features:
1. Install Ollama
2. Pull required models: `ollama pull llama3.2` and `ollama pull qwen2.5-coder`
3. Ensure Ollama is running on `http://localhost:11434`

## Development Workflow

1. **Adding New Features**: Follow clean architecture patterns, add interfaces to Domain, implementations to Infrastructure
2. **Database Changes**: Modify entities in Domain layer, use EF migrations for schema updates
3. **API Changes**: Add controllers in API layer, ensure proper error handling and validation
4. **Testing**: Create unit tests for services, integration tests for API endpoints

## Important Notes

- **Security**: Generated C# functions are sandboxed and compiled in isolated contexts
- **Performance**: Uses runtime compilation with assembly unloading for memory management
- **Scalability**: Supports multi-organization architecture with proper data isolation
- **Error Handling**: Comprehensive error handling with detailed logging and user feedback

## Default Behavior

When no custom rules are active, the system applies a default rule that classifies all hours as "Regular" at $15.00/hour rate.