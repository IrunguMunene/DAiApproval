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
      organizationId: 'demo-org',
      exampleShiftStart: '',
      exampleShiftEnd: '',
      expectedOutcome: ''
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
