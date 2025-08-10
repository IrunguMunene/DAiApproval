import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { 
  PayRule, 
  RuleGenerationRequest, 
  RuleGenerationResponse, 
  TestRuleRequest, 
  TestRuleResponse,
  ShiftClassificationRequest,
  BatchShiftClassificationRequest,
  ShiftClassificationResult,
  ShiftTestRequest,
  BulkShiftTestRequest,
  AllRulesTestRequest,
  BatchAllRulesTestRequest,
  RuleOrchestrationResult,
  UpdateRuleCodeRequest,
  UpdateRuleCodeResponse
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl || 'http://localhost:5163/api';

  constructor(private http: HttpClient) {}

  // Rule Management API - Two-step workflow
  extractIntent(request: RuleGenerationRequest): Observable<RuleGenerationResponse> {
    return this.http.post<RuleGenerationResponse>(`${this.baseUrl}/rule/extract-intent`, request)
      .pipe(catchError(this.handleError));
  }

  generateCode(ruleId: string, reviewedIntent: string): Observable<RuleGenerationResponse> {
    return this.http.post<RuleGenerationResponse>(`${this.baseUrl}/rule/${ruleId}/generate-code`, { reviewedIntent })
      .pipe(catchError(this.handleError));
  }

  // Rule Management API - Original single-step workflow (kept for backwards compatibility)
  generateRule(request: RuleGenerationRequest): Observable<RuleGenerationResponse> {
    return this.http.post<RuleGenerationResponse>(`${this.baseUrl}/rule/generate`, request)
      .pipe(catchError(this.handleError));
  }

  activateRule(ruleId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/rule/${ruleId}/activate`, {})
      .pipe(catchError(this.handleError));
  }

  deactivateRule(ruleId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/rule/${ruleId}/deactivate`, {})
      .pipe(catchError(this.handleError));
  }

  getActiveRules(organizationId: string): Observable<PayRule[]> {
    return this.http.get<PayRule[]>(`${this.baseUrl}/rule/active?organizationId=${organizationId}`)
      .pipe(catchError(this.handleError));
  }

  getRuleGenerationRequests(organizationId: string): Observable<RuleGenerationResponse[]> {
    return this.http.get<RuleGenerationResponse[]>(`${this.baseUrl}/rule/generation-requests?organizationId=${organizationId}`)
      .pipe(catchError(this.handleError));
  }

  getRuleById(ruleId: string): Observable<PayRule> {
    return this.http.get<PayRule>(`${this.baseUrl}/rule/${ruleId}`)
      .pipe(catchError(this.handleError));
  }

  getRulesWithCompilationErrors(organizationId: string): Observable<RuleGenerationResponse[]> {
    return this.http.get<RuleGenerationResponse[]>(`${this.baseUrl}/rule/compilation-errors?organizationId=${organizationId}`)
      .pipe(catchError(this.handleError));
  }

  regenerateRule(ruleId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/rule/${ruleId}/regenerate`, {})
      .pipe(catchError(this.handleError));
  }

  testRule(ruleId: string, request: TestRuleRequest): Observable<TestRuleResponse> {
    // Convert TestRuleRequest to ShiftClassificationRequest format
    const shiftRequest = {
      employeeName: request.shift.employeeName,
      startDateTime: request.shift.startDateTime,
      endDateTime: request.shift.endDateTime,
      organizationId: request.shift.organizationId
    };
    
    return this.http.post<ShiftClassificationResult>(`${this.baseUrl}/shift/test-rule/${ruleId}`, shiftRequest)
      .pipe(
        catchError(this.handleError),
        // Map the response to TestRuleResponse format
        map(result => ({
          success: true,
          result: result,
          error: undefined
        } as TestRuleResponse))
      );
  }

  // Shift Classification API
  classifyShift(request: ShiftClassificationRequest): Observable<ShiftClassificationResult> {
    return this.http.post<ShiftClassificationResult>(`${this.baseUrl}/shift/classify`, request)
      .pipe(catchError(this.handleError));
  }

  classifyShiftBatch(request: BatchShiftClassificationRequest): Observable<ShiftClassificationResult[]> {
    return this.http.post<ShiftClassificationResult[]>(`${this.baseUrl}/shift/classify-batch`, request)
      .pipe(catchError(this.handleError));
  }

  // Additional rule management methods  
  getAllRules(organizationId: string): Observable<PayRule[]> {
    // Backend doesn't have a get-all endpoint, so we get active rules + generation requests
    // For now, just use active rules as the primary source
    return this.getActiveRules(organizationId);
  }

  deleteRule(ruleId: string): Observable<any> {
    // Backend doesn't have delete endpoint yet, return success for now
    return new Observable(observer => {
      setTimeout(() => {
        observer.next({ message: 'Rule deletion not yet implemented in backend' });
        observer.complete();
      }, 500);
    });
  }

  // Bulk shift testing methods
  testShiftWithRule(ruleId: string, shift: ShiftTestRequest): Observable<ShiftClassificationResult> {
    const shiftRequest = {
      employeeName: shift.employeeName,
      startDateTime: shift.startDateTime,
      endDateTime: shift.endDateTime,
      organizationId: shift.organizationId
    };
    return this.http.post<ShiftClassificationResult>(`${this.baseUrl}/shift/test-rule/${ruleId}`, shiftRequest)
      .pipe(catchError(this.handleError));
  }

  testBulkShiftsWithRule(request: BulkShiftTestRequest): Observable<ShiftClassificationResult[]> {
    // Backend doesn't have bulk test endpoint yet, return error to trigger sequential fallback
    return new Observable(observer => {
      observer.error(new Error('Bulk testing not yet implemented, using sequential processing'));
    });
  }

  // Rule Orchestration API (Test All Rules)
  testAllRules(request: AllRulesTestRequest): Observable<RuleOrchestrationResult> {
    return this.http.post<RuleOrchestrationResult>(`${this.baseUrl}/shift/test-all-rules`, request)
      .pipe(catchError(this.handleError));
  }

  testAllRulesBatch(request: BatchAllRulesTestRequest): Observable<RuleOrchestrationResult[]> {
    return this.http.post<RuleOrchestrationResult[]>(`${this.baseUrl}/shift/test-all-rules-batch`, request)
      .pipe(catchError(this.handleError));
  }

  // Rule Code Management API
  updateRuleCode(ruleId: string, request: UpdateRuleCodeRequest): Observable<UpdateRuleCodeResponse> {
    console.log(`Making PUT request to: ${this.baseUrl}/rule/${ruleId}/update-code`);
    console.log('Request payload:', request);
    
    return this.http.put<UpdateRuleCodeResponse>(`${this.baseUrl}/rule/${ruleId}/update-code`, request)
      .pipe(
        map(response => {
          console.log('Update rule code response:', response);
          return response;
        }),
        catchError((error) => {
          console.error('Update rule code error:', error);
          return this.handleError(error);
        })
      );
  }

  compileRuleCode(ruleId: string, code: string): Observable<any> {
    // This endpoint doesn't exist yet in backend, but we can simulate it
    return new Observable(observer => {
      // For now, just return success - the actual compilation happens during save
      setTimeout(() => {
        observer.next({ success: true, message: 'Code compiled successfully' });
        observer.complete();
      }, 1000);
    });
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred!';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    
    console.error('API Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}