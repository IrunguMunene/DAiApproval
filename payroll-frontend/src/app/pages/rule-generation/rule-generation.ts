import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';
import { ErrorHandlerService } from '../../services/error-handler.service';
import { LoadingStateService } from '../../services/loading-state.service';
import { RuleGenerationRequest, RuleGenerationResponse, ShiftClassificationResult, TestRuleRequest, VectorSearchResult, SimilaritySearchRequest } from '../../models';

@Component({
  selector: 'app-rule-generation',
  standalone: false,
  templateUrl: './rule-generation.html',
  styleUrl: './rule-generation.scss'
})
export class RuleGeneration implements OnInit {
  ruleForm!: FormGroup;
  intentForm!: FormGroup;
  currentLoadingStep = '';

  // Loading context for this component
  private loadingContext: any;

  // Legacy loading state properties for template compatibility
  get isLoading(): boolean {
    return this.isExtractingIntent || this.loadingContext?.isLoading('generateRule') || false;
  }

  get testingRule(): boolean {
    return this.isTestingRule;
  }

  get activatingRule(): boolean {
    return this.isActivatingRule;
  }

  get generatingCode(): boolean {
    return this.isGeneratingCode || this.loadingContext?.isLoading('generateCode') || false;
  }
  
  // Workflow state
  currentStep: 'input' | 'intent-review' | 'results' = 'input';
  generationResult: RuleGenerationResponse | null = null;
  testResults: ShiftClassificationResult | null = null;

