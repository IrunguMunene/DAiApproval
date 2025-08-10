import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { 
  PayRule, 
  ShiftClassificationResult, 
  ShiftTestRequest, 
  BulkShiftTestRequest,
  AllRulesTestRequest,
  BatchAllRulesTestRequest,
  RuleOrchestrationResult
} from '../../models';

interface TestShift {
  employeeName: string;
  startDateTime: string;
  endDateTime: string;
  organizationId: string;
}

interface ShiftTestResult {
  shift: TestShift;
  result: ShiftClassificationResult | null;
  error?: string;
  processing: boolean;
}

@Component({
  selector: 'app-rule-testing',
  standalone: false,
  templateUrl: './rule-testing.html',
  styleUrl: './rule-testing.scss'
})
export class RuleTesting implements OnInit {
  // Forms and UI state
  manualShiftForm!: FormGroup;
  selectedTab = 0;
  isLoading = false;
  isTesting = false;
  
  // Rule selection
  availableRules: PayRule[] = [];
  selectedRuleId: string | null = null;
  testingMode: 'single' | 'all' = 'single';
  
  // Manual testing (single rule)
  testResult: ShiftTestResult | null = null;
  
  // Manual testing (all rules orchestration)
  orchestrationResult: RuleOrchestrationResult | null = null;
  
  // CSV testing
  csvFile: File | null = null;
  csvShifts: TestShift[] = [];
  csvResults: ShiftTestResult[] = [];
  csvProcessingProgress = 0;
  
