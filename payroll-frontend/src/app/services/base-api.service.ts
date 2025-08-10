import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ApiRequestOptions {
  headers?: HttpHeaders | { [header: string]: string | string[] };
  params?: HttpParams | { [param: string]: string | string[] };
  withCredentials?: boolean;
}

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  success?: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export abstract class BaseApiService {
  protected baseUrl: string = environment.apiUrl || 'http://localhost:5163/api';
  
  protected defaultHeaders: HttpHeaders = new HttpHeaders({
    'Content-Type': 'application/json',
    'X-User-Id': 'demo-user'
  });

  constructor(protected http: HttpClient) {}

  /**
   * Generic HTTP GET request
   * @param endpoint API endpoint (without base URL)
   * @param options Optional request options
   * @returns Observable with response data
   */
  protected get<T>(endpoint: string, options?: ApiRequestOptions): Observable<T> {
    const url = this.buildUrl(endpoint);
    const requestOptions = this.buildRequestOptions(options);
    
    return this.http.get<T>(url, requestOptions).pipe(
      catchError(this.handleError.bind(this))
    ) as Observable<T>;
  }

  /**
   * Generic HTTP POST request
   * @param endpoint API endpoint (without base URL)
   * @param body Request body
   * @param options Optional request options
   * @returns Observable with response data
   */
  protected post<T>(endpoint: string, body: any = null, options?: ApiRequestOptions): Observable<T> {
    const url = this.buildUrl(endpoint);
    const requestOptions = this.buildRequestOptions(options);
    
    return this.http.post<T>(url, body, requestOptions).pipe(
      catchError(this.handleError.bind(this))
    ) as Observable<T>;
  }

  /**
   * Generic HTTP PUT request
   * @param endpoint API endpoint (without base URL)
   * @param body Request body
   * @param options Optional request options
   * @returns Observable with response data
   */
  protected put<T>(endpoint: string, body: any, options?: ApiRequestOptions): Observable<T> {
    const url = this.buildUrl(endpoint);
    const requestOptions = this.buildRequestOptions(options);
    
    return this.http.put<T>(url, body, requestOptions).pipe(
      catchError(this.handleError.bind(this))
    ) as Observable<T>;
  }

  /**
   * Generic HTTP DELETE request
   * @param endpoint API endpoint (without base URL)
   * @param options Optional request options
   * @returns Observable with response data
   */
  protected delete<T>(endpoint: string, options?: ApiRequestOptions): Observable<T> {
    const url = this.buildUrl(endpoint);
    const requestOptions = this.buildRequestOptions(options);
    
    return this.http.delete<T>(url, requestOptions).pipe(
      catchError(this.handleError.bind(this))
    ) as Observable<T>;
  }

  /**
   * Generic HTTP PATCH request
   * @param endpoint API endpoint (without base URL)
   * @param body Request body
   * @param options Optional request options
   * @returns Observable with response data
   */
  protected patch<T>(endpoint: string, body: any, options?: ApiRequestOptions): Observable<T> {
    const url = this.buildUrl(endpoint);
    const requestOptions = this.buildRequestOptions(options);
    
    return this.http.patch<T>(url, body, requestOptions).pipe(
      catchError(this.handleError.bind(this))
    ) as Observable<T>;
  }

  /**
   * Builds query parameters string from an object
   * @param params Parameters object
   * @returns Query parameters string
   */
  protected buildQueryParams(params: { [key: string]: any }): string {
    const queryParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
      const value = params[key];
      if (value !== null && value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    return queryParams.toString();
  }

  /**
   * GET request with query parameters
   * @param endpoint API endpoint
   * @param params Query parameters object
   * @param options Optional request options
   * @returns Observable with response data
   */
  protected getWithParams<T>(
    endpoint: string, 
    params: { [key: string]: any }, 
    options?: ApiRequestOptions
  ): Observable<T> {
    const queryString = this.buildQueryParams(params);
    const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return this.get<T>(fullEndpoint, options);
  }

  /**
   * Handles API response that may contain wrapped data
   * @param response Raw API response
   * @returns Unwrapped data or original response
   */
  protected unwrapResponse<T>(response: any): T {
    // If response has a 'data' property, unwrap it
    if (response && typeof response === 'object' && 'data' in response) {
      return response.data;
    }
    
    // If response has success/message format, handle accordingly
    if (response && typeof response === 'object' && 'success' in response) {
      if (response.success && 'data' in response) {
        return response.data;
      }
      if (!response.success) {
        throw new Error(response.message || response.error || 'API request failed');
      }
    }
    
    return response;
  }

  /**
   * Handles HTTP errors with consistent error format
   * @param error HTTP error response
   * @returns Observable error
   */
  protected handleError = (error: HttpErrorResponse): Observable<never> => {
    console.error('API Error:', error);
    
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      if (error.error && typeof error.error === 'object') {
        errorMessage = error.error.message || error.error.error || error.message;
      } else if (error.error && typeof error.error === 'string') {
        errorMessage = error.error;
      } else {
        errorMessage = error.message;
      }
    }

    const errorResponse = {
      status: error.status,
      statusText: error.statusText,
      message: errorMessage,
      error: error.error,
      url: error.url
    };

    return throwError(() => errorResponse);
  };

  /**
   * Builds full URL from endpoint
   * @param endpoint API endpoint
   * @returns Full URL
   */
  private buildUrl(endpoint: string): string {
    // Remove leading slash if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${this.baseUrl}/${cleanEndpoint}`;
  }

  /**
   * Builds request options with default headers
   * @param options Optional request options
   * @returns Request options with defaults applied
   */
  private buildRequestOptions(options?: ApiRequestOptions): any {
    const requestOptions: any = {
      headers: this.defaultHeaders,
      observe: 'body',
      responseType: 'json'
    };

    if (!options) {
      return requestOptions;
    }

    // Merge headers
    if (options.headers) {
      const headers = options.headers instanceof HttpHeaders 
        ? options.headers 
        : new HttpHeaders(options.headers);
      
      // Create new merged headers object
      let mergedHeadersObj: { [key: string]: string } = {};
      
      // Add default headers
      this.defaultHeaders.keys().forEach(key => {
        const value = this.defaultHeaders.get(key);
        if (value) {
          mergedHeadersObj[key] = value;
        }
      });
      
      // Add/override with provided headers
      headers.keys().forEach(key => {
        const value = headers.get(key);
        if (value) {
          mergedHeadersObj[key] = value;
        }
      });
      
      requestOptions.headers = new HttpHeaders(mergedHeadersObj);
    }

    // Add other supported options
    if (options.params) {
      requestOptions.params = options.params;
    }
    
    if (options.withCredentials !== undefined) {
      requestOptions.withCredentials = options.withCredentials;
    }

    return requestOptions;
  }
}