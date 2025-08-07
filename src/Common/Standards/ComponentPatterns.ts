/**
 * Standardized component patterns and utilities for consistent code structure
 */

import React from 'react'

// Standard component prop patterns
export interface BaseComponentProps {
  className?: string
  'data-testid'?: string
}

export interface ComponentWithChildren<T = {}> extends BaseComponentProps {
  children: React.ReactNode
}

// Standard event handler types
export type ClickHandler<T = HTMLElement> = (event: React.MouseEvent<T>) => void
export type ChangeHandler<T = HTMLInputElement> = (event: React.ChangeEvent<T>) => void
export type SubmitHandler<T = HTMLFormElement> = (event: React.FormEvent<T>) => void

// Standard async operation patterns
export interface AsyncOperationState<T = unknown, E = Error> {
  data: T | null
  loading: boolean
  error: E | null
}

// Standard hook return patterns
export interface BaseHookReturn<T = unknown> {
  data: T | null
  loading: boolean
  error: string | null
}

// Utility type for memoized components
export type MemoizedComponent<P = {}> = React.NamedExoticComponent<P>

// Standard component factory for consistent patterns
export const createStandardComponent = <P extends BaseComponentProps>(
  displayName: string,
  component: React.FC<P>,
  shouldMemo: boolean = true
): React.FC<P> => {
  const Component = shouldMemo ? React.memo(component) : component
  Component.displayName = displayName
  return Component
}

// Standard hook factory for consistent patterns
export const createStandardHook = <O, R>(
  hookName: string,
  hookImplementation: (options: O) => R
) => {
  const hook = (options: O): R => {
    return hookImplementation(options)
  }
  
  // Add hook name for debugging
  Object.defineProperty(hook, 'name', { value: hookName })
  
  return hook
}

// Standard error boundary props
export interface ErrorBoundaryProps extends ComponentWithChildren {
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

// Standard loading component props
export interface LoadingComponentProps extends BaseComponentProps {
  message?: string
  size?: 'small' | 'medium' | 'large'
}

// Standard modal component props
export interface ModalComponentProps extends BaseComponentProps {
  open: boolean
  onClose: () => void
  title?: string
}

// Standard form component props
export interface FormComponentProps<T = Record<string, unknown>> extends BaseComponentProps {
  initialValues?: Partial<T>
  onSubmit: (values: T) => void | Promise<void>
  onCancel?: () => void
  loading?: boolean
  error?: string | null
}

// Standard list component props
export interface ListComponentProps<T = unknown> extends BaseComponentProps {
  items: T[]
  loading?: boolean
  error?: string | null
  emptyMessage?: string
  renderItem: (item: T, index: number) => React.ReactNode
}

// Standard pagination props
export interface PaginationProps extends BaseComponentProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  loading?: boolean
}

// Standard filter props
export interface FilterProps<T = string> extends BaseComponentProps {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
  placeholder?: string
}

// Standard search props
export interface SearchProps extends BaseComponentProps {
  value: string
  onChange: (value: string) => void
  onSearch?: (value: string) => void
  placeholder?: string
  loading?: boolean
}

// Utility functions for consistent patterns
export const withStandardProps = <P extends BaseComponentProps>(
  Component: React.FC<P>
): React.FC<P> => {
  return React.memo((props) => {
    const { className = '', 'data-testid': testId, ...rest } = props
    
    return (
      <Component
        {...(rest as P)}
        className={className}
        data-testid={testId}
      />
    )
  })
}

// Standard component display name helper
export const getComponentDisplayName = (
  componentName: string,
  prefix?: string
): string => {
  return prefix ? `${prefix}.${componentName}` : componentName
}

// Standard prop validation helpers
export const validateRequiredProps = <T extends Record<string, unknown>>(
  props: T,
  requiredKeys: (keyof T)[]
): void => {
  const missingProps = requiredKeys.filter(key => 
    props[key] === undefined || props[key] === null
  )
  
  if (missingProps.length > 0) {
    throw new Error(
      `Missing required props: ${missingProps.join(', ')}`
    )
  }
}

// Standard callback memoization helper
export const useStandardCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  return React.useCallback(callback, deps)
}

// Standard memo helper
export const useStandardMemo = <T>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  return React.useMemo(factory, deps)
}