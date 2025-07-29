import { ErrorTypeMapper } from './ErrorTypeMapper'
import { AuthErrorType, RFC9457Error, ProblemDetails, ValidationProblemDetails } from './types'

describe('ErrorTypeMapper', () => {
  describe('mapToAuthErrorType', () => {
    it('should map validation-error type to VALIDATION_ERROR', () => {
      const error: ProblemDetails = {
        type: 'http://localhost:5000/problems/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'Validation failed'
      }
      
      const result = ErrorTypeMapper.mapToAuthErrorType(error)
      expect(result).toBe(AuthErrorType.VALIDATION_ERROR)
    })
    
    it('should map authentication-error with 401 status to TOKEN_EXPIRED', () => {
      const error: ProblemDetails = {
        type: 'http://localhost:5000/problems/authentication-error',
        title: 'Authentication Error',
        status: 401,
        detail: 'Token expired'
      }
      
      const result = ErrorTypeMapper.mapToAuthErrorType(error)
      expect(result).toBe(AuthErrorType.TOKEN_EXPIRED)
    })
    
    it('should map authentication-error with 400 status to INVALID_CREDENTIALS', () => {
      const error: ProblemDetails = {
        type: 'http://localhost:5000/problems/authentication-error',
        title: 'Authentication Error',
        status: 400,
        detail: 'Invalid credentials'
      }
      
      const result = ErrorTypeMapper.mapToAuthErrorType(error)
      expect(result).toBe(AuthErrorType.INVALID_CREDENTIALS)
    })
    
    it('should map conflict-error type to USER_EXISTS', () => {
      const error: ProblemDetails = {
        type: 'http://localhost:5000/problems/conflict-error',
        title: 'Conflict Error',
        status: 409,
        detail: 'User already exists'
      }
      
      const result = ErrorTypeMapper.mapToAuthErrorType(error)
      expect(result).toBe(AuthErrorType.USER_EXISTS)
    })
    
    it('should map authorization-error type to TOKEN_EXPIRED', () => {
      const error: ProblemDetails = {
        type: 'http://localhost:5000/problems/authorization-error',
        title: 'Authorization Error',
        status: 403,
        detail: 'Access denied'
      }
      
      const result = ErrorTypeMapper.mapToAuthErrorType(error)
      expect(result).toBe(AuthErrorType.TOKEN_EXPIRED)
    })
    
    it('should map oauth-error type to OAUTH_ERROR', () => {
      const error: ProblemDetails = {
        type: 'http://localhost:5000/problems/oauth-error',
        title: 'OAuth Error',
        status: 400,
        detail: 'OAuth authentication failed'
      }
      
      const result = ErrorTypeMapper.mapToAuthErrorType(error)
      expect(result).toBe(AuthErrorType.OAUTH_ERROR)
    })
    
    it('should map not-found-error type to NETWORK_ERROR', () => {
      const error: ProblemDetails = {
        type: 'http://localhost:5000/problems/not-found-error',
        title: 'Not Found Error',
        status: 404,
        detail: 'Resource not found'
      }
      
      const result = ErrorTypeMapper.mapToAuthErrorType(error)
      expect(result).toBe(AuthErrorType.NETWORK_ERROR)
    })
    
    it('should handle type patterns without base URL', () => {
      const error: ProblemDetails = {
        type: 'validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'Validation failed'
      }
      
      const result = ErrorTypeMapper.mapToAuthErrorType(error)
      expect(result).toBe(AuthErrorType.VALIDATION_ERROR)
    })
    
    it('should fallback to status code mapping for unknown types', () => {
      const error: ProblemDetails = {
        type: 'http://localhost:5000/problems/unknown-error',
        title: 'Unknown Error',
        status: 401,
        detail: 'Unknown error occurred'
      }
      
      const result = ErrorTypeMapper.mapToAuthErrorType(error)
      expect(result).toBe(AuthErrorType.TOKEN_EXPIRED)
    })
    
    it('should map status 409 to USER_EXISTS when type is unknown', () => {
      const error: ProblemDetails = {
        type: 'http://localhost:5000/problems/unknown-error',
        title: 'Unknown Error',
        status: 409,
        detail: 'Conflict occurred'
      }
      
      const result = ErrorTypeMapper.mapToAuthErrorType(error)
      expect(result).toBe(AuthErrorType.USER_EXISTS)
    })
    
    it('should map status 422 to VALIDATION_ERROR when type is unknown', () => {
      const error: ProblemDetails = {
        type: 'http://localhost:5000/problems/unknown-error',
        title: 'Unknown Error',
        status: 422,
        detail: 'Unprocessable entity'
      }
      
      const result = ErrorTypeMapper.mapToAuthErrorType(error)
      expect(result).toBe(AuthErrorType.VALIDATION_ERROR)
    })
    
    it('should default to NETWORK_ERROR for unknown types and status codes', () => {
      const error: ProblemDetails = {
        type: 'http://localhost:5000/problems/unknown-error',
        title: 'Unknown Error',
        status: 500,
        detail: 'Internal server error'
      }
      
      const result = ErrorTypeMapper.mapToAuthErrorType(error)
      expect(result).toBe(AuthErrorType.NETWORK_ERROR)
    })
    
    it('should handle missing type field', () => {
      const error: ProblemDetails = {
        title: 'Error',
        status: 401,
        detail: 'Error occurred'
      }
      
      const result = ErrorTypeMapper.mapToAuthErrorType(error)
      expect(result).toBe(AuthErrorType.TOKEN_EXPIRED)
    })
    
    it('should handle missing status field', () => {
      const error: ProblemDetails = {
        type: 'http://localhost:5000/problems/validation-error',
        title: 'Validation Error',
        detail: 'Validation failed'
      }
      
      const result = ErrorTypeMapper.mapToAuthErrorType(error)
      expect(result).toBe(AuthErrorType.VALIDATION_ERROR)
    })
    
    it('should handle case insensitive type matching', () => {
      const error: ProblemDetails = {
        type: 'HTTP://LOCALHOST:5000/PROBLEMS/VALIDATION-ERROR',
        title: 'Validation Error',
        status: 422,
        detail: 'Validation failed'
      }
      
      const result = ErrorTypeMapper.mapToAuthErrorType(error)
      expect(result).toBe(AuthErrorType.VALIDATION_ERROR)
    })
  })
  
  describe('createErrorDetails', () => {
    it('should create error details with all RFC 9457 fields', () => {
      const error: ProblemDetails = {
        type: 'http://localhost:5000/problems/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'Validation failed',
        instance: '/api/auth/register'
      }
      
      const result = ErrorTypeMapper.createErrorDetails(error)
      
      expect(result).toEqual({
        type: 'http://localhost:5000/problems/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'Validation failed',
        instance: '/api/auth/register'
      })
    })
    
    it('should include validation errors when present', () => {
      const error: ValidationProblemDetails = {
        type: 'http://localhost:5000/problems/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'Validation failed',
        instance: '/api/auth/register',
        errors: {
          email: ['Invalid email format'],
          password: ['Password too short']
        }
      }
      
      const result = ErrorTypeMapper.createErrorDetails(error)
      
      expect(result).toEqual({
        type: 'http://localhost:5000/problems/validation-error',
        title: 'Validation Error',
        status: 422,
        detail: 'Validation failed',
        instance: '/api/auth/register',
        errors: {
          email: ['Invalid email format'],
          password: ['Password too short']
        }
      })
    })
    
    it('should handle missing optional fields', () => {
      const error: ProblemDetails = {
        status: 500
      }
      
      const result = ErrorTypeMapper.createErrorDetails(error)
      
      expect(result).toEqual({
        type: undefined,
        title: undefined,
        status: 500,
        detail: undefined,
        instance: undefined
      })
    })
    
    it('should include additional custom fields', () => {
      const error: ProblemDetails & { customField: string } = {
        type: 'http://localhost:5000/problems/custom-error',
        title: 'Custom Error',
        status: 400,
        detail: 'Custom error occurred',
        instance: '/api/custom',
        customField: 'custom value'
      }
      
      const result = ErrorTypeMapper.createErrorDetails(error)
      
      expect(result).toEqual({
        type: 'http://localhost:5000/problems/custom-error',
        title: 'Custom Error',
        status: 400,
        detail: 'Custom error occurred',
        instance: '/api/custom',
        customField: 'custom value'
      })
    })
    
    it('should not include validation errors when not present', () => {
      const error: ProblemDetails = {
        type: 'http://localhost:5000/problems/authentication-error',
        title: 'Authentication Error',
        status: 401,
        detail: 'Token expired'
      }
      
      const result = ErrorTypeMapper.createErrorDetails(error)
      
      expect(result.errors).toBeUndefined()
    })
  })
  
  describe('extractTypePattern (private method behavior)', () => {
    it('should extract type pattern from URL correctly', () => {
      const error1: ProblemDetails = {
        type: 'http://localhost:5000/problems/validation-error',
        status: 422
      }
      
      const error2: ProblemDetails = {
        type: 'https://api.example.com/errors/authentication-error',
        status: 401
      }
      
      const result1 = ErrorTypeMapper.mapToAuthErrorType(error1)
      const result2 = ErrorTypeMapper.mapToAuthErrorType(error2)
      
      expect(result1).toBe(AuthErrorType.VALIDATION_ERROR)
      expect(result2).toBe(AuthErrorType.TOKEN_EXPIRED)
    })
    
    it('should handle simple type patterns without URL', () => {
      const error: ProblemDetails = {
        type: 'conflict-error',
        status: 409
      }
      
      const result = ErrorTypeMapper.mapToAuthErrorType(error)
      expect(result).toBe(AuthErrorType.USER_EXISTS)
    })
    
    it('should handle empty type gracefully', () => {
      const error: ProblemDetails = {
        type: '',
        status: 401
      }
      
      const result = ErrorTypeMapper.mapToAuthErrorType(error)
      expect(result).toBe(AuthErrorType.TOKEN_EXPIRED)
    })
  })
})