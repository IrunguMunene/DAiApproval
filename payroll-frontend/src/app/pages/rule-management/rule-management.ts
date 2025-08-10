import { Component, OnInit } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ErrorHandlerService } from '../../services/error-handler.service';
import { LoadingStateService } from '../../services/loading-state.service';
import { BulkOperationsService, BulkOperationConfig } from '../../services/bulk-operations.service';
import { PayRule, RuleGenerationResponse, UpdateRuleCodeRequest } from '../../models';
import { CompilationError, SaveCodeEvent } from '../../components/code-editor/code-editor';

@Component({
  selector: 'app-rule-management',
  standalone: false,
  templateUrl: './rule-management.html',
  styleUrl: './rule-management.scss'
})
export class RuleManagement implements OnInit {
  // Data properties
  allRules: PayRule[] = [];
  filteredRules: PayRule[] = [];
  rulesWithErrors: RuleGenerationResponse[] = [];
  selectedRuleForViewing: PayRule | null = null;
  selectedRuleCompilationErrors: CompilationError[] = [];
  isCodeEditorLoading: boolean = false;
  
  // UI State
  isLoading = false;
  searchTerm = '';
  statusFilter = 'all';
  selectedOrganization = 'demo-org';
  selectedTab = 0;
  
  // Table configuration
  displayedColumns: string[] = ['select', 'status', 'name', 'created', 'version', 'actions'];
  selection = new SelectionModel<PayRule>(true, []);

  // Loading context for this component
  private loadingContext: any;

  // Loading state getters
  get isLoadingRules(): boolean {
    return this.loadingContext?.isLoading('loadRules') || false;
  }

