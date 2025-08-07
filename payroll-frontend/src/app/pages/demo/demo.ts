import { Component } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ShiftClassificationResult, RuleGenerationRequest, ShiftClassificationRequest } from '../../models';

@Component({
  selector: 'app-demo',
  standalone: false,
  templateUrl: './demo.html',
  styleUrl: './demo.scss'
})
export class Demo {
  demoStarted = false;
  currentStep = 0;
  isLoading = false;
  generatingRule = false;
  testingRule = false;
  
  exampleRuleDescription = 'Overtime pay at 1.5x rate after 8 hours per day';
  generatedCode = '';
  testResults: ShiftClassificationResult | null = null;

  constructor(private apiService: ApiService) {}

  startDemo() {
    this.demoStarted = true;
    this.currentStep = 0;
  }

  generateExampleRule() {
    this.generatingRule = true;
    this.isLoading = true;
    
    const request: RuleGenerationRequest = {
      ruleStatement: this.exampleRuleDescription,
      ruleDescription: 'Demonstration rule for overtime calculation',
      organizationId: 'demo-org'
    };
    
    this.apiService.generateRule(request).subscribe({
      next: (result) => {
        this.generatedCode = result.generatedCode;
        this.generatingRule = false;
        this.isLoading = false;
        this.currentStep = 1;
      },
      error: (error) => {
        console.warn('API call failed, using mock data:', error.message);
        // Fallback to simulated generation
        setTimeout(() => {
          this.generatedCode = `public static ShiftClassificationResult CalculatePayroll(Shift shift)
{
    var totalHours = (shift.EndDateTime - shift.StartDateTime).TotalHours;
    var regularHours = Math.Min(totalHours, 8.0);
    var overtimeHours = Math.Max(0, totalHours - 8.0);
    
    var allocations = new List<PayCodeAllocation>();
    
    if (regularHours > 0)
    {
        allocations.Add(new PayCodeAllocation
        {
            PayCodeName = "Regular",
            Hours = regularHours,
            Description = "Regular working hours"
        });
    }
    
    if (overtimeHours > 0)
    {
        allocations.Add(new PayCodeAllocation
        {
            PayCodeName = "Overtime",
            Hours = overtimeHours,
            Description = "Overtime hours at 1.5x rate"
        });
    }
    
    return new ShiftClassificationResult
    {
        EmployeeName = shift.EmployeeName,
        ShiftStart = shift.StartDateTime,
        ShiftEnd = shift.EndDateTime,
        PayCodeAllocations = allocations
    };
}`;
          
          this.generatingRule = false;
          this.isLoading = false;
          this.currentStep = 1;
        }, 2000);
      }
    });
  }

  testRule() {
    this.testingRule = true;
    this.isLoading = true;
    
    const request: ShiftClassificationRequest = {
      employeeName: 'John Doe',
      startDateTime: '2024-01-15T08:00:00',
      endDateTime: '2024-01-15T18:00:00',
      organizationId: 'demo-org'
    };
    
    this.apiService.classifyShift(request).subscribe({
      next: (result) => {
        this.testResults = result;
        this.testingRule = false;
        this.isLoading = false;
        this.currentStep = 2;
      },
      error: (error) => {
        console.warn('API call failed, using mock data:', error.message);
        // Fallback to simulated test results
        setTimeout(() => {
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
                description: 'Overtime hours at 1.5x rate'
              }
            ],
            totalHours: 10
          };
          
          this.testingRule = false;
          this.isLoading = false;
          this.currentStep = 2;
        }, 1500);
      }
    });
  }

  resetDemo() {
    this.demoStarted = false;
    this.currentStep = 0;
    this.generatedCode = '';
    this.testResults = null;
    this.generatingRule = false;
    this.testingRule = false;
    this.isLoading = false;
  }
}
