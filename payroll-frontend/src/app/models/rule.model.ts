export interface PayRule {
  id: string;
  ruleStatement: string;
  ruleDescription: string;
  functionName: string;
  generatedCode: string;
  isActive: boolean;
  version: number;
  createdAt: string; // ISO date string
  createdBy: string;
  organizationId: string;
  isProcessing?: boolean; // Optional property for UI state management
}

export interface RuleGenerationRequest {
  ruleStatement: string;
  ruleDescription: string;
  organizationId: string;
}

export interface RuleGenerationResponse {
  id: string;
  ruleStatement: string;
  ruleDescription: string;
  intent: string;
  generatedCode: string;
  status: string;
  compilationErrors: string[];
  createdAt: string; // ISO date string
  createdBy?: string;
}

export interface TestRuleRequest {
  shift: {
    employeeName: string;
    startDateTime: string;
    endDateTime: string;
    organizationId: string;
  };
}

export interface TestRuleResponse {
  result: {
    employeeName: string;
    shiftStart: string;
    shiftEnd: string;
    payCodeAllocations: {
      payCodeName: string;
      hours: number;
      description: string;
    }[];
    totalHours: number;
  };
  success: boolean;
  error?: string;
}