  get isLoadingErrors(): boolean {
    return this.loadingContext?.isLoading('loadErrors') || false;
  }

  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private router: Router,
    private errorHandler: ErrorHandlerService,
    private loadingStateService: LoadingStateService,
    private bulkOperations: BulkOperationsService
  ) {
    this.loadingContext = this.loadingStateService.createLoadingContext('RuleManagement');
  }

  ngOnInit() {
    this.loadRules();
    this.loadRulesWithErrors();
  }

  // Computed properties
  get activeRules(): PayRule[] {
    return this.allRules.filter(rule => rule.isActive);
  }

  get inactiveRules(): PayRule[] {
    return this.allRules.filter(rule => !rule.isActive);
  }

  get rulesRequiringManualReview(): RuleGenerationResponse[] {
    return this.rulesWithErrors.filter(rule => rule.requiresManualReview);
  }


  get selectedRules(): PayRule[] {
    return this.selection.selected;
  }

  // Data loading
  loadRules() {
    const wrappedCall = this.loadingContext.wrapLoading(
      this.apiService.getAllRules(this.selectedOrganization),
      'loadRules',
      'Loading rules...'
    );

    wrappedCall.subscribe({
      next: (rules: PayRule[]) => {
        this.allRules = rules;
        this.filterRules();
        // Remove the old isLoading = false since it's handled by loading service
      },
      error: (error: any) => {
        this.errorHandler.handleApiError(error, {
          action: 'loading rules',
          component: 'RuleManagement'
        });
        this.allRules = [];
        this.filterRules();
      }
    });
  }

  loadRulesWithErrors() {
    const wrappedCall = this.loadingContext.wrapLoading(
      this.apiService.getRulesWithCompilationErrors(this.selectedOrganization),
      'loadErrors',
      'Loading compilation errors...'
    );

    wrappedCall.subscribe({
      next: (rules: RuleGenerationResponse[]) => {
        this.rulesWithErrors = rules;
      },
      error: (error: any) => {
        this.errorHandler.handleApiError(error, {
          action: 'loading rules with compilation errors',
          component: 'RuleManagement'
        });
        this.rulesWithErrors = [];
      }
    });
  }

  refreshRules() {
    this.selection.clear();
    this.loadRules();
    this.loadRulesWithErrors();
    this.errorHandler.handleSuccess('Rules refreshed successfully', 2000);
  }

  // Filtering and search
  filterRules() {
    let filtered = [...this.allRules];

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(rule =>
        rule.ruleStatement.toLowerCase().includes(term) ||
        rule.ruleDescription.toLowerCase().includes(term) ||
        (rule.isActive ? 'active' : 'inactive').includes(term)
      );
    }

    // Apply status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(rule =>
        this.statusFilter === 'active' ? rule.isActive : !rule.isActive
      );
    }

    this.filteredRules = filtered;
  }

  // Table selection methods
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.filteredRules.length;
    return numSelected === numRows;
  }

  masterToggle() {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.filteredRules.forEach(row => this.selection.select(row));
    }
  }

  // Rule actions
  toggleRuleStatus(rule: PayRule) {
    rule.isProcessing = true;
    
    const apiCall = rule.isActive ? 
      this.apiService.deactivateRule(rule.id) : 
      this.apiService.activateRule(rule.id);
    
    apiCall.subscribe({
      next: () => {
        rule.isActive = !rule.isActive;
        rule.isProcessing = false;
        
        const action = rule.isActive ? 'activated' : 'deactivated';
        if (rule.isActive) {
          this.errorHandler.handleSuccess(`Rule ${action} successfully`);
        } else {
          this.errorHandler.handleWarning(`Rule ${action} successfully`);
        }
        
        this.filterRules();
      },
      error: (error) => {
        rule.isProcessing = false;
        this.errorHandler.handleApiError(error, {
          action: 'updating rule status',
          component: 'RuleManagement'
        });
      }
    });
  }

  viewRuleCode(rule: PayRule) {
    this.selectedRuleForViewing = rule;
  }

  closeCodeViewer() {
    this.selectedRuleForViewing = null;
    this.selectedRuleCompilationErrors = [];
    this.isCodeEditorLoading = false;
  }

  testRule(rule: PayRule) {
    this.router.navigate(['/rule-testing'], { 
      queryParams: { ruleId: rule.id } 
    });
  }

  duplicateRule(rule: PayRule) {
    this.router.navigate(['/rule-generation'], {
      queryParams: { 
        duplicate: rule.id,
        statement: rule.ruleStatement,
        description: rule.ruleDescription
      }
    });
  }

  exportRule(rule: PayRule) {
    const data = {
      id: rule.id,
      ruleStatement: rule.ruleStatement,
      ruleDescription: rule.ruleDescription,
      generatedCode: rule.generatedCode,
      isActive: rule.isActive,
      version: rule.version,
      createdAt: rule.createdAt,
      createdBy: rule.createdBy
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rule-${rule.ruleStatement.replace(/\s+/g, '-').toLowerCase()}.json`;
    link.click();
    
    window.URL.revokeObjectURL(url);
    this.snackBar.open('Rule exported successfully', 'Close', { duration: 2000 });
  }

  deleteRule(rule: PayRule) {
    const confirmed = confirm(`Are you sure you want to delete the rule "${rule.ruleStatement}"? This action cannot be undone.`);
    
    if (confirmed) {
      this.apiService.deleteRule(rule.id).subscribe({
        next: () => {
          this.allRules = this.allRules.filter(r => r.id !== rule.id);
          this.filterRules();
          this.selection.deselect(rule);
          
          this.snackBar.open('Rule deleted successfully', 'Close', { 
            duration: 3000,
            panelClass: ['warning-snackbar']
          });
        },
        error: (error) => {
          this.snackBar.open(`Error deleting rule: ${error.message}`, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  // Bulk actions
  bulkActivate() {
    const config: BulkOperationConfig<PayRule> = {
      items: this.selection.selected,
      filterCondition: (rule: PayRule) => !rule.isActive,
      apiCall: (rule: PayRule) => this.apiService.activateRule(rule.id),
      onSuccess: (rule: PayRule) => {
        rule.isActive = true;
      },
      operationName: 'activated',
      noItemsMessage: 'No inactive rules selected',
      processingProperty: 'isProcessing'
    };

    this.bulkOperations.performBulkOperation(config).subscribe(result => {
      if (result.totalCount > 0) {
        this.selection.clear();
        this.filterRules();
      }
    });
  }

  bulkDeactivate() {
    const config: BulkOperationConfig<PayRule> = {
      items: this.selection.selected,
      filterCondition: (rule: PayRule) => rule.isActive,
      apiCall: (rule: PayRule) => this.apiService.deactivateRule(rule.id),
      onSuccess: (rule: PayRule) => {
        rule.isActive = false;
      },
      operationName: 'deactivated',
      noItemsMessage: 'No active rules selected',
      processingProperty: 'isProcessing'
    };

    this.bulkOperations.performBulkOperation(config).subscribe(result => {
      if (result.totalCount > 0) {
        this.selection.clear();
        this.filterRules();
      }
    });
  }

  exportSelected() {
    const selectedRules = this.selection.selected;
    
    const data = selectedRules.map(rule => ({
      id: rule.id,
      ruleStatement: rule.ruleStatement,
      ruleDescription: rule.ruleDescription,
      generatedCode: rule.generatedCode,
      isActive: rule.isActive,
      version: rule.version,
      createdAt: rule.createdAt,
      createdBy: rule.createdBy
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payroll-rules-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    window.URL.revokeObjectURL(url);
    this.snackBar.open(`${selectedRules.length} rules exported successfully`, 'Close', { 
      duration: 3000 
    });
  }

  // Error rule handling methods are implemented below in auto-fix section

  // Utility methods
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }


  // Auto-fix related methods
  regenerateRule(rule: RuleGenerationResponse) {
    const confirmed = confirm(
      `Are you sure you want to regenerate the rule "${rule.ruleDescription}"? ` +
      'This will create a new version of the rule using AI.'
    );
    
    if (confirmed) {
      this.apiService.regenerateRule(rule.id).subscribe({
        next: () => {
          this.snackBar.open('Rule regeneration initiated successfully', 'Close', { 
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          // Refresh the rules to see the updated status
          this.loadRulesWithErrors();
        },
        error: (error) => {
          this.snackBar.open(`Error regenerating rule: ${error.message}`, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  deleteErrorRule(rule: RuleGenerationResponse) {
    const confirmed = confirm(
      `Are you sure you want to delete the failed rule "${rule.ruleDescription}"? ` +
      'This action cannot be undone.'
    );
    
    if (confirmed) {
      this.apiService.deleteRule(rule.id).subscribe({
        next: () => {
          this.rulesWithErrors = this.rulesWithErrors.filter(r => r.id !== rule.id);
          this.snackBar.open('Failed rule deleted successfully', 'Close', { 
            duration: 3000,
            panelClass: ['warning-snackbar']
          });
        },
        error: (error) => {
          this.snackBar.open(`Error deleting rule: ${error.message}`, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  getStatusChipClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'status-chip active-chip';
      case 'failed':
      case 'compilationfailed':
      case 'activationfailed':
        return 'status-chip error-chip';
      case 'autofixing':
        return 'status-chip auto-fixing-chip';
      case 'requiresmanualreview':
        return 'status-chip manual-review-chip';
      case 'codegenerated':
        return 'status-chip generated-chip';
      case 'pending':
        return 'status-chip pending-chip';
      default:
        return 'status-chip default-chip';
    }
  }

  // Code Editor Event Handlers
  onCodeChanged(code: string) {
    // Handle code changes if needed
    console.log('Code changed:', code.length, 'characters');
  }

  onSaveCode(event: SaveCodeEvent) {
    if (!this.selectedRuleForViewing) {
      console.error('No rule selected for editing');
      return;
    }

    console.log('Saving code for rule:', this.selectedRuleForViewing.id);
    console.log('Code length:', event.code.length);
    console.log('Modified by:', event.modifiedBy);

    this.isCodeEditorLoading = true;
    this.selectedRuleCompilationErrors = [];

    const request: UpdateRuleCodeRequest = {
      updatedCode: event.code,
      modifiedBy: event.modifiedBy
    };

    console.log('Sending update request:', request);

    this.apiService.updateRuleCode(this.selectedRuleForViewing.id, request).subscribe({
      next: (response) => {
        this.isCodeEditorLoading = false;
        
        if (response.success) {
          // Update the rule with new version
          if (response.updatedRule) {
            const ruleIndex = this.allRules.findIndex(r => r.id === this.selectedRuleForViewing!.id);
            if (ruleIndex !== -1) {
              this.allRules[ruleIndex] = response.updatedRule;
              this.selectedRuleForViewing = response.updatedRule;
              this.filterRules();
            }
          }

          this.snackBar.open(response.message, 'Close', {
            duration: 4000,
            panelClass: ['success-snackbar']
          });

          // Show warnings if any
          if (response.compilationWarnings.length > 0) {
            this.snackBar.open(`Saved with ${response.compilationWarnings.length} warnings`, 'Close', {
              duration: 3000,
              panelClass: ['warning-snackbar']
            });
          }
        } else {
          // Show compilation errors
          this.selectedRuleCompilationErrors = this.convertToCompilationErrors(response.compilationErrors);
          
          this.snackBar.open(response.message, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      },
      error: (error) => {
        this.isCodeEditorLoading = false;
        this.errorHandler.handleApiError(error, {
          action: 'updating rule code',
          component: 'RuleManagement'
        });
      }
    });
  }

  onResetCode() {
    if (!this.selectedRuleForViewing) return;

    this.selectedRuleCompilationErrors = [];
    this.snackBar.open('Code reset to original version', 'Close', {
      duration: 2000,
      panelClass: ['info-snackbar']
    });
  }

  onCompileCode(code: string) {
    if (!this.selectedRuleForViewing) return;

    this.isCodeEditorLoading = true;
    this.selectedRuleCompilationErrors = [];

    this.apiService.compileRuleCode(this.selectedRuleForViewing.id, code).subscribe({
      next: (response) => {
        this.isCodeEditorLoading = false;
        
        if (response.success) {
          this.snackBar.open('Code compiled successfully!', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        } else {
          this.selectedRuleCompilationErrors = this.convertToCompilationErrors(response.errors || []);
          this.snackBar.open('Compilation failed - see errors below', 'Close', {
            duration: 4000,
            panelClass: ['error-snackbar']
          });
        }
      },
      error: (error) => {
        this.isCodeEditorLoading = false;
        this.snackBar.open(`Compilation check failed: ${error.message}`, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  private convertToCompilationErrors(errorMessages: string[]): CompilationError[] {
    return errorMessages.map(error => {
      // Try to parse line numbers from error messages like "CS0103: error at line 15"
      const lineMatch = error.match(/line (\d+)/i);
      const line = lineMatch ? parseInt(lineMatch[1], 10) : 1;
      
      return {
        line: line,
        message: error,
        severity: 'error' as const
      };
    });
  }

  onRuleCodeSaved(event: { ruleId: string, code: string }) {
    console.log('Rule code saved:', event);
    
    // Find the rule in rulesWithErrors and update it
    const errorRuleIndex = this.rulesWithErrors.findIndex(r => r.id === event.ruleId);
    if (errorRuleIndex !== -1) {
      const errorRule = this.rulesWithErrors[errorRuleIndex];
      errorRule.generatedCode = event.code;
      errorRule.lastModified = new Date().toISOString();
      
      // If the rule was successfully saved, it might have moved to active rules
      // Refresh both lists to ensure consistency
      this.loadRules();
      this.loadRulesWithErrors();
      
      this.snackBar.open(`Rule "${errorRule.ruleDescription}" updated successfully!`, 'Close', {
        duration: 4000,
        panelClass: ['success-snackbar']
      });
    }
  }

}
