# Coding Standards and Patterns

This document defines the standardized coding patterns and styles for the GeoQuiz project.

## Import Organization

### Order of Imports
1. React and React-related imports
2. Third-party library imports (grouped by library)
3. Internal imports (grouped by type: types, utils, components, hooks)
4. Relative imports
5. Asset imports (JSON, CSS, images)

### Example:
```typescript
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button, Grid2, Box } from '@mui/material'
import { Settings, AccountCircle } from '@mui/icons-material'

import { GameType, User, CountryOption } from '../Common/types'
import { randomElement, shuffleArray } from '../Common/utils'
import { useAuth } from '../Common/Auth/AuthContext'
import { useBaseQuiz } from '../Common/Hooks/useBaseQuiz'
import { QuizLayout } from '../Common/QuizLayout'

import geoJson from '../Common/GeoData/geo.json'
import './Component.css'
```

## Component Patterns

### Component Declaration
- Use `React.FC` for functional components with props
- Use `React.memo` for components that may re-render frequently
- Always export components using named exports

```typescript
interface ComponentProps {
  prop1: string
  prop2?: number
}

export const Component: React.FC<ComponentProps> = React.memo(({ prop1, prop2 }) => {
  // Component implementation
})
```

### Component Structure
1. Props interface/type definition
2. Component declaration with React.memo if needed
3. Hooks (in order: state, effects, custom hooks)
4. Event handlers (useCallback)
5. Computed values (useMemo)
6. Render logic

## Hook Usage Patterns

### useCallback Guidelines
- Use for event handlers that are passed to child components
- Use for functions that are dependencies of other hooks
- Don't overuse for simple functions that don't cause re-renders

### useMemo Guidelines
- Use for expensive computations
- Use for object/array creation that's passed to child components
- Don't use for primitive values or simple computations

### Custom Hook Patterns
```typescript
export interface UseCustomHookOptions {
  option1: string
  option2: boolean
}

export interface UseCustomHookReturn {
  value1: string
  value2: number
  action1: () => void
}

export const useCustomHook = (options: UseCustomHookOptions): UseCustomHookReturn => {
  // Hook implementation
}
```

## TypeScript Patterns

### Interface vs Type
- Use `interface` for component props and object shapes
- Use `type` for unions, primitives, and computed types

### Prop Types
```typescript
interface ComponentProps {
  // Required props first
  requiredProp: string
  requiredCallback: (value: string) => void
  
  // Optional props second
  optionalProp?: number
  optionalCallback?: () => void
  
  // Common optional props last
  className?: string
  'data-testid'?: string
}
```

## Error Handling

### Consistent Error Handling
- Use try-catch blocks for async operations
- Log errors with context information
- Use centralized error handling utilities where available

```typescript
const handleAsyncOperation = useCallback(async () => {
  try {
    await someAsyncOperation()
  } catch (error) {
    console.error('Failed to perform operation:', error)
    // Handle error appropriately
  }
}, [])
```

## Performance Optimization

### React.memo Usage
- Use for components that receive props and may re-render frequently
- Don't use for components that rarely re-render or have no props

### Callback Optimization
- Memoize callbacks that are passed to child components
- Use stable references for dependency arrays

## File Organization

### File Naming
- Use PascalCase for component files: `ComponentName.tsx`
- Use camelCase for utility files: `utilityName.ts`
- Use kebab-case for CSS files: `component-name.css`

### Export Patterns
- Use named exports for components and utilities
- Export types and interfaces from a central types file
- Re-export commonly used items from index files

## Code Style

### Formatting
- Use 2 spaces for indentation
- Use single quotes for strings
- Use trailing commas in objects and arrays
- Use semicolons at the end of statements

### Naming Conventions
- Use camelCase for variables and functions
- Use PascalCase for components and types
- Use UPPER_SNAKE_CASE for constants
- Use descriptive names that explain the purpose