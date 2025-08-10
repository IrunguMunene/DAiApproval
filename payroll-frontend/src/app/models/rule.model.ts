export interface PayRule {
  id: string;
  ruleStatement: string;
  ruleDescription: string;
  functionName: string;
  generatedCode: string;
  isActive: boolean;
  version: number;
  createdAt: string; // ISO date string
  lastModified: string; // ISO date string
  createdBy: string;
  lastModifiedBy: string;
  organizationId: string;
  originalGeneratedCode?: string; // Store original AI-generated code
  isProcessing?: boolean; // Optional property for UI state management
}

export interface RuleGenerationRequest {
  ruleStatement: string;
  ruleDescription: string;
  organizationId: string;
  exampleShiftStart: string; // ISO date string
  exampleShiftEnd: string; // ISO date string
  expectedOutcome: string;
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
  
  // Auto-fix tracking fields
  generationAttemptCount: number;
  autoFixAttempted: boolean;
  originalGeneratedCode?: string;
  originalCompilationErrors?: string;
  autoFixAttemptedAt?: string; // ISO date string
  requiresManualReview: boolean;
  autoFixReason?: string;
  lastModified: string; // ISO date string
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

export interface UpdateRuleCodeRequest {
  updatedCode: string;
  modifiedBy: string;
}

export interface UpdateRuleCodeResponse {
  success: boolean;
  message: string;
  updatedRule?: PayRule;
  compilationErrors: string[];
  compilationWarnings: string[];
  hasCompilationErrors: boolean;
}

export interface RuleSimilarity {
  ruleId: string;
  ruleStatement: string;
  ruleDescription: string;
  similarityScore: number;
  organizationId: string;
  createdAt: string; // ISO date string
  createdBy: string;
  status: string;
}

export interface VectorSearchRequest {
  ruleText: string;
  organizationId: string;
  similarityThreshold?: number;
  maxResults?: number;
}

export interface VectorSearchResult {
  similarRules: RuleSimilarity[];
  hasSimilarRules: boolean;
  highestSimilarity: number;
}

export interface SimilaritySearchRequest {
  ruleText: string;
  organizationId: string;
}

export interface VectorStats {
  enabled: boolean;
  collection_name?: string;
  points_count?: number;
  vector_size?: number;
  distance?: string;
  message?: string;
  error?: string;
}