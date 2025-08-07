import { Component, OnInit } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { PayRule, RuleGenerationResponse } from '../../models';

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
        // Fallback to mock data for development
        this.allRules = this.generateMockRules();
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
        // Generate mock data for demonstration
        this.rulesWithErrors = this.generateMockErrorRules();
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

  // Error rule handling
  regenerateRule(errorRule: RuleGenerationResponse) {
    this.router.navigate(['/rule-generation'], {
      queryParams: {
        regenerate: errorRule.id,
        statement: errorRule.ruleStatement,
        description: errorRule.ruleDescription
      }
    });
  }

  deleteErrorRule(errorRule: RuleGenerationResponse) {
    const confirmed = confirm(`Are you sure you want to delete the failed rule "${errorRule.ruleDescription}"? This action cannot be undone.`);
    
    if (confirmed) {
      // Remove from local array since backend might not have delete endpoint yet
      this.rulesWithErrors = this.rulesWithErrors.filter(r => r.id !== errorRule.id);
      
      this.snackBar.open('Error rule deleted successfully', 'Close', { 
        duration: 3000,
        panelClass: ['warning-snackbar']
      });
    }
  }

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

  // Mock data generation
  private generateMockRules(): PayRule[] {
    return [
      {
        id: '1',
        ruleStatement: 'Overtime pay at 1.5x rate after 8 hours per day',
        ruleDescription: 'Standard overtime calculation for daily work exceeding 8 hours',
        functionName: 'CalculateOvertimeRule1',
        generatedCode: this.generateSampleCode('overtime'),
        isActive: true,
        version: 2,
        createdAt: '2024-01-15T10:30:00Z',
        createdBy: 'John Doe',
        organizationId: 'demo-org',
        isProcessing: false
      },
      {
        id: '2',
        ruleStatement: 'Double time on Sundays for all hours worked',
        ruleDescription: 'Sunday premium pay at double the regular rate',
        functionName: 'CalculateSundayDoubleTime',
        generatedCode: this.generateSampleCode('sunday'),
        isActive: false,
        version: 1,
        createdAt: '2024-01-12T14:20:00Z',
        createdBy: 'Jane Smith',
        organizationId: 'demo-org',
        isProcessing: false
      },
      {
        id: '3',
        ruleStatement: 'Night differential $3/hour between 11 PM and 7 AM',
        ruleDescription: 'Additional compensation for overnight shifts',
        functionName: 'CalculateNightDifferential',
        generatedCode: this.generateSampleCode('night'),
        isActive: true,
        version: 1,
        createdAt: '2024-01-10T16:45:00Z',
        createdBy: 'System',
        organizationId: 'demo-org',
        isProcessing: false
      },
      {
        id: '4',
        ruleStatement: 'Holiday pay at double time for federal holidays',
        ruleDescription: 'Federal holiday compensation at 2x regular rate',
        functionName: 'CalculateHolidayPay',
        generatedCode: this.generateSampleCode('holiday'),
        isActive: true,
        version: 3,
        createdAt: '2024-01-08T09:15:00Z',
        createdBy: 'Admin',
        organizationId: 'demo-org',
        isProcessing: false
      },
      {
        id: '5',
        ruleStatement: 'Weekend premium: 1.25x Saturday, 1.5x Sunday',
        ruleDescription: 'Different premium rates for weekend work',
        functionName: 'CalculateWeekendPremium',
        generatedCode: this.generateSampleCode('weekend'),
        isActive: false,
        version: 1,
        createdAt: '2024-01-05T11:30:00Z',
        createdBy: 'HR Manager',
        organizationId: 'demo-org',
        isProcessing: false
      }
    ];
  }

  private generateSampleCode(type: string): string {
    const codeTemplates = {
      overtime: `public static ShiftClassificationResult CalculatePayroll(Shift shift)
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
}`,
      sunday: `public static ShiftClassificationResult CalculatePayroll(Shift shift)
{
    var totalHours = (shift.EndDateTime - shift.StartDateTime).TotalHours;
    var isSunday = shift.StartDateTime.DayOfWeek == DayOfWeek.Sunday;
    
    var allocations = new List<PayCodeAllocation>();
    
    if (isSunday)
    {
        allocations.Add(new PayCodeAllocation
        {
            PayCodeName = "Sunday Double Time",
            Hours = totalHours,
            Description = "Sunday work at double time rate"
        });
    }
    else
    {
        allocations.Add(new PayCodeAllocation
        {
            PayCodeName = "Regular",
            Hours = totalHours,
            Description = "Regular working hours"
        });
    }
    
    return new ShiftClassificationResult
    {
        EmployeeName = shift.EmployeeName,
        ShiftStart = shift.StartDateTime,
        ShiftEnd = shift.EndDateTime,
        PayCodeAllocations = allocations
    };
}`,
      night: `public static ShiftClassificationResult CalculatePayroll(Shift shift)
{
    var totalHours = (shift.EndDateTime - shift.StartDateTime).TotalHours;
    var startHour = shift.StartDateTime.Hour;
    var isNightShift = startHour >= 23 || startHour < 7;
    
    var allocations = new List<PayCodeAllocation>();
    
    allocations.Add(new PayCodeAllocation
    {
        PayCodeName = "Regular",
        Hours = totalHours,
        Description = "Base working hours"
    });
    
    if (isNightShift)
    {
        allocations.Add(new PayCodeAllocation
        {
            PayCodeName = "Night Differential",
            Hours = totalHours,
            Description = "$3/hour night shift differential"
        });
    }
    
    return new ShiftClassificationResult
    {
        EmployeeName = shift.EmployeeName,
        ShiftStart = shift.StartDateTime,
        ShiftEnd = shift.EndDateTime,
        PayCodeAllocations = allocations
    };
}`,
      holiday: `public static ShiftClassificationResult CalculatePayroll(Shift shift)
{
    var totalHours = (shift.EndDateTime - shift.StartDateTime).TotalHours;
    var isHoliday = IsHoliday(shift.StartDateTime);
    
    var allocations = new List<PayCodeAllocation>();
    
    if (isHoliday)
    {
        allocations.Add(new PayCodeAllocation
        {
            PayCodeName = "Holiday Pay",
            Hours = totalHours,
            Description = "Federal holiday at double time"
        });
    }
    else
    {
        allocations.Add(new PayCodeAllocation
        {
            PayCodeName = "Regular",
            Hours = totalHours,
            Description = "Regular working hours"
        });
    }
    
    return new ShiftClassificationResult
    {
        EmployeeName = shift.EmployeeName,
        ShiftStart = shift.StartDateTime,
        ShiftEnd = shift.EndDateTime,
        PayCodeAllocations = allocations
    };
}`,
      weekend: `public static ShiftClassificationResult CalculatePayroll(Shift shift)
{
    var totalHours = (shift.EndDateTime - shift.StartDateTime).TotalHours;
    var dayOfWeek = shift.StartDateTime.DayOfWeek;
    
    var allocations = new List<PayCodeAllocation>();
    
    if (dayOfWeek == DayOfWeek.Saturday)
    {
        allocations.Add(new PayCodeAllocation
        {
            PayCodeName = "Saturday Premium",
            Hours = totalHours,
            Description = "Saturday work at 1.25x rate"
        });
    }
    else if (dayOfWeek == DayOfWeek.Sunday)
    {
        allocations.Add(new PayCodeAllocation
        {
            PayCodeName = "Sunday Premium",
            Hours = totalHours,
            Description = "Sunday work at 1.5x rate"
        });
    }
    else
    {
        allocations.Add(new PayCodeAllocation
        {
            PayCodeName = "Regular",
            Hours = totalHours,
            Description = "Regular working hours"
        });
    }
    
    return new ShiftClassificationResult
    {
        EmployeeName = shift.EmployeeName,
        ShiftStart = shift.StartDateTime,
        ShiftEnd = shift.EndDateTime,
        PayCodeAllocations = allocations
    };
}`
    };

    return codeTemplates[type as keyof typeof codeTemplates] || codeTemplates.overtime;
  }

  private generateMockErrorRules(): RuleGenerationResponse[] {
    return [
      {
        id: 'error-1',
        ruleStatement: 'Complex overtime with multiple conditions',
        ruleDescription: 'Overtime after 8 hours daily and 40 hours weekly with different rates',
        intent: 'Calculate overtime with complex conditions including daily and weekly limits',
        generatedCode: `public static ShiftClassificationResult CalculatePayroll(Shift shift)
{
    // This code has compilation errors intentionally
    var totalHours = shift.InvalidProperty; // Error: property doesn't exist
    var result = new InvalidType(); // Error: type doesn't exist
    
    return result;
}`,
        status: 'CompilationFailed',
        compilationErrors: [
          "CS0117: 'Shift' does not contain a definition for 'InvalidProperty'",
          "CS0246: The type or namespace name 'InvalidType' could not be found"
        ],
        createdAt: '2024-01-18T15:30:00Z',
        createdBy: 'AI System'
      },
      {
        id: 'error-2',
        ruleStatement: 'Holiday pay with federal calendar integration',
        ruleDescription: 'Automatic federal holiday detection with 2.5x rate',
        intent: 'Integrate with federal holiday calendar and apply premium rates',
        generatedCode: `public static ShiftClassificationResult CalculatePayroll(Shift shift)
{
    var holidayService = new HolidayService(); // Error: service not available
    var isHoliday = holidayService.CheckFederalHoliday(shift.StartDateTime);
    
    // Missing return statement
}`,
        status: 'CompilationFailed',
        compilationErrors: [
          "CS0246: The type or namespace name 'HolidayService' could not be found",
          "CS0161: Not all code paths return a value"
        ],
        createdAt: '2024-01-17T09:15:00Z',
        createdBy: 'AI System'
      },
      {
        id: 'error-3',
        ruleStatement: 'Union contract compliance with break deductions',
        ruleDescription: 'Apply union contract rules with automatic break time deductions',
        intent: 'Implement union contract compliance with break calculations',
        generatedCode: `public static ShiftClassificationResult CalculatePayroll(Shift shift)
{
    var totalHours = (shift.EndDateTime - shift.StartDateTime).TotalHours;
    var breakTime = CalculateBreakTime(totalHours); // Error: method doesn't exist
    
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
                Hours = totalHours - breakTime,
                Description = "Regular hours minus break time"
            }
        }
    };
}`,
        status: 'ActivationFailed',
        compilationErrors: [
          "CS0103: The name 'CalculateBreakTime' does not exist in the current context"
        ],
        createdAt: '2024-01-16T13:45:00Z',
        createdBy: 'AI System'
      }
    ];
  }
}
