import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';

export interface LoadingContext {
  key: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LoadingStateService {
  private loadingStates = new Map<string, BehaviorSubject<boolean>>();
  private loadingMessages = new Map<string, string>();

  /**
   * Gets the loading state observable for a specific key
   * @param key Unique identifier for the loading state
   * @returns Observable<boolean> indicating loading state
   */
  getLoadingState(key: string): Observable<boolean> {
    if (!this.loadingStates.has(key)) {
      this.loadingStates.set(key, new BehaviorSubject<boolean>(false));
    }
    return this.loadingStates.get(key)!.asObservable();
  }

  /**
   * Gets the current loading state value synchronously
   * @param key Unique identifier for the loading state
   * @returns Current loading state
   */
  isLoading(key: string): boolean {
    return this.loadingStates.get(key)?.value || false;
  }

  /**
   * Sets the loading state for a specific key
   * @param key Unique identifier for the loading state
   * @param isLoading Loading state to set
   * @param message Optional loading message
   */
  setLoading(key: string, isLoading: boolean, message?: string): void {
    if (!this.loadingStates.has(key)) {
      this.loadingStates.set(key, new BehaviorSubject<boolean>(false));
    }
    
    this.loadingStates.get(key)!.next(isLoading);
    
    if (message) {
      this.loadingMessages.set(key, message);
    } else if (!isLoading) {
      this.loadingMessages.delete(key);
    }
  }

  /**
   * Gets the loading message for a specific key
   * @param key Unique identifier for the loading state
   * @returns Loading message or default
   */
  getLoadingMessage(key: string): string {
    return this.loadingMessages.get(key) || 'Loading...';
  }

  /**
   * Wraps an Observable with automatic loading state management
   * @param observable$ Observable to wrap
   * @param key Unique identifier for the loading state
   * @param message Optional loading message
   * @returns Observable with automatic loading state management
   */
  wrapWithLoading<T>(observable$: Observable<T>, key: string, message?: string): Observable<T> {
    this.setLoading(key, true, message);
    
    return observable$.pipe(
      finalize(() => {
        this.setLoading(key, false);
      })
    );
  }

  /**
   * Starts loading state for a key
   * @param key Unique identifier for the loading state
   * @param message Optional loading message
   */
  startLoading(key: string, message?: string): void {
    this.setLoading(key, true, message);
  }

  /**
   * Stops loading state for a key
   * @param key Unique identifier for the loading state
   */
  stopLoading(key: string): void {
    this.setLoading(key, false);
  }

  /**
   * Checks if any loading states are active
   * @returns True if any loading state is active
   */
  isAnyLoading(): boolean {
    return Array.from(this.loadingStates.values()).some(state => state.value);
  }

  /**
   * Gets all active loading keys
   * @returns Array of keys that are currently loading
   */
  getActiveLoadingKeys(): string[] {
    return Array.from(this.loadingStates.entries())
      .filter(([_, state]) => state.value)
      .map(([key, _]) => key);
  }

  /**
   * Clears all loading states
   */
  clearAllLoading(): void {
    this.loadingStates.forEach(state => state.next(false));
    this.loadingMessages.clear();
  }

  /**
   * Creates a loading wrapper function for a component
   * @param componentKey Base key for the component
   * @returns Object with loading helper methods
   */
  createLoadingContext(componentKey: string) {
    return {
      /**
       * Wraps an observable with loading state for this component
       */
      wrapLoading: <T>(observable$: Observable<T>, actionKey: string, message?: string): Observable<T> => {
        const fullKey = `${componentKey}.${actionKey}`;
        return this.wrapWithLoading(observable$, fullKey, message);
      },

      /**
       * Gets loading state for this component action
       */
      isLoading: (actionKey: string): boolean => {
        const fullKey = `${componentKey}.${actionKey}`;
        return this.isLoading(fullKey);
      },

      /**
       * Gets loading state observable for this component action
       */
      getLoadingState: (actionKey: string): Observable<boolean> => {
        const fullKey = `${componentKey}.${actionKey}`;
        return this.getLoadingState(fullKey);
      },

      /**
       * Starts loading for this component action
       */
      startLoading: (actionKey: string, message?: string): void => {
        const fullKey = `${componentKey}.${actionKey}`;
        this.startLoading(fullKey, message);
      },

      /**
       * Stops loading for this component action
       */
      stopLoading: (actionKey: string): void => {
        const fullKey = `${componentKey}.${actionKey}`;
        this.stopLoading(fullKey);
      }
    };
  }
}