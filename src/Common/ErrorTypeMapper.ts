import { AuthErrorType, RFC9457Error, ApiErrorDetails } from './types'
import { RFC9457ErrorParser } from './RFC9457ErrorParser'

/**
 * Utility class for mapping RFC 9457 error types to AuthErrorType enum
 * and creating backward-compatible error details
 */
export class ErrorTypeMapper {
  /**
   * Maps RFC 9457 error type to AuthErrorType based on type field and status code
   * @param error - RFC 9457 error object
   * @returns Corresponding AuthErrorType
   */
  static mapToAuthErrorType(error: RFC9457Error): AuthErrorType {
    const problemType = error.type?.toLowerCase() || ''
    const status = error.status || 500
    
    // Extract the actual problem type from the URL (remove base URL if present)
    const typePattern = this.extractTypePattern(problemType)
    
    // Map based on problem type pattern (independent of base URL)
    if (typePattern.includes('validation-error')) {
      return AuthErrorType.VALIDATION_ERROR
    }
    
    if (typePattern.includes('authentication-error')) {
      // Distinguish by status code for authentication errors
      return status === 401 ? AuthErrorType.TOKEN_EXPIRED : AuthErrorType.INVALID_CREDENTIALS
    }
    
    if (typePattern.includes('conflict-error')) {
      return AuthErrorType.USER_EXISTS
    }
    
    if (typePattern.includes('authorization-error')) {
      return AuthErrorType.TOKEN_EXPIRED
    }
    
    if (typePattern.includes('oauth-error')) {
      return AuthErrorType.OAUTH_ERROR
    }
    
    if (typePattern.includes('not-found-error')) {
      return AuthErrorType.NETWORK_ERROR
    }
    
    // Fallback mapping based on HTTP status code
    switch (status) {
      case 401:
        return AuthErrorType.TOKEN_EXPIRED
      case 409:
        return AuthErrorType.USER_EXISTS
      case 422:
        return AuthErrorType.VALIDATION_ERROR
      default:
        return AuthErrorType.NETWORK_ERROR
    }
  }
  
  /**
   * Creates error details object for backward compatibility with existing code
   * @param error - RFC 9457 error object
   * @returns Error details object with all RFC 9457 fields
   */
  static createErrorDetails(error: RFC9457Error): ApiErrorDetails {
    const details: ApiErrorDetails = {
      code: error.type,
      message: error.detail || error.title || 'An error occurred'
    }
    
    // Add validation errors if present
    const validationErrors = RFC9457ErrorParser.getValidationErrors(error)
    if (Object.keys(validationErrors).length > 0) {
      details.field = Object.keys(validationErrors)[0] // First field with error
    }
    
    // Add any additional fields from the error object
    Object.keys(error).forEach(key => {
      if (!['type', 'title', 'status', 'detail', 'instance', 'errors'].includes(key)) {
        const value = error[key]
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          details[key] = value
        }
      }
    })
    
    return details
  }
  
  /**
   * Extracts the problem type pattern from the type URL
   * @param typeUrl - The type URL from RFC 9457 error
   * @returns Extracted type pattern
   */
  private static extractTypePattern(typeUrl: string): string {
    if (!typeUrl) return ''
    
    // If it's a URL, extract the last part after the last slash
    if (typeUrl.includes('/')) {
      const parts = typeUrl.split('/')
      return parts[parts.length - 1].toLowerCase()
    }
    
    // If it's already just a type pattern, return as is
    return typeUrl.toLowerCase()
  }
}