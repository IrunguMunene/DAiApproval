import { Component, OnInit } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
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

  constructor(
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

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
    this.isLoading = true;
    
    this.apiService.getAllRules(this.selectedOrganization).subscribe({
      next: (rules) => {
        this.allRules = rules;
        this.filterRules();
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.snackBar.open(`Error loading rules: ${error.message}`, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        this.allRules = [];
        this.filterRules();
      }
    });
  }

  loadRulesWithErrors() {
    this.apiService.getRulesWithCompilationErrors(this.selectedOrganization).subscribe({
      next: (rules) => {
        this.rulesWithErrors = rules;
      },
      error: (error) => {
        console.error('Error loading rules with compilation errors:', error);
        this.rulesWithErrors = [];
      }
    });
  }

  refreshRules() {
    this.selection.clear();
    this.loadRules();
    this.loadRulesWithErrors();
    this.snackBar.open('Rules refreshed successfully', 'Close', { duration: 2000 });
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
        this.snackBar.open(`Rule ${action} successfully`, 'Close', { 
          duration: 3000,
          panelClass: rule.isActive ? ['success-snackbar'] : ['warning-snackbar']
        });
        
        this.filterRules();
      },
      error: (error) => {
        rule.isProcessing = false;
        this.snackBar.open(`Error updating rule: ${error.message}`, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
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
    const selectedRules = this.selection.selected.filter(rule => !rule.isActive);
    
    if (selectedRules.length === 0) {
      this.snackBar.open('No inactive rules selected', 'Close', {
        duration: 3000,
        panelClass: ['warning-snackbar']
      });
      return;
    }
    
    let completedCount = 0;
    let errorCount = 0;
    
    selectedRules.forEach(rule => {
      rule.isProcessing = true;
      
      this.apiService.activateRule(rule.id).subscribe({
        next: () => {
          rule.isActive = true;
          rule.isProcessing = false;
          completedCount++;
          
          if (completedCount + errorCount === selectedRules.length) {
            this.selection.clear();
            this.filterRules();
            
            if (errorCount === 0) {
              this.snackBar.open(`${completedCount} rules activated successfully`, 'Close', {
                duration: 3000,
                panelClass: ['success-snackbar']
              });
            } else {
              this.snackBar.open(`${completedCount} rules activated, ${errorCount} failed`, 'Close', {
                duration: 5000,
                panelClass: ['warning-snackbar']
              });
            }
          }
        },
        error: (error) => {
          rule.isProcessing = false;
          errorCount++;
          
          if (completedCount + errorCount === selectedRules.length) {
            this.selection.clear();
            this.filterRules();
            
            this.snackBar.open(`${completedCount} rules activated, ${errorCount} failed`, 'Close', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        }
      });
    });
  }

  bulkDeactivate() {
    const selectedRules = this.selection.selected.filter(rule => rule.isActive);
    
    if (selectedRules.length === 0) {
      this.snackBar.open('No active rules selected', 'Close', {
        duration: 3000,
        panelClass: ['warning-snackbar']
      });
      return;
    }
    
    let completedCount = 0;
    let errorCount = 0;
    
    selectedRules.forEach(rule => {
      rule.isProcessing = true;
      
      this.apiService.deactivateRule(rule.id).subscribe({
        next: () => {
          rule.isActive = false;
          rule.isProcessing = false;
          completedCount++;
          
          if (completedCount + errorCount === selectedRules.length) {
            this.selection.clear();
            this.filterRules();
            
            if (errorCount === 0) {
              this.snackBar.open(`${completedCount} rules deactivated successfully`, 'Close', {
                duration: 3000,
                panelClass: ['success-snackbar']
              });
            } else {
              this.snackBar.open(`${completedCount} rules deactivated, ${errorCount} failed`, 'Close', {
                duration: 5000,
                panelClass: ['warning-snackbar']
              });
            }
          }
        },
        error: (error) => {
          rule.isProcessing = false;
          errorCount++;
          
          if (completedCount + errorCount === selectedRules.length) {
            this.selection.clear();
            this.filterRules();
            
            this.snackBar.open(`${completedCount} rules deactivated, ${errorCount} failed`, 'Close', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        }
      });
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
        this.snackBar.open(`Error updating rule: ${error.message}`, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
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

}