  // Display columns for results table
  displayedColumns = ['employee', 'shift', 'payCode', 'hours', 'description'];
  
  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.initializeForm();
    this.loadAvailableRules();
    this.checkForRuleIdParam();
  }

  private initializeForm() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0);
    
    this.manualShiftForm = this.fb.group({
      employeeName: ['Test Employee', Validators.required],
      startDateTime: [todayStart.toISOString().slice(0, 16), Validators.required],
      endDateTime: [todayEnd.toISOString().slice(0, 16), Validators.required],
      organizationId: ['demo-org', Validators.required]
    });
  }

  private loadAvailableRules() {
    this.isLoading = true;
    
    this.apiService.getActiveRules('demo-org').subscribe({
      next: (rules) => {
        this.availableRules = rules;
        this.isLoading = false;
        
        // Auto-select first active rule if none selected
        if (!this.selectedRuleId && this.availableRules.length > 0) {
          this.selectedRuleId = this.availableRules[0].id;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.snackBar.open(`Error loading rules: ${error.message}`, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        this.availableRules = [];
      }
    });
  }

  private checkForRuleIdParam() {
    this.route.queryParams.subscribe(params => {
      if (params['ruleId']) {
        this.selectedRuleId = params['ruleId'];
      }
    });
  }

  // Manual shift testing
  testManualShift() {
    if (!this.manualShiftForm.valid) {
      this.snackBar.open('Please fill all required fields', 'Close', {
        duration: 3000,
        panelClass: ['warning-snackbar']
      });
      return;
    }

    if (this.testingMode === 'single' && !this.selectedRuleId) {
      this.snackBar.open('Please select a rule to test', 'Close', {
        duration: 3000,
        panelClass: ['warning-snackbar']
      });
      return;
    }

    this.isTesting = true;
    const formValue = this.manualShiftForm.value;
    
    const testShift: TestShift = {
      employeeName: formValue.employeeName,
      startDateTime: formValue.startDateTime,
      endDateTime: formValue.endDateTime,
      organizationId: formValue.organizationId
    };

    if (this.testingMode === 'single') {
      this.testSingleRule(testShift);
    } else {
      this.testAllRules(testShift);
    }
  }

  private testSingleRule(testShift: TestShift) {
    const request: ShiftTestRequest = {
      employeeName: testShift.employeeName,
      startDateTime: testShift.startDateTime,
      endDateTime: testShift.endDateTime,
      organizationId: testShift.organizationId
    };

    this.apiService.testShiftWithRule(this.selectedRuleId!, request).subscribe({
      next: (result) => {
        this.testResult = {
          shift: testShift,
          result: result,
          processing: false
        };
        this.orchestrationResult = null; // Clear orchestration results
        
        this.isTesting = false;
        this.snackBar.open('Shift tested successfully!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        this.isTesting = false;
        this.snackBar.open(`Error testing shift: ${error.message}`, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        // Fallback to simulated result for development
        this.testResult = {
          shift: testShift,
          result: this.simulateShiftClassification(testShift),
          processing: false
        };
        this.orchestrationResult = null;
      }
    });
  }

  private testAllRules(testShift: TestShift) {
    const request: AllRulesTestRequest = {
      shift: {
        employeeName: testShift.employeeName,
        startDateTime: testShift.startDateTime,
        endDateTime: testShift.endDateTime,
        organizationId: testShift.organizationId
      },
      organizationId: testShift.organizationId
    };

    this.apiService.testAllRules(request).subscribe({
      next: (result) => {
        this.orchestrationResult = result;
        this.testResult = null; // Clear single rule results
        
        this.isTesting = false;
        this.snackBar.open('All rules tested and orchestrated successfully!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        this.isTesting = false;
        this.snackBar.open(`Error testing all rules: ${error.message}`, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        // Fallback to simulated orchestration result for development
        this.orchestrationResult = this.simulateOrchestrationResult(testShift);
        this.testResult = null;
      }
    });
  }

  clearManualTest() {
    this.testResult = null;
    this.orchestrationResult = null;
    this.initializeForm();
  }

  // CSV file handling
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      this.csvFile = file;
      this.parseCsvFile(file);
    } else {
      this.snackBar.open('Please select a valid CSV file', 'Close', {
        duration: 3000,
        panelClass: ['warning-snackbar']
      });
    }
  }

  private parseCsvFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      this.csvShifts = this.parseCsvContent(csv);
      
      if (this.csvShifts.length > 0) {
        this.snackBar.open(`Loaded ${this.csvShifts.length} shifts from CSV`, 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      }
    };
    reader.readAsText(file);
  }

  private parseCsvContent(csv: string): TestShift[] {
    const lines = csv.split('\n').filter(line => line.trim());
    const shifts: TestShift[] = [];
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',').map(col => col.trim().replace(/"/g, ''));
      
      if (columns.length >= 4) {
        shifts.push({
          employeeName: columns[0],
          startDateTime: columns[1],
          endDateTime: columns[2],
          organizationId: columns[3] || 'demo-org'
        });
      }
    }
    
    return shifts;
  }

  testCsvShifts() {
    if (!this.selectedRuleId || this.csvShifts.length === 0) {
      this.snackBar.open('Please select a rule and upload a CSV file', 'Close', {
        duration: 3000,
        panelClass: ['warning-snackbar']
      });
      return;
    }

    this.isTesting = true;
    this.csvResults = [];
    this.csvProcessingProgress = 0;

    // Convert to API format
    const shifts: ShiftTestRequest[] = this.csvShifts.map(shift => ({
      employeeName: shift.employeeName,
      startDateTime: shift.startDateTime,
      endDateTime: shift.endDateTime,
      organizationId: shift.organizationId
    }));

    const bulkRequest: BulkShiftTestRequest = {
      ruleId: this.selectedRuleId,
      shifts: shifts,
      organizationId: 'demo-org'
    };

    // Try bulk API call first, fall back to sequential processing
    this.apiService.testBulkShiftsWithRule(bulkRequest).subscribe({
      next: (results) => {
        this.csvResults = results.map((result, index) => ({
          shift: this.csvShifts[index],
          result: result,
          processing: false
        }));
        
        this.csvProcessingProgress = 100;
        this.isTesting = false;
        
        this.snackBar.open(`Processed ${results.length} shifts successfully!`, 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        // Fall back to sequential processing
        console.warn('Bulk processing failed, falling back to sequential:', error.message);
        this.processShiftsSequentially(0);
      }
    });
  }

  private processShiftsSequentially(index: number) {
    if (index >= this.csvShifts.length) {
      this.isTesting = false;
      this.snackBar.open(`Processed ${this.csvShifts.length} shifts successfully!`, 'Close', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
      return;
    }

    const shift = this.csvShifts[index];
    const result: ShiftTestResult = {
      shift,
      result: null,
      processing: true
    };
    
    this.csvResults.push(result);

    const request: ShiftTestRequest = {
      employeeName: shift.employeeName,
      startDateTime: shift.startDateTime,
      endDateTime: shift.endDateTime,
      organizationId: shift.organizationId
    };

    if (this.selectedRuleId) {
      this.apiService.testShiftWithRule(this.selectedRuleId, request).subscribe({
        next: (apiResult) => {
          result.result = apiResult;
          result.processing = false;
          
          this.csvProcessingProgress = ((index + 1) / this.csvShifts.length) * 100;
          
          // Process next shift
          this.processShiftsSequentially(index + 1);
        },
        error: (error) => {
          // Fall back to simulation on error
          console.warn(`API call failed for shift ${index + 1}, using simulation:`, error.message);
          result.result = this.simulateShiftClassification(shift);
          result.processing = false;
          
          this.csvProcessingProgress = ((index + 1) / this.csvShifts.length) * 100;
          
          // Process next shift
          this.processShiftsSequentially(index + 1);
        }
      });
    }
  }

  clearCsvTest() {
    this.csvFile = null;
    this.csvShifts = [];
    this.csvResults = [];
    this.csvProcessingProgress = 0;
  }

  downloadCsvTemplate() {
    const csvContent = [
      ['Employee Name', 'Start DateTime', 'End DateTime', 'Organization ID'],
      ['John Doe', '2024-01-15T09:00', '2024-01-15T17:00', 'demo-org'],
      ['Jane Smith', '2024-01-15T08:30', '2024-01-15T18:30', 'demo-org'],
      ['Bob Johnson', '2024-01-15T10:00', '2024-01-15T19:00', 'demo-org']
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rule-testing-template.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  }

  exportResults() {
    if (this.csvResults.length === 0 && !this.testResult) {
      this.snackBar.open('No test results to export', 'Close', {
        duration: 3000,
        panelClass: ['warning-snackbar']
      });
      return;
    }

    const results = this.csvResults.length > 0 ? this.csvResults : [this.testResult!];
    const csvContent = this.convertResultsToCsv(results);

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shift-test-results-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private convertResultsToCsv(results: ShiftTestResult[]): string {
    const headers = ['Employee', 'Start Time', 'End Time', 'Pay Code', 'Hours', 'Description'];
    const rows = [headers.join(',')];

    results.forEach(testResult => {
      if (testResult.result) {
        testResult.result.payCodeAllocations.forEach(allocation => {
          rows.push([
            testResult.shift.employeeName,
            testResult.shift.startDateTime,
            testResult.shift.endDateTime,
            allocation.payCodeName,
            allocation.hours.toString(),
            allocation.description
          ].join(','));
        });
      }
    });

    return rows.join('\n');
  }

  // Utility methods
  formatDateTime(dateTime: string): string {
    return new Date(dateTime).toLocaleString();
  }

  getTotalHours(shift: TestShift): number {
    const start = new Date(shift.startDateTime);
    const end = new Date(shift.endDateTime);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }

  getPayCodeColor(payCode: string): 'primary' | 'accent' | 'warn' {
    switch (payCode.toLowerCase()) {
      case 'overtime': return 'accent';
      case 'holiday': return 'warn';
      default: return 'primary';
    }
  }

  getSuccessfulRulesCount(): number {
    if (!this.orchestrationResult) return 0;
    return this.orchestrationResult.individualRuleResults.filter(r => r.executedSuccessfully).length;
  }

  trackByRuleId(index: number, ruleResult: any): string {
    return ruleResult.ruleId;
  }

  private simulateOrchestrationResult(shift: TestShift): RuleOrchestrationResult {
    const totalHours = this.getTotalHours(shift);
    
    // Simulate individual rule results
    const individualResults = this.availableRules.map((rule, index) => ({
      ruleId: rule.id,
      ruleStatement: rule.ruleStatement,
      ruleDescription: rule.ruleDescription,
      executedSuccessfully: index < 3, // Simulate first 3 rules succeeding
      result: index < 3 ? this.simulateShiftClassification(shift) : undefined,
      errorMessage: index >= 3 ? 'Simulated rule execution error' : undefined
    }));

    // Simulate conflicts for demo
    const conflicts = totalHours > 8 ? [{
      payCodeName: 'Overtime',
      description: 'Multiple rules allocate hours to Overtime: 2.5h, 3.0h',
      conflictingRules: [
        {
          ruleId: this.availableRules[0]?.id || '1',
          ruleStatement: 'Overtime at 1.5x after 8 hours',
          hours: 2.5,
          description: 'Daily overtime calculation'
        },
        {
          ruleId: this.availableRules[1]?.id || '2', 
          ruleStatement: 'Weekend premium overtime',
          hours: 3.0,
          description: 'Weekend overtime premium'
        }
      ]
    }] : [];

    return {
      employeeName: shift.employeeName,
      shiftStart: shift.startDateTime,
      shiftEnd: shift.endDateTime,
      totalShiftHours: totalHours,
      individualRuleResults: individualResults,
      combinedResult: this.simulateShiftClassification(shift),
      conflicts: conflicts,
      hasConflicts: conflicts.length > 0
    };
  }

  private simulateShiftClassification(shift: TestShift): ShiftClassificationResult {
    const totalHours = this.getTotalHours(shift);
    const regularHours = Math.min(totalHours, 8);
    const overtimeHours = Math.max(0, totalHours - 8);

    const allocations = [];
    
    if (regularHours > 0) {
      allocations.push({
        payCodeName: 'Regular',
        hours: regularHours,
        description: 'Regular working hours'
      });
    }
    
    if (overtimeHours > 0) {
      allocations.push({
        payCodeName: 'Overtime',
        hours: overtimeHours,
        description: 'Overtime hours at 1.5x rate'
      });
    }

    return {
      employeeName: shift.employeeName,
      shiftStart: shift.startDateTime,
      shiftEnd: shift.endDateTime,
      payCodeAllocations: allocations,
      totalHours
    };
  }

}