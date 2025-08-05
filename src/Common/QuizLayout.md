# QuizLayout Component

A shared layout component for all quiz types that provides consistent structure and responsive design. This component eliminates code duplication across CountryQuiz, FlagQuiz, and StateQuiz components by providing a common layout structure with slots for different content areas.

## Features

- **Consistent Layout Structure**: Provides standardized layout for all quiz types
- **Responsive Design**: Adapts to mobile and desktop screens
- **Accessibility**: Includes proper ARIA roles and semantic HTML
- **Status Indicators**: Built-in support for offline and save status indicators
- **Flexible Content Slots**: Supports menu, game area, quiz, score, and additional content
- **Loading States**: Built-in loading state management
- **TypeScript Support**: Fully typed with comprehensive interfaces

## Usage

### Basic Usage

```tsx
import { QuizLayout } from '../Common/QuizLayout'
import { MainMenu } from '../MainMenu/MainMenu'
import { Globe } from '../Globe/Globe'
import { Quiz } from '../Quiz/Quiz'
import { Score } from '../CountryQuiz/Score'

const MyQuiz = () => {
  return (
    <QuizLayout
      menuComponent={<MainMenu />}
      gameAreaComponent={
        <Globe 
          geoData={geoData} 
          selectedCountry={selectedCountry}
        />
      }
      quizComponent={
        <Quiz 
          options={options}
          onSubmit={handleSubmit}
        />
      }
      scoreComponent={
        <Score 
          correctScore={correctScore} 
          wrongScore={wrongScore} 
        />
      }
      isSaving={isSaving}
      saveError={saveError}
    />
  )
}
```

### With Loading State

```tsx
<QuizLayout
  menuComponent={<MainMenu />}
  gameAreaComponent={<GameContent />}
  isLoading={isDataLoading}
  loadingMessage="Loading quiz data..."
/>
```

### With Additional Content (Modals)

```tsx
<QuizLayout
  menuComponent={<MainMenu />}
  gameAreaComponent={<GameContent />}
  additionalContent={
    <AuthModal 
      open={showAuthModal}
      onClose={handleAuthModalClose}
    />
  }
/>
```

### Customizing Status Indicators

```tsx
<QuizLayout
  menuComponent={<MainMenu />}
  gameAreaComponent={<GameContent />}
  showOfflineIndicator={false}  // Hide offline indicator
  showSaveIndicator={true}      // Show save indicator
  isSaving={isSaving}
  saveError={saveError}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `menuComponent` | `React.ReactNode` | **Required** | Main menu component (e.g., MainMenu, FlagMainMenu) |
| `gameAreaComponent` | `React.ReactNode` | **Required** | Main game area component (e.g., Globe, Map) |
| `quizComponent` | `React.ReactNode` | `undefined` | Quiz component for user interaction |
| `scoreComponent` | `React.ReactNode` | `undefined` | Score display component |
| `showOfflineIndicator` | `boolean` | `true` | Whether to show the offline indicator |
| `showSaveIndicator` | `boolean` | `true` | Whether to show the save status indicator |
| `isSaving` | `boolean` | `false` | Whether a save operation is in progress |
| `saveError` | `string \| null` | `null` | Error message if save operation failed |
| `additionalContent` | `React.ReactNode` | `undefined` | Additional content (modals, overlays, etc.) |
| `className` | `string` | `''` | Custom CSS class name |
| `isLoading` | `boolean` | `false` | Loading state - shows loading message when true |
| `loadingMessage` | `string` | `'Loading...'` | Loading message to display |

## Layout Structure

The component creates the following layout structure:

```
┌─────────────────────────────────────┐
│ Header (Menu Component)             │
├─────────────────────────────────────┤
│ Status Indicators (Fixed Position)  │
│ ┌─────────────────────────────────┐ │
│ │ Main Content Area               │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │ Game Area Component         │ │ │
│ │ │ (Globe, Map, etc.)          │ │ │
│ │ └─────────────────────────────┘ │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │ Quiz Component              │ │ │
│ │ │ (Fixed on mobile)           │ │ │
│ │ └─────────────────────────────┘ │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Score Component (Aside)             │
├─────────────────────────────────────┤
│ Additional Content (Absolute)       │
└─────────────────────────────────────┘
```

## Responsive Behavior

### Desktop
- Standard vertical layout with all components stacked
- Quiz component flows naturally in the layout
- Full-width game area

### Mobile
- Quiz component becomes fixed at bottom of screen
- Score component gets bottom margin to avoid overlap
- Game area adjusts for fixed quiz component
- Touch-friendly spacing and sizing

## Accessibility Features

- **Semantic HTML**: Uses proper HTML5 semantic elements (`header`, `main`, `aside`)
- **ARIA Roles**: Includes `banner`, `main`, `complementary` roles
- **ARIA Labels**: Score section has `aria-label="Game score"`
- **Loading States**: Loading indicator has `role="status"` and `aria-live="polite"`
- **Keyboard Navigation**: All interactive elements remain keyboard accessible
- **Screen Reader Support**: Proper heading hierarchy and content structure

## Integration with Existing Components

### CountryQuiz Integration
```tsx
// Before (in CountryQuiz.tsx)
return (
  <div>
    <MainMenu />
    <OfflineIndicator />
    <SaveStatusIndicator isSaving={isSaving} saveError={saveError} />
    <Globe ... />
    <Quiz ... />
    <Score ... />
    <AuthModal ... />
  </div>
)

// After (using QuizLayout)
return (
  <QuizLayout
    menuComponent={<MainMenu />}
    gameAreaComponent={<Globe ... />}
    quizComponent={<Quiz ... />}
    scoreComponent={<Score ... />}
    isSaving={isSaving}
    saveError={saveError}
    additionalContent={<AuthModal ... />}
  />
)
```

### FlagQuiz Integration
```tsx
// Before (in FlagQuiz.tsx)
return (
  <>
    <FlagMainMenu />
    <OfflineIndicator />
    <SaveStatusIndicator isSaving={isSaving} saveError={saveError} />
    <Box height={'90dvh'} ...>
      {/* Game content */}
    </Box>
    <Score ... />
    {continueButton}
  </>
)

// After (using QuizLayout)
return (
  <QuizLayout
    menuComponent={<FlagMainMenu />}
    gameAreaComponent={<FlagGameArea ... />}
    scoreComponent={<Score ... />}
    isSaving={isSaving}
    saveError={saveError}
    additionalContent={continueButton}
  />
)
```

## Testing

The component includes comprehensive tests covering:

- Basic rendering with required props
- Optional prop handling
- Loading states
- Status indicator integration
- Accessibility features
- Responsive behavior
- Component ordering
- Custom styling

Run tests with:
```bash
npm test -- QuizLayout.test.tsx --run
```

## Performance Considerations

- **Responsive Queries**: Uses MUI's `useMediaQuery` for efficient responsive behavior
- **Conditional Rendering**: Only renders components when needed
- **Minimal Re-renders**: Props are passed through without transformation
- **CSS-in-JS Optimization**: Uses MUI's sx prop for optimized styling

## Migration Guide

When migrating existing quiz components to use QuizLayout:

1. **Identify Layout Elements**: Find menu, game area, quiz, and score components
2. **Extract Status Logic**: Move `isSaving` and `saveError` state to parent
3. **Wrap in QuizLayout**: Replace manual layout with QuizLayout component
4. **Move Additional Content**: Convert modals/overlays to `additionalContent` prop
5. **Test Functionality**: Ensure all existing functionality works
6. **Update Tests**: Modify tests to work with new layout structure

## Examples

See `QuizLayout.example.tsx` for a complete working example demonstrating all features.