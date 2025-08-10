import { Component } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ErrorHandlerService } from '../../services/error-handler.service';
import { LoadingStateService } from '../../services/loading-state.service';
import { ShiftClassificationResult, RuleGenerationRequest, RuleGenerationResponse, ShiftClassificationRequest } from '../../models';

@Component({
  selector: 'app-demo',
  standalone: false,
  templateUrl: './demo.html',
  styleUrl: './demo.scss'
})
export class Demo {
  demoStarted = false;
  currentStep = 0;

  // Loading context for this component
  private loadingContext: any;

  // Legacy loading state properties for template compatibility
  get isLoading(): boolean {
    return this.generatingRule || this.testingRule;
  }

  get generatingRule(): boolean {
    return this.loadingContext?.isLoading('generateRule') || false;
  }

  get testingRule(): boolean {
    return this.loadingContext?.isLoading('testRule') || false;
  }
  
  exampleRuleDescription = 'Overtime pay at 1.5x rate after 8 hours per day';
  generatedCode = '';
  testResults: ShiftClassificationResult | null = null;

  constructor(
    private apiService: ApiService,
    private errorHandler: ErrorHandlerService,
    private loadingStateService: LoadingStateService
  ) {
    this.loadingContext = this.loadingStateService.createLoadingContext('Demo');
  }

  startDemo() {
    this.demoStarted = true;
    this.currentStep = 0;
  }

  generateExampleRule() {
    const request: RuleGenerationRequest = {
      ruleStatement: this.exampleRuleDescription,
      ruleDescription: 'Demonstration rule for overtime calculation',
      organizationId: 'demo-org',
      exampleShiftStart: '',
      exampleShiftEnd: '',
      expectedOutcome: ''
    };
    
    const wrappedCall = this.loadingContext.wrapLoading(
      this.apiService.generateRule(request),
      'generateRule',
      'Generating demo rule...'
    );

    wrappedCall.subscribe({
      next: (result: RuleGenerationResponse) => {
        this.generatedCode = result.generatedCode;
        this.currentStep = 1;
        this.errorHandler.handleSuccess('Rule generated successfully for demo!', 3000);
      },
      error: (error: any) => {
        this.errorHandler.handleApiError(error, {
          action: 'generating demo rule',
          component: 'Demo'
        });
        // Use mock data for demo purposes
        this.generateMockRule();
      }
    });
  }

  testRule() {
    const request: ShiftClassificationRequest = {
      employeeName: 'John Doe',
      startDateTime: '2024-01-15T08:00:00',
      endDateTime: '2024-01-15T18:00:00',
      organizationId: 'demo-org'
    };
    
    const wrappedCall = this.loadingContext.wrapLoading(
      this.apiService.classifyShift(request),
      'testRule',
      'Testing demo rule...'
    );

    wrappedCall.subscribe({
      next: (result: ShiftClassificationResult) => {
        this.testResults = result;
        this.currentStep = 2;
        this.errorHandler.handleSuccess('Demo rule tested successfully!', 3000);
      },
      error: (error: any) => {
        this.errorHandler.handleWarning('Using demo data for testing', 3000);
        // Use mock data for demo purposes
        this.generateMockTestResults();
      }
    });
  }

  resetDemo() {
    this.demoStarted = false;
    this.currentStep = 0;
    this.generatedCode = '';
    this.testResults = null;
    // Clear all loading states
    this.loadingContext.clearAllLoadingStates();
  }

  private generateMockRule() {
    // Mock C# rule code for demo
    this.generatedCode = `
public class OvertimeRule : IPayrollRule
{
    public ShiftClassificationResult ClassifyShift(ShiftData shift)
    {
        var totalHours = CalculateHours(shift.StartTime, shift.EndTime);
        var result = new ShiftClassificationResult
        {
            EmployeeName = shift.EmployeeName,
            ShiftStart = shift.StartTime,
            ShiftEnd = shift.EndTime,
            PayCodeAllocations = new List<PayCodeAllocation>()
        };

        // Regular hours (up to 8 hours)
        var regularHours = Math.Min(totalHours, 8);
        if (regularHours > 0)
        {
            result.PayCodeAllocations.Add(new PayCodeAllocation
            {
                PayCodeName = "Regular",
                Hours = regularHours,
                Description = "Regular working hours"
            });
        }

        // Overtime hours (over 8 hours at 1.5x rate)
        var overtimeHours = Math.Max(0, totalHours - 8);
        if (overtimeHours > 0)
        {
            result.PayCodeAllocations.Add(new PayCodeAllocation
            {
                PayCodeName = "Overtime",
                Hours = overtimeHours,
                Description = "Overtime at 1.5x rate"
            });
        }

        return result;
    }
}`;
    this.currentStep = 1;
  }

  private generateMockTestResults() {
    // Mock test results for demo
    this.testResults = {
      employeeName: 'John Doe',
      shiftStart: '2024-01-15T08:00:00',
      shiftEnd: '2024-01-15T18:00:00',
      payCodeAllocations: [
        {
          payCodeName: 'Regular',
          hours: 8,
          description: 'Regular working hours'
        },
        {
          payCodeName: 'Overtime',
          hours: 2,
          description: 'Overtime at 1.5x rate'
        }
      ],
      totalHours: 10
    };
    this.currentStep = 2;
  }
}
