/**
 * Centralized error types and interfaces for consistent error handling across the application
 */

import { AuthErrorType, ApiErrorDetails } from '../types'

// Base error interface for all application errors
export interface AppError {
  type: string
  message: string
  details?: ApiErrorDetails
  timestamp: Date
  context?: Record<string, unknown>
}

// Save operation specific error types
export enum SaveErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  OFFLINE_SAVE = 'OFFLINE_SAVE',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Save operation error interface
export interface SaveError extends AppError {
  type: SaveErrorType
  operation: 'save' | 'sync' | 'migrate'
  gameType?: string
  userId?: string
  retryable: boolean
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error display configuration
export interface ErrorDisplayConfig {
  severity: ErrorSeverity
  showToUser: boolean
  autoHide: boolean
  hideAfterMs?: number
  allowRetry: boolean
  retryAction?: () => Promise<void>
}

// Error context for better debugging
export interface ErrorContext {
  component?: string
  action?: string
  userId?: string
  gameType?: string
  timestamp: Date
  userAgent?: string
  url?: string
  additionalData?: Record<string, unknown>
}

// Error recovery strategies
export enum ErrorRecoveryStrategy {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  IGNORE = 'ignore',
  ESCALATE = 'escalate'
}

// Error recovery configuration
export interface ErrorRecoveryConfig {
  strategy: ErrorRecoveryStrategy
  maxRetries?: number
  retryDelayMs?: number
  fallbackAction?: () => Promise<void>
  escalationAction?: (error: AppError) => void
}