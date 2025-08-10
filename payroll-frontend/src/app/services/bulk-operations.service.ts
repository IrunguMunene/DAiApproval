import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ErrorHandlerService } from './error-handler.service';

export interface BulkOperationConfig<T> {
  items: T[];
  filterCondition: (item: T) => boolean;
  apiCall: (item: T) => Observable<any>;
  onSuccess: (item: T) => void;
  onError?: (item: T, error: any) => void;
  operationName: string;
  noItemsMessage: string;
  processingProperty?: keyof T;
}

export interface BulkOperationResult {
  completedCount: number;
  errorCount: number;
  totalCount: number;
  success: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BulkOperationsService {

  constructor(private errorHandler: ErrorHandlerService) {}

  /**
   * Performs bulk operations on a collection of items with progress tracking
   * Uses parallel execution (forkJoin) for faster processing
   * @param config Configuration object containing items, filters, API calls, and callbacks
   * @returns Observable<BulkOperationResult> with operation results
   */
  performBulkOperation<T>(config: BulkOperationConfig<T>): Observable<BulkOperationResult> {
    const {
      items,
      filterCondition,
      apiCall,
      onSuccess,
      onError,
      operationName,
      noItemsMessage,
      processingProperty
    } = config;

    // Filter items based on condition
    const filteredItems = items.filter(filterCondition);

    // Check if there are items to process
    if (filteredItems.length === 0) {
      this.errorHandler.handleWarning(noItemsMessage, 3000);
      return of({
        completedCount: 0,
        errorCount: 0,
        totalCount: 0,
        success: false
      });
    }

    // Set processing state for all items
    if (processingProperty) {
      filteredItems.forEach(item => {
        (item as any)[processingProperty] = true;
      });
    }

    // Create observables for each API call with error handling
    const apiCalls = filteredItems.map(item => 
      apiCall(item).pipe(
        map(() => ({ item, success: true, error: null })),
        catchError(error => of({ item, success: false, error }))
      )
    );

    // Execute all API calls in parallel using forkJoin
    return forkJoin(apiCalls).pipe(
      map(results => {
        let completedCount = 0;
        let errorCount = 0;

        // Process results
        results.forEach(result => {
          // Clear processing state
          if (processingProperty) {
            (result.item as any)[processingProperty] = false;
          }

          if (result.success) {
            completedCount++;
            onSuccess(result.item);
          } else {
            errorCount++;
            if (onError) {
              onError(result.item, result.error);
            }
          }
        });

        const totalCount = filteredItems.length;
        const operationResult: BulkOperationResult = {
          completedCount,
          errorCount,
          totalCount,
          success: errorCount === 0
        };

        // Show result message
        this.showResultMessage(operationResult, operationName);

        return operationResult;
      }),
      catchError(error => {
        // Handle unexpected errors
        this.errorHandler.handleApiError(error, {
          action: `performing bulk ${operationName}`,
          component: 'BulkOperations'
        });

        // Clear processing state for all items on error
        if (processingProperty) {
          filteredItems.forEach(item => {
            (item as any)[processingProperty] = false;
          });
        }

        return of({
          completedCount: 0,
          errorCount: filteredItems.length,
          totalCount: filteredItems.length,
          success: false
        });
      })
    );
  }

  /**
   * Performs bulk operations sequentially (one after another) instead of in parallel
   * Useful when API calls need to be throttled or when order matters
   */
  performSequentialBulkOperation<T>(config: BulkOperationConfig<T>): Observable<BulkOperationResult> {
    const {
      items,
      filterCondition,
      apiCall,
      onSuccess,
      onError,
      operationName,
      noItemsMessage,
      processingProperty
    } = config;

    // Filter items based on condition
    const filteredItems = items.filter(filterCondition);

    // Check if there are items to process
    if (filteredItems.length === 0) {
      this.errorHandler.handleWarning(noItemsMessage, 3000);
      return of({
        completedCount: 0,
        errorCount: 0,
        totalCount: 0,
        success: false
      });
    }

    return new Observable<BulkOperationResult>(observer => {
      let completedCount = 0;
      let errorCount = 0;
      let currentIndex = 0;

      const processNextItem = () => {
        if (currentIndex >= filteredItems.length) {
          // All items processed
          const operationResult: BulkOperationResult = {
            completedCount,
            errorCount,
            totalCount: filteredItems.length,
            success: errorCount === 0
          };

          this.showResultMessage(operationResult, operationName);
          observer.next(operationResult);
          observer.complete();
          return;
        }

        const item = filteredItems[currentIndex];

        // Set processing state
        if (processingProperty) {
          (item as any)[processingProperty] = true;
        }

        apiCall(item).subscribe({
          next: () => {
            // Clear processing state
            if (processingProperty) {
              (item as any)[processingProperty] = false;
            }

            completedCount++;
            onSuccess(item);
            currentIndex++;
            processNextItem();
          },
          error: (error) => {
            // Clear processing state
            if (processingProperty) {
              (item as any)[processingProperty] = false;
            }

            errorCount++;
            if (onError) {
              onError(item, error);
            }
            currentIndex++;
            processNextItem();
          }
        });
      };

      // Start processing
      processNextItem();
    });
  }

  /**
   * Creates a simple bulk operation config for common operations
   * @param items Items to operate on
   * @param filterCondition Filter to apply to items
   * @param apiCall API call to make for each item
   * @param successCallback Callback when operation succeeds
   * @param operationName Name of the operation for messages
   * @param noItemsMessage Message to show when no items match filter
   * @returns BulkOperationConfig ready to use
   */
  createSimpleBulkConfig<T>(
    items: T[],
    filterCondition: (item: T) => boolean,
    apiCall: (item: T) => Observable<any>,
    successCallback: (item: T) => void,
    operationName: string,
    noItemsMessage: string,
    processingProperty?: keyof T
  ): BulkOperationConfig<T> {
    return {
      items,
      filterCondition,
      apiCall,
      onSuccess: successCallback,
      operationName,
      noItemsMessage,
      processingProperty
    };
  }

  /**
   * Helper method for bulk delete operations with confirmation
   * @param items Items to delete
   * @param apiCall Delete API call
   * @param confirmationMessage Message to show in confirmation dialog
   * @param itemNameGetter Function to get display name for each item
   * @returns Observable<BulkOperationResult> or null if cancelled
   */
  performBulkDeleteWithConfirmation<T>(
    items: T[],
    apiCall: (item: T) => Observable<any>,
    confirmationMessage: string,
    itemNameGetter: (item: T) => string,
    onSuccess?: (item: T) => void,
    processingProperty?: keyof T
  ): Observable<BulkOperationResult> | null {
    if (items.length === 0) {
      this.errorHandler.handleWarning('No items selected for deletion', 3000);
      return null;
    }

    const itemNames = items.slice(0, 3).map(itemNameGetter).join(', ');
    const suffix = items.length > 3 ? ` and ${items.length - 3} others` : '';
    const fullConfirmationMessage = `${confirmationMessage} ${itemNames}${suffix}? This action cannot be undone.`;
    
    const confirmed = confirm(fullConfirmationMessage);
    
    if (!confirmed) {
      return null;
    }

    const config: BulkOperationConfig<T> = {
      items,
      filterCondition: () => true,
      apiCall,
      onSuccess: onSuccess || (() => {}),
      operationName: 'deleted',
      noItemsMessage: 'No items to delete',
      processingProperty
    };

    return this.performBulkOperation(config);
  }

  private showResultMessage(result: BulkOperationResult, operationName: string): void {
    if (result.errorCount === 0) {
      this.errorHandler.handleSuccess(
        `${result.completedCount} items ${operationName} successfully`,
        3000
      );
    } else if (result.completedCount > 0) {
      this.errorHandler.handleWarning(
        `${result.completedCount} items ${operationName} successfully, ${result.errorCount} failed`,
        5000
      );
    } else {
      this.errorHandler.handleApiError(
        { message: `All ${result.totalCount} items failed to ${operationName.replace('ed', '')}` },
        {
          action: `bulk ${operationName}`,
          component: 'BulkOperations'
        }
      );
    }
  }
}