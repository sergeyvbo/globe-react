import { RFC9457Error, ProblemDetails, ValidationProblemDetails } from './types'

/**
 * Utility class for parsing and handling RFC 9457 Problem Details errors
 */
export class RFC9457ErrorParser {
  /**
   * Parses error data and returns RFC 9457 formatted error
   * @param errorData - Raw error data from API response
   * @returns Parsed RFC 9457 error or fallback error
   */
  static parseError(errorData: any): RFC9457Error {
    // Check if the error is already in RFC 9457 format
    if (this.isRFC9457Error(errorData)) {
      return errorData as RFC9457Error
    }
    
    // Create fallback error for unexpected formats
    return this.createFallbackError(errorData)
  }
  
  /**
   * Validates if the given data is in RFC 9457 format
   * @param data - Data to validate
   * @returns True if data matches RFC 9457 structure
   */
  static isRFC9457Error(data: any): boolean {
    return data !== null && 
           data !== undefined &&
           typeof data === 'object' && 
           (data.type !== undefined || 
            data.title !== undefined || 
            data.status !== undefined ||
            data.detail !== undefined)
  }
  
  /**
   * Creates a fallback error for non-RFC 9457 formats
   * @param errorData - Original error data
   * @returns Fallback ProblemDetails error
   */
  static createFallbackError(errorData: any): ProblemDetails {
    return {
      type: 'about:blank',
      title: 'Unknown Error',
      status: 500,
      detail: errorData?.message || errorData?.Error || 'An unexpected error occurred',
      instance: window.location.pathname
    }
  }
  
  /**
   * Extracts display message from RFC 9457 error for user presentation
   * @param error - RFC 9457 error object
   * @returns User-friendly error message
   */
  static getDisplayMessage(error: RFC9457Error): string {
    // Priority: detail -> title -> fallback message
    return error.detail || error.title || 'An error occurred'
  }
  
  /**
   * Extracts validation errors from ValidationProblemDetails
   * @param error - RFC 9457 error object
   * @returns Record of field validation errors or empty object
   */
  static getValidationErrors(error: RFC9457Error): Record<string, string[]> {
    // Type guard to check if error has validation errors
    if ('errors' in error && error.errors) {
      return error.errors
    }
    return {}
  }
}