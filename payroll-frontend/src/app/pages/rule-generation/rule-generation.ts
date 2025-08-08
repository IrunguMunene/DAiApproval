import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';
import { RuleGenerationRequest, RuleGenerationResponse, ShiftClassificationResult, TestRuleRequest } from '../../models';

@Component({
  selector: 'app-rule-generation',
  standalone: false,
  templateUrl: './rule-generation.html',
  styleUrl: './rule-generation.scss'
})
export class RuleGeneration implements OnInit {
  ruleForm!: FormGroup;
  isLoading = false;
  testingRule = false;
  activatingRule = false;
  currentLoadingStep = '';
  
  generationResult: RuleGenerationResponse | null = null;
  testResults: ShiftClassificationResult | null = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.ruleForm = this.fb.group({
      ruleStatement: ['', Validators.required],
      ruleDescription: [''],
      organizationId: ['demo-org', Validators.required],
      exampleShiftStart: ['', Validators.required],
      exampleShiftEnd: ['', Validators.required],
      expectedOutcome: ['', Validators.required]
    });
  }

  generateRule() {
    if (this.ruleForm.valid) {
      this.isLoading = true;
      this.generationResult = null;
      this.testResults = null;
      
      const request: RuleGenerationRequest = {
        ruleStatement: this.ruleForm.value.ruleStatement,
        ruleDescription: this.ruleForm.value.ruleDescription,
        organizationId: this.ruleForm.value.organizationId,
        exampleShiftStart: this.ruleForm.value.exampleShiftStart,
        exampleShiftEnd: this.ruleForm.value.exampleShiftEnd,
        expectedOutcome: this.ruleForm.value.expectedOutcome
      };
      
      this.apiService.generateRule(request).subscribe({
        next: (result) => {
          this.generationResult = result;
          this.isLoading = false;
          this.currentLoadingStep = '';
          
          this.snackBar.open('Rule generated successfully!', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        },
        error: (error) => {
          this.isLoading = false;
          this.currentLoadingStep = '';
          
          this.snackBar.open(`Error generating rule: ${error.message}`, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }


  clearForm() {
    this.ruleForm.reset({
      ruleStatement: '',
      ruleDescription: '',
      organizationId: 'demo-org',
      exampleShiftStart: '',
      exampleShiftEnd: '',
      expectedOutcome: ''
    });
    this.generationResult = null;
    this.testResults = null;
  }

  testRule() {
    if (!this.generationResult) return;
    
    this.testingRule = true;
    
    const testRequest: TestRuleRequest = {
      shift: {
        employeeName: 'Test Employee',
        startDateTime: '2024-01-15T08:00:00',
        endDateTime: '2024-01-15T18:00:00',
        organizationId: this.ruleForm.value.organizationId
      }
    };
    
    this.apiService.testRule(this.generationResult.id, testRequest).subscribe({
      next: (response) => {
        if (response.success) {
          this.testResults = response.result;
          this.snackBar.open('Rule test completed!', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        } else {
          this.snackBar.open(`Test failed: ${response.error}`, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
        this.testingRule = false;
      },
      error: (error) => {
        this.testingRule = false;
        this.snackBar.open(`Error testing rule: ${error.message}`, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  activateRule() {
    if (!this.generationResult) return;
    
    this.activatingRule = true;
    
    this.apiService.activateRule(this.generationResult.id).subscribe({
      next: () => {
        this.activatingRule = false;
        this.snackBar.open('Rule activated successfully!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        this.activatingRule = false;
        this.snackBar.open(`Error activating rule: ${error.message}`, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  regenerateRule() {
    this.generationResult = null;
    this.testResults = null;
    this.generateRule();
  }

  copyCode() {
    if (this.generationResult?.generatedCode) {
      navigator.clipboard.writeText(this.generationResult.generatedCode).then(() => {
        this.snackBar.open('Code copied to clipboard!', 'Close', {
          duration: 2000
        });
      });
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  getPayCodeColor(payCode: string): 'primary' | 'accent' | 'warn' {
    switch (payCode.toLowerCase()) {
      case 'overtime': return 'accent';
      case 'holiday': return 'warn';
      default: return 'primary';
    }
  }

  formatCompilationError(error: string): string {
    // Clean up common C# compilation error patterns to make them more readable
    let formatted = error;
    
    // Remove file path information that's not useful to users
    formatted = formatted.replace(/\(.*?\)/g, '');
    
    // Make error codes more readable
    formatted = formatted.replace(/CS\d+:/g, (match) => `[${match.slice(0, -1)}] `);
    
    // Clean up common error messages
    formatted = formatted.replace(/error CS\d+:\s*/i, '');
    
    return formatted.trim();
  }

  improveRuleDescription(): void {
    // Focus on the rule statement field and provide guidance
    const ruleStatementControl = this.ruleForm.get('ruleStatement');
    const descriptionControl = this.ruleForm.get('ruleDescription');
    
    if (ruleStatementControl) {
      // Focus on the rule statement field
      setTimeout(() => {
        const element = document.querySelector('input[formControlName="ruleStatement"]') as HTMLElement;
        if (element) {
          element.focus();
        }
      }, 100);
      
      // Provide helpful guidance in the description field if it's empty
      if (descriptionControl && !descriptionControl.value) {
        descriptionControl.setValue(
          'Please provide more specific details about:\n' +
          '- When this rule should apply (conditions)\n' +
          '- How to calculate the pay (formula)\n' +
          '- Any special cases or exceptions\n' +
          '- Example: "For shifts longer than 8 hours, pay 1.5x regular rate for hours 9 and beyond"'
        );
      }
    }
    
    this.snackBar.open(
      'Try providing more specific details about your rule requirements', 
      'Close', 
      {
        duration: 5000,
        panelClass: ['info-snackbar']
      }
    );
  }

  private generateGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