  // Similarity search
  similarRules: VectorSearchResult | null = null;
  showingSimilarRules = false;
  searchingSimilarRules = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private errorHandler: ErrorHandlerService,
    private loadingStateService: LoadingStateService
  ) {
    this.loadingContext = this.loadingStateService.createLoadingContext('RuleGeneration');
  }

  ngOnInit() {
    this.ruleForm = this.fb.group({
      ruleStatement: ['', Validators.required],
      ruleDescription: [''],
      organizationId: ['demo-org', Validators.required],
      exampleShiftStart: ['', Validators.required],
      exampleShiftEnd: ['', Validators.required],
      expectedOutcome: ['', Validators.required]
    });

    this.intentForm = this.fb.group({
      reviewedIntent: ['', Validators.required]
    });
  }

  // Loading state getters
  get isExtractingIntent(): boolean {
    return this.loadingContext?.isLoading('extractIntent') || false;
  }

  get isGeneratingCode(): boolean {
    return this.loadingContext?.isLoading('generateCode') || false;
  }

  get isTestingRule(): boolean {
    return this.loadingContext?.isLoading('testRule') || false;
  }

  get isActivatingRule(): boolean {
    return this.loadingContext?.isLoading('activateRule') || false;
  }

  // Step 1: Extract Intent
  extractIntent() {
    if (this.ruleForm.valid) {
      this.generationResult = null;
      this.testResults = null;
      this.currentLoadingStep = 'Extracting intent from your rule description...';
      
      const request: RuleGenerationRequest = {
        ruleStatement: this.ruleForm.value.ruleStatement,
        ruleDescription: this.ruleForm.value.ruleDescription,
        organizationId: this.ruleForm.value.organizationId,
        exampleShiftStart: this.ruleForm.value.exampleShiftStart,
        exampleShiftEnd: this.ruleForm.value.exampleShiftEnd,
        expectedOutcome: this.ruleForm.value.expectedOutcome
      };
      
      const wrappedCall = this.loadingContext.wrapLoading(
        this.apiService.extractIntent(request),
        'extractIntent',
        'Extracting intent from rule description...'
      );

      wrappedCall.subscribe({
        next: (result: RuleGenerationResponse) => {
          this.generationResult = result;
          this.intentForm.patchValue({
            reviewedIntent: result.intent
          });
          this.currentLoadingStep = '';
          this.currentStep = 'intent-review';
          
          this.errorHandler.handleSuccess('Intent extracted successfully! Please review and edit if needed.', 4000);
        },
        error: (error: any) => {
          this.currentLoadingStep = '';
          
          this.errorHandler.handleApiError(error, {
            action: 'extracting intent',
            component: 'RuleGeneration'
          });
        }
      });
    }
  }

  // Step 2: Generate Code from Reviewed Intent (with similarity check)
  generateCode() {
    if (this.intentForm.valid && this.generationResult) {
      this.currentLoadingStep = 'Checking for similar rules...';
      
      const reviewedIntent = this.intentForm.value.reviewedIntent;
      
      // First, search for similar rules using rule statement + description + reviewed intent
      this.searchSimilarRulesBeforeGeneration(reviewedIntent);
    }
  }

  private searchSimilarRulesBeforeGeneration(reviewedIntent: string) {
    const ruleStatement = this.ruleForm.value.ruleStatement;
    const ruleDescription = this.ruleForm.value.ruleDescription || '';
    const fullRuleText = `${ruleStatement} ${ruleDescription} ${reviewedIntent}`;
    
    const request: SimilaritySearchRequest = {
      ruleText: fullRuleText,
      organizationId: this.ruleForm.value.organizationId || 'demo-org'
    };
    
    this.apiService.searchSimilarRules(request).subscribe({
      next: (result) => {
        this.similarRules = result;
        
        if (result.hasSimilarRules) {
          this.showingSimilarRules = true;
          this.currentLoadingStep = '';
          
          this.errorHandler.handleWarning(`Found ${result.similarRules.length} similar rules! Please review before proceeding.`, 5000);
        } else {
          // No similar rules found, proceed with code generation
          this.proceedWithCodeGeneration(reviewedIntent);
        }
      },
      error: (error) => {
        console.warn('Similarity search failed (non-critical):', error);
        // If similarity search fails, proceed with code generation anyway
        this.proceedWithCodeGeneration(reviewedIntent);
      }
    });
  }

  proceedWithCodeGeneration(reviewedIntent: string) {
    this.showingSimilarRules = false;
    this.currentLoadingStep = 'Generating C# code from your reviewed intent...';
    
    const wrappedCall = this.loadingContext.wrapLoading(
      this.apiService.generateCode(this.generationResult!.id, reviewedIntent),
      'generateCode',
      'Generating C# code from reviewed intent...'
    );

    wrappedCall.subscribe({
      next: (result: RuleGenerationResponse) => {
        this.generationResult = result;
        this.currentLoadingStep = '';
        this.currentStep = 'results';
        
        this.errorHandler.handleSuccess('Code generated successfully!', 3000);
      },
      error: (error: any) => {
        this.currentLoadingStep = '';
        
        this.errorHandler.handleApiError(error, {
          action: 'generating code',
          component: 'RuleGeneration'
        });
      }
    });
  }

  // User decides to continue with code generation despite similar rules
  continueWithGeneration() {
    if (this.intentForm.valid && this.generationResult) {
      const reviewedIntent = this.intentForm.value.reviewedIntent;
      this.proceedWithCodeGeneration(reviewedIntent);
    }
  }

  hideSimilarRules() {
    this.showingSimilarRules = false;
  }

  // Legacy method for backwards compatibility
  generateRule() {
    if (this.ruleForm.valid) {
      this.generationResult = null;
      this.testResults = null;
      this.currentLoadingStep = 'Generating rule (single step)...';
      
      const request: RuleGenerationRequest = {
        ruleStatement: this.ruleForm.value.ruleStatement,
        ruleDescription: this.ruleForm.value.ruleDescription,
        organizationId: this.ruleForm.value.organizationId,
        exampleShiftStart: this.ruleForm.value.exampleShiftStart,
        exampleShiftEnd: this.ruleForm.value.exampleShiftEnd,
        expectedOutcome: this.ruleForm.value.expectedOutcome
      };
      
      const wrappedCall = this.loadingContext.wrapLoading(
        this.apiService.generateRule(request),
        'generateRule',
        'Generating rule (single step)...'
      );

      wrappedCall.subscribe({
        next: (result: RuleGenerationResponse) => {
          this.generationResult = result;
          this.currentLoadingStep = '';
          this.currentStep = 'results';
          
          this.errorHandler.handleSuccess('Rule generated successfully!', 3000);
        },
        error: (error: any) => {
          this.currentLoadingStep = '';
          
          this.errorHandler.handleApiError(error, {
            action: 'generating rule',
            component: 'RuleGeneration'
          });
        }
      });
    }
  }


  // Navigation methods
  goBackToInput() {
    this.currentStep = 'input';
    this.generationResult = null;
    this.testResults = null;
  }

  goBackToIntentReview() {
    this.currentStep = 'intent-review';
    this.testResults = null;
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
    this.intentForm.reset({
      reviewedIntent: ''
    });
    this.generationResult = null;
    this.testResults = null;
    this.currentStep = 'input';
  }

  testRule() {
    if (!this.generationResult) return;
    
    const testRequest: TestRuleRequest = {
      shift: {
        employeeName: 'Test Employee',
        startDateTime: '2024-01-15T08:00:00',
        endDateTime: '2024-01-15T18:00:00',
        organizationId: this.ruleForm.value.organizationId
      }
    };
    
    const wrappedCall = this.loadingContext.wrapLoading(
      this.apiService.testRule(this.generationResult.id, testRequest),
      'testRule',
      'Testing generated rule...'
    );

    wrappedCall.subscribe({
      next: (response: any) => {
        if (response.success) {
          this.testResults = response.result;
          this.errorHandler.handleSuccess('Rule test completed!', 3000);
        } else {
          this.errorHandler.handleApiError({ message: response.error }, {
            action: 'testing rule',
            component: 'RuleGeneration'
          });
        }
      },
      error: (error: any) => {
        this.errorHandler.handleApiError(error, {
          action: 'testing rule',
          component: 'RuleGeneration'
        });
      }
    });
  }

  activateRule() {
    if (!this.generationResult) return;
    
    const wrappedCall = this.loadingContext.wrapLoading(
      this.apiService.activateRule(this.generationResult.id),
      'activateRule',
      'Activating rule...'
    );

    wrappedCall.subscribe({
      next: () => {
        this.errorHandler.handleSuccess('Rule activated successfully!', 3000);
      },
      error: (error: any) => {
        this.errorHandler.handleApiError(error, {
          action: 'activating rule',
          component: 'RuleGeneration'
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
    
    this.errorHandler.handleInfo('Try providing more specific details about your rule requirements', 5000);
  }

  private generateGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
