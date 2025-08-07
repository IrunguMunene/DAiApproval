import { ShiftClassificationResult } from './payroll.model';
import { ShiftTestRequest, BulkShiftTestRequest } from './shift.model';

export interface AllRulesTestRequest {
  shift: ShiftTestRequest;
  organizationId: string;
}

export interface BatchAllRulesTestRequest {
  shifts: ShiftTestRequest[];
  organizationId: string;
}

// Re-export for convenience  
export type { ShiftTestRequest, BulkShiftTestRequest };

export interface RuleTestResult {
  ruleId: string;
  ruleStatement: string;
  ruleDescription: string;
  executedSuccessfully: boolean;
  result?: ShiftClassificationResult;
  errorMessage?: string;
}

export interface RuleOrchestrationResult {
  employeeName: string;
  shiftStart: string;
  shiftEnd: string;
  totalShiftHours: number;
  
  // Individual rule results
  individualRuleResults: RuleTestResult[];
  
  // Orchestrated final result
  combinedResult?: ShiftClassificationResult;
  
  // Conflict detection
  conflicts: RuleConflict[];
  hasConflicts: boolean;
}

export interface RuleConflict {
  payCodeName: string;
  conflictingRules: ConflictingRule[];
  description: string;
}

export interface ConflictingRule {
  ruleId: string;
  ruleStatement: string;
  hours: number;
  description: string;
}