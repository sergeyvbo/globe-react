/**
 * Tests for ErrorBoundary component
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ErrorBoundary, withErrorBoundary } from '../ErrorBoundary'

// Mock MUI components
vi.mock('@mui/material', () => ({
  Box: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Typography: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
  Alert: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>
}))

vi.mock('@mui/icons-material', () => ({
  Refresh: () => <span>RefreshIcon</span>,
  BugReport: () => <span>BugReportIcon</span>,
  Home: () => <span>HomeIcon</span>
}))

// Test component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock console.error to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Normal Operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      expect(screen.getByText('No error')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should catch and display error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should call onError callback when error occurs', () => {
      const onError = vi.fn()

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'COMPONENT_ERROR',
          message: 'Test error'
        }),
        expect.any(Object)
      )
    })

    it('should display custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Custom error message')).toBeInTheDocument()
    })
  })

  describe('Error Details', () => {
    it('should show error details when showErrorDetails is true', () => {
      render(
        <ErrorBoundary showErrorDetails={true}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Error Details:')).toBeInTheDocument()
      expect(screen.getByText('Test error')).toBeInTheDocument()
    })

    it('should not show error details by default', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.queryByText('Error Details:')).not.toBeInTheDocument()
    })
  })

  describe('Action Buttons', () => {
    it('should show retry button when allowRetry is not false', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText(/Try Again/)).toBeInTheDocument()
    })

    it('should not show retry button when allowRetry is false', () => {
      render(
        <ErrorBoundary allowRetry={false}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.queryByText(/Try Again/)).not.toBeInTheDocument()
    })

    it('should show reset button when allowReset is not false', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Reset Component')).toBeInTheDocument()
    })

    it('should not show reset button when allowReset is false', () => {
      render(
        <ErrorBoundary allowReset={false}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.queryByText('Reset Component')).not.toBeInTheDocument()
    })

    it('should always show go home button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Go Home')).toBeInTheDocument()
    })
  })

  describe('Retry Functionality', () => {
    it('should retry and recover from error', () => {
      const TestComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
        if (shouldThrow) {
          throw new Error('Test error')
        }
        return <div>Recovered</div>
      }

      const { rerender } = render(
        <ErrorBoundary>
          <TestComponent shouldThrow={true} />
        </ErrorBoundary>
      )

      // Error should be displayed
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      // Click retry button
      const retryButton = screen.getByText(/Try Again/)
      fireEvent.click(retryButton)

      // Rerender with no error
      rerender(
        <ErrorBoundary>
          <TestComponent shouldThrow={false} />
        </ErrorBoundary>
      )

      // Should show recovered content
      expect(screen.getByText('Recovered')).toBeInTheDocument()
    })

    it('should limit retry attempts', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const retryButton = screen.getByText(/Try Again \(3 left\)/)
      
      // Click retry multiple times
      fireEvent.click(retryButton)
      fireEvent.click(screen.getByText(/Try Again \(2 left\)/))
      fireEvent.click(screen.getByText(/Try Again \(1 left\)/))

      // After 3 retries, button should be disabled or hidden
      expect(screen.queryByText(/Try Again/)).not.toBeInTheDocument()
    })
  })

  describe('withErrorBoundary HOC', () => {
    it('should wrap component with error boundary', () => {
      const TestComponent = () => <div>Test Component</div>
      const WrappedComponent = withErrorBoundary(TestComponent)

      render(<WrappedComponent />)

      expect(screen.getByText('Test Component')).toBeInTheDocument()
    })

    it('should pass error boundary props', () => {
      const TestComponent = () => {
        throw new Error('HOC test error')
      }
      
      const WrappedComponent = withErrorBoundary(TestComponent, {
        showErrorDetails: true
      })

      render(<WrappedComponent />)

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText('Error Details:')).toBeInTheDocument()
    })

    it('should set correct display name', () => {
      const TestComponent = () => <div>Test</div>
      TestComponent.displayName = 'TestComponent'
      
      const WrappedComponent = withErrorBoundary(TestComponent)
      
      expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)')
    })
  })

  describe('Context Integration', () => {
    it('should include context in error object', () => {
      const onError = vi.fn()
      const context = { component: 'TestComponent', gameType: 'countries' }

      render(
        <ErrorBoundary onError={onError} context={context}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining(context)
        }),
        expect.any(Object)
      )
    })
  })
})