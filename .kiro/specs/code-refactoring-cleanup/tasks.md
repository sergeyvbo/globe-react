# Implementation Plan

- [x] 1. Create shared game progress management hook









  - Extract common auto-save logic from all quiz components into reusable `useGameProgress` hook
  - Implement periodic saving, score-based saving, and offline/online state handling
  - Create comprehensive tests for the hook covering all save scenarios
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Create shared beforeunload handler hook





  - Extract duplicate beforeunload event handling logic into `useBeforeUnload` hook
  - Implement proper cleanup and session saving on page unload
  - Add tests for beforeunload behavior and cleanup
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. Create shared SaveStatusIndicator component





  - Extract duplicate save status indicator UI into reusable component
  - Implement consistent styling and behavior across all quiz types
  - Create component tests and storybook stories
  - _Requirements: 1.1, 1.2, 4.1, 4.2_

- [x] 4. Create shared QuizLayout component





  - Design common layout structure for all quiz components
  - Include slots for menu, game area, score, and status indicators
  - Implement responsive design and accessibility features
  - _Requirements: 1.1, 1.2, 4.1, 4.2_

- [x] 5. Create base quiz state management hook





  - Extract common quiz state logic (scores, disabled state, game session) into `useBaseQuiz` hook
  - Implement standard quiz actions (correct/wrong answer, reset, disable)
  - Add comprehensive tests for base quiz functionality
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 6. Refactor CountryQuiz component using shared hooks and components





  - Replace duplicate logic with shared hooks (`useGameProgress`, `useBeforeUnload`, `useBaseQuiz`)
  - Use shared UI components (`SaveStatusIndicator`, `QuizLayout`)
  - Ensure all existing tests continue to pass
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 7. Refactor FlagQuiz component using shared hooks and components





  - Apply same refactoring pattern as CountryQuiz
  - Replace duplicate auto-save and UI logic with shared components
  - Verify all flag quiz specific functionality remains intact
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 8. Refactor StateQuiz component using shared hooks and components





  - Complete the refactoring pattern for the third quiz component
  - Ensure consistent behavior across all quiz types
  - Validate that all state quiz tests pass
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 9. Optimize and clean up imports across the codebase





  - Replace deprecated MUI Grid component with Grid2
  - Remove unused imports and variables from all files
  - Optimize imports for better tree-shaking (import only needed parts)
  - _Requirements: 3.1, 3.2, 3.3, 5.1, 5.2_

- [x] 10. Enhance TypeScript typing and remove any types









  - Identify and replace any implicit any types with proper typing
  - Create utility types for common patterns
  - Improve type safety in shared hooks and components
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 11. Add React performance optimizations





  - Apply React.memo to components that re-render frequently
  - Add useMemo and useCallback where beneficial for performance
  - Optimize useEffect dependencies to prevent unnecessary re-renders
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 12. Create centralized error handling utilities





  - Build shared error handling logic for save operations
  - Implement consistent error messaging across components
  - Add error boundary enhancements for better UX
  - _Requirements: 2.1, 2.2, 4.1, 4.2_

- [ ] 13. Remove dead code and unused utilities
  - Scan codebase for unused functions, components, and variables
  - Remove commented-out code and obsolete imports
  - Clean up test files and remove duplicate test utilities
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 14. Standardize coding patterns and styles
  - Ensure consistent naming conventions across all files
  - Standardize component structure and hook usage patterns
  - Apply consistent formatting and code organization
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 15. Validate refactoring with comprehensive testing
  - Run all existing tests to ensure no functionality is broken
  - Add integration tests for new shared components and hooks
  - Perform manual testing of all quiz types to verify behavior
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 16. Measure and document performance improvements
  - Compare bundle size before and after refactoring
  - Measure component render performance improvements
  - Document code reduction metrics and maintainability gains
  - _Requirements: 1.4, 5.4, 7.4_