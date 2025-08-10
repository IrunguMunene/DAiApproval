import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface ErrorContext {
  action?: string;
  component?: string;
  duration?: number;
  showRetry?: boolean;
  retryAction?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {

  constructor(private snackBar: MatSnackBar) { }

  /**
   * Handles API errors with consistent snackbar display
   * @param error The error object from API call
   * @param context Optional context information
   */
  handleApiError(error: any, context?: ErrorContext): void {
    const actionText = context?.action || 'operation';
    const message = this.extractErrorMessage(error);
    const duration = context?.duration || 5000;

    const displayMessage = `Error ${actionText}: ${message}`;

    const snackBarRef = this.snackBar.open(displayMessage, 'Close', {
      duration: duration,
      panelClass: ['error-snackbar']
    });

    // Log error for debugging
    console.error(`Error in ${context?.component || 'component'} - ${actionText}:`, error);
  }

  /**
   * Handles success messages with consistent snackbar display
   * @param message Success message to display
   * @param duration Optional duration (default 3000ms)
   */
  handleSuccess(message: string, duration: number = 3000): void {
    this.snackBar.open(message, 'Close', {
      duration: duration,
      panelClass: ['success-snackbar']
    });
  }

  /**
   * Handles warning messages with consistent snackbar display
   * @param message Warning message to display
   * @param duration Optional duration (default 4000ms)
   */
  handleWarning(message: string, duration: number = 4000): void {
    this.snackBar.open(message, 'Close', {
      duration: duration,
      panelClass: ['warning-snackbar']
    });
  }

  /**
   * Handles info messages with consistent snackbar display
   * @param message Info message to display
   * @param duration Optional duration (default 2000ms)
   */
  handleInfo(message: string, duration: number = 2000): void {
    this.snackBar.open(message, 'Close', {
      duration: duration,
      panelClass: ['info-snackbar']
    });
  }

  /**
   * Generic error handler for Observable errors
   * @param context Error context information
   * @returns Error handling function for use in catchError or error callbacks
   */
  createErrorHandler(context?: ErrorContext): (error: any) => void {
    return (error: any) => {
      this.handleApiError(error, context);
    };
  }

  /**
   * Extracts user-friendly error message from various error formats
   * @param error Error object from API
   * @returns User-friendly error message
   */
  private extractErrorMessage(error: any): string {
    if (error?.error?.message) {
      return error.error.message;
    }
    
    if (error?.error?.error) {
      return error.error.error;
    }
    
    if (error?.message) {
      return error.message;
    }
    
    if (typeof error?.error === 'string') {
      return error.error;
    }
    
    if (typeof error === 'string') {
      return error;
    }

    // Handle HTTP error codes
    if (error?.status) {
      switch (error.status) {
        case 0:
          return 'Unable to connect to server. Please check your connection.';
        case 400:
          return 'Invalid request. Please check your input.';
        case 401:
          return 'Unauthorized. Please check your credentials.';
        case 403:
          return 'Access forbidden. You don\'t have permission for this action.';
        case 404:
          return 'Resource not found.';
        case 500:
          return 'Internal server error. Please try again later.';
        default:
          return `Server error (${error.status}). Please try again.`;
      }
    }

    return 'An unexpected error occurred. Please try again.';
  }
}