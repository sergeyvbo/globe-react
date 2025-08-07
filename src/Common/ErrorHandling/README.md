# Centralized Error Handling System

This directory contains a comprehensive centralized error handling system for the GeoQuiz application. The system provides consistent error processing, messaging, and recovery strategies across all components.

## Components

### Core Error Types (`ErrorTypes.ts`)
- **AppError**: Base interface for all application errors
- **SaveError**: Specialized interface for save operation errors
- **SaveErrorType**: Enumeration of save-specific error types
- **ErrorSeverity**: Error severity levels (LOW, MEDIUM, HIGH, CRITICAL)
- **ErrorDisplayConfig**: Configuration for error display behavior
- **ErrorRecoveryConfig**: Configuration for error recovery strategies

### Save Error Handler (`SaveErrorHandler.ts`)
Centralized singleton service for processing save operation errors:
- **Error Processing**: Categorizes and processes different types of errors
- **User Messages**: Provides consistent, user-friendly error messages
- **Display Configuration**: Determines how errors should be displayed
- **Recovery Strategies**: Defines appropriate recovery actions
- **Logging**: Comprehensive error logging with context

### Error Boundary (`ErrorBoundary.tsx`)
Enhanced React Error Boundary component:
- **Fallback UI**: Provides user-friendly error display
- **Error Details**: Optional detailed error information
- **Retry Functionality**: Allows users to retry failed operations
- **Context Integration**: Captures and logs error context
- **HOC Support**: Higher-order component wrapper for easy integration

### Error Notification (`ErrorNotification.tsx`)
Toast-style error notification component:
- **Severity-based Styling**: Visual styling based on error severity
- **Auto-hide**: Configurable auto-hide behavior
- **Retry Actions**: Integrated retry functionality
- **Expandable Details**: Optional detailed error information

### Save Error Handler Hook (`useSaveErrorHandler.ts`)
React hook for handling save operation errors:
- **Error State Management**: Manages error state and retry logic
- **Retry Functionality**: Configurable retry attempts with delays
- **Context Integration**: Automatic error context tracking
- **Offline Support**: Handles offline/online state transitions

## Integration

### Updated Components

#### useGameProgress Hook
Enhanced with centralized error handling:
- Replaces manual error handling with `useSaveErrorHandler`
- Provides consistent error messages and retry functionality
- Integrates with offline detection and recovery

#### SaveStatusIndicator Component
Enhanced with error handling features:
- Severity-based styling using error handler configuration
- Integrated retry button for retryable errors
- Support for both legacy string errors and new SaveError objects

## Usage Examples

### Basic Error Handling
```typescript
import { useSaveErrorHandler } from './ErrorHandling'

const MyComponent = () => {
  const errorHandler = useSaveErrorHandler({
    context: { component: 'MyComponent', gameType: 'countries' }
  })

  const handleSave = async () => {
    try {
      await saveOperation()
    } catch (error) {
      errorHandler.handleError(error, { action: 'save' })
    }
  }

  return (
    <div>
      {errorHandler.error && (
        <ErrorNotification
          error={errorHandler.error}
          onRetry={errorHandler.canRetry ? errorHandler.retry : undefined}
          onClose={errorHandler.clearError}
        />
      )}
    </div>
  )
}
```

### Error Boundary Usage
```typescript
import { ErrorBoundary } from './ErrorHandling'

const App = () => (
  <ErrorBoundary
    showErrorDetails={true}
    context={{ component: 'App' }}
    onError={(error, errorInfo) => {
      // Custom error handling
      console.error('App error:', error)
    }}
  >
    <MyComponent />
  </ErrorBoundary>
)
```

### Enhanced Save Status Indicator
```typescript
import { SaveStatusIndicator } from '../SaveStatusIndicator'

const QuizComponent = () => {
  const errorHandler = useSaveErrorHandler()
  
  return (
    <SaveStatusIndicator
      isSaving={isSaving}
      saveError={errorHandler.getUserMessage}
      error={errorHandler.error}
      onRetry={errorHandler.canRetry ? errorHandler.retry : undefined}
    />
  )
}
```

## Features

### Error Processing
- **Automatic Categorization**: Errors are automatically categorized by type
- **Context Tracking**: Comprehensive context information is captured
- **Severity Assessment**: Errors are assigned appropriate severity levels
- **User-Friendly Messages**: Technical errors are converted to user-friendly messages

### Recovery Strategies
- **Automatic Retry**: Configurable retry logic with exponential backoff
- **Fallback Actions**: Alternative actions when primary operations fail
- **Escalation**: Automatic escalation for critical errors
- **Offline Handling**: Special handling for offline scenarios

### Display Configuration
- **Severity-based Styling**: Visual styling adapts to error severity
- **Auto-hide Behavior**: Configurable auto-hide for different error types
- **Retry Integration**: Seamless retry functionality in UI components
- **Accessibility**: Full accessibility support for error displays

### Logging and Monitoring
- **Structured Logging**: Consistent error logging format
- **Context Preservation**: Full context information in logs
- **Performance Tracking**: Error frequency and retry success tracking
- **Debug Information**: Detailed information for development

## Testing

The system includes comprehensive tests for:
- Error processing and categorization
- User message generation
- Display configuration logic
- Recovery strategy selection
- React component behavior
- Hook functionality

## Benefits

### For Developers
- **Consistent API**: Single interface for all error handling
- **Reduced Boilerplate**: Less repetitive error handling code
- **Better Debugging**: Rich context and logging information
- **Type Safety**: Full TypeScript support with proper typing

### For Users
- **Consistent Experience**: Uniform error messages and behavior
- **Better Recovery**: Automatic retry and recovery options
- **Clear Communication**: User-friendly error messages
- **Reduced Frustration**: Graceful error handling and recovery

### For Maintenance
- **Centralized Logic**: Single place to update error handling
- **Easy Testing**: Comprehensive test coverage
- **Monitoring Integration**: Ready for error monitoring services
- **Documentation**: Well-documented API and usage patterns

## Future Enhancements

- Integration with error monitoring services (Sentry, etc.)
- Advanced retry strategies (exponential backoff, circuit breaker)
- Error analytics and reporting
- Internationalization support for error messages
- Performance optimization for high-frequency errors