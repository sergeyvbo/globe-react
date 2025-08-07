# GeoQuiz Style Guide

This document defines the comprehensive coding standards and style guide for the GeoQuiz project.

## Table of Contents

1. [General Principles](#general-principles)
2. [File Organization](#file-organization)
3. [Import Standards](#import-standards)
4. [Component Patterns](#component-patterns)
5. [Hook Patterns](#hook-patterns)
6. [TypeScript Standards](#typescript-standards)
7. [Performance Guidelines](#performance-guidelines)
8. [Error Handling](#error-handling)
9. [Testing Patterns](#testing-patterns)
10. [Code Formatting](#code-formatting)

## General Principles

### 1. Consistency
- Follow established patterns throughout the codebase
- Use consistent naming conventions
- Maintain consistent file structure

### 2. Readability
- Write self-documenting code
- Use descriptive variable and function names
- Add comments for complex logic

### 3. Maintainability
- Keep functions and components small and focused
- Avoid deep nesting
- Use composition over inheritance

### 4. Performance
- Optimize re-renders with React.memo, useCallback, and useMemo
- Avoid unnecessary computations
- Use lazy loading where appropriate

## File Organization

### Directory Structure
```
src/
├── Common/
│   ├── Auth/
│   ├── Hooks/
│   ├── Standards/
│   ├── types.ts
│   └── utils.ts
├── ComponentName/
│   ├── ComponentName.tsx
│   ├── ComponentName.test.tsx
│   ├── ComponentName.css
│   └── index.ts
```

### File Naming Conventions
- **Components**: PascalCase (`ComponentName.tsx`)
- **Hooks**: camelCase with 'use' prefix (`useCustomHook.ts`)
- **Utilities**: camelCase (`utilityName.ts`)
- **Types**: camelCase (`types.ts`)
- **Tests**: Component name + `.test.tsx`
- **Styles**: kebab-case (`component-name.css`)

## Import Standards

### Import Order
1. React and React-related imports
2. Third-party library imports (grouped by library)
3. Internal imports (types, utils, hooks, components)
4. Relative imports
5. Asset imports (JSON, CSS, images)

### Example
```typescript
import React, { useState, useEffect, useCallback } from 'react'
import { Button, Grid2, Box } from '@mui/material'
import { Settings } from '@mui/icons-material'

import { GameType, User } from '../Common/types'
import { randomElement } from '../Common/utils'
import { useAuth } from '../Common/Auth/AuthContext'
import { useBaseQuiz } from '../Common/Hooks/useBaseQuiz'
import { QuizLayout } from '../Common/QuizLayout'

import geoJson from '../Common/GeoData/geo.json'
import './Component.css'
```

## Component Patterns

### Component Declaration
```typescript
interface ComponentProps {
  // Required props first
  requiredProp: string
  onAction: (value: string) => void
  
  // Optional props second
  optionalProp?: number
  
  // Standard optional props last
  className?: string
  'data-testid'?: string
}

export const Component: React.FC<ComponentProps> = React.memo(({
  requiredProp,
  onAction,
  optionalProp = 0,
  className = '',
  'data-testid': testId
}) => {
  // Component implementation
})
```

### Component Structure Order
1. Props interface/type definition
2. Component declaration with React.memo if needed
3. State hooks
4. Effect hooks
5. Custom hooks
6. Event handlers (useCallback)
7. Computed values (useMemo)
8. Render helpers
9. Return statement

### When to Use React.memo
- Components that receive props and may re-render frequently
- Components with expensive render logic
- Components that are used multiple times in lists

### When NOT to Use React.memo
- Components that rarely re-render
- Components with no props
- Components that always receive new props

## Hook Patterns

### Custom Hook Structure
```typescript
export interface UseCustomHookOptions {
  option1: string
  option2: boolean
}

export interface UseCustomHookReturn {
  data: SomeType | null
  loading: boolean
  error: string | null
  actions: {
    action1: () => void
    action2: (param: string) => Promise<void>
  }
}

export const useCustomHook = (options: UseCustomHookOptions): UseCustomHookReturn => {
  // Hook implementation
  const [data, setData] = useState<SomeType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Effects
  useEffect(() => {
    // Effect logic
  }, [])

  // Actions
  const action1 = useCallback(() => {
    // Action implementation
  }, [])

  const action2 = useCallback(async (param: string) => {
    // Async action implementation
  }, [])

  return {
    data,
    loading,
    error,
    actions: {
      action1,
      action2
    }
  }
}
```

### useCallback Guidelines
- Use for event handlers passed to child components
- Use for functions that are dependencies of other hooks
- Use for functions that create closures over state
- Don't overuse for simple functions

### useMemo Guidelines
- Use for expensive computations
- Use for object/array creation passed to child components
- Use for filtering/transforming large datasets
- Don't use for primitive values or simple computations

## TypeScript Standards

### Interface vs Type
```typescript
// Use interface for object shapes and component props
interface ComponentProps {
  name: string
  age: number
}

// Use type for unions, primitives, and computed types
type Status = 'loading' | 'success' | 'error'
type EventHandler<T> = (event: T) => void
```

### Generic Types
```typescript
// Use descriptive generic names
interface ApiResponse<TData> {
  data: TData
  success: boolean
  error?: string
}

// Constrain generics when appropriate
interface Repository<T extends { id: string }> {
  findById(id: string): Promise<T | null>
  save(entity: T): Promise<T>
}
```

### Utility Types
```typescript
// Create reusable utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>
```

## Performance Guidelines

### React.memo Usage
```typescript
// Good: Component that may re-render frequently
export const ExpensiveComponent: React.FC<Props> = React.memo(({ data }) => {
  // Expensive rendering logic
})

// Good: Component with stable props
export const StableComponent: React.FC<Props> = React.memo(({ 
  staticProp,
  onAction 
}) => {
  // Component logic
})
```

### Callback Optimization
```typescript
// Good: Memoized callback for child component
const handleClick = useCallback((id: string) => {
  onItemClick(id)
}, [onItemClick])

// Good: Stable callback with dependencies
const handleSubmit = useCallback(async (data: FormData) => {
  setLoading(true)
  try {
    await submitData(data)
  } finally {
    setLoading(false)
  }
}, [submitData])
```

### Memo Optimization
```typescript
// Good: Expensive computation
const expensiveValue = useMemo(() => {
  return data.filter(item => item.active)
    .map(item => transformItem(item))
    .sort((a, b) => a.name.localeCompare(b.name))
}, [data])

// Good: Object creation for child props
const childProps = useMemo(() => ({
  config: { theme: 'dark', size: 'large' },
  handlers: { onClick: handleClick, onHover: handleHover }
}), [handleClick, handleHover])
```

## Error Handling

### Async Operations
```typescript
const handleAsyncOperation = useCallback(async () => {
  try {
    setLoading(true)
    setError(null)
    const result = await someAsyncOperation()
    setData(result)
  } catch (error) {
    console.error('Operation failed:', error)
    setError(error instanceof Error ? error.message : 'Unknown error')
  } finally {
    setLoading(false)
  }
}, [])
```

### Error Boundaries
```typescript
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />
    }

    return this.props.children
  }
}
```

## Testing Patterns

### Component Testing
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { Component } from './Component'

describe('Component', () => {
  const defaultProps = {
    requiredProp: 'test',
    onAction: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly', () => {
    render(<Component {...defaultProps} />)
    expect(screen.getByText('test')).toBeInTheDocument()
  })

  it('handles user interaction', () => {
    render(<Component {...defaultProps} />)
    fireEvent.click(screen.getByRole('button'))
    expect(defaultProps.onAction).toHaveBeenCalledWith('expected-value')
  })
})
```

### Hook Testing
```typescript
import { renderHook, act } from '@testing-library/react'
import { useCustomHook } from './useCustomHook'

describe('useCustomHook', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useCustomHook({ option1: 'test' }))
    
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('handles actions correctly', async () => {
    const { result } = renderHook(() => useCustomHook({ option1: 'test' }))
    
    await act(async () => {
      await result.current.actions.action2('param')
    })
    
    expect(result.current.data).toBeDefined()
  })
})
```

## Code Formatting

### Prettier Configuration
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

### ESLint Rules
```json
{
  "extends": [
    "react-app",
    "react-app/jest",
    "@typescript-eslint/recommended"
  ],
  "rules": {
    "import/order": ["error", {
      "groups": [
        "builtin",
        "external",
        "internal",
        "parent",
        "sibling",
        "index"
      ],
      "newlines-between": "always"
    }],
    "react-hooks/exhaustive-deps": "warn",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "off"
  }
}
```

### Naming Conventions

#### Variables and Functions
```typescript
// camelCase for variables and functions
const userName = 'john'
const getUserData = () => {}
const handleButtonClick = () => {}
```

#### Constants
```typescript
// UPPER_SNAKE_CASE for constants
const MAX_RETRY_ATTEMPTS = 3
const API_BASE_URL = 'https://api.example.com'
```

#### Components and Types
```typescript
// PascalCase for components and types
interface UserProfile {
  name: string
  email: string
}

const UserProfileCard: React.FC<UserProfile> = () => {}
```

#### Files and Directories
```typescript
// PascalCase for component files
UserProfile.tsx
UserProfile.test.tsx

// camelCase for utility files
userUtils.ts
apiClient.ts

// kebab-case for CSS files
user-profile.css
main-menu.css
```

## Best Practices Summary

1. **Consistency**: Follow established patterns
2. **Performance**: Use React.memo, useCallback, and useMemo appropriately
3. **Type Safety**: Leverage TypeScript for better code quality
4. **Error Handling**: Handle errors gracefully with proper logging
5. **Testing**: Write comprehensive tests for components and hooks
6. **Documentation**: Document complex logic and public APIs
7. **Accessibility**: Ensure components are accessible
8. **Security**: Validate inputs and sanitize outputs
9. **Maintainability**: Keep code modular and well-organized
10. **Performance**: Monitor and optimize bundle size and runtime performance