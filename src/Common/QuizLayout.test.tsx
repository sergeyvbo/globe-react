import React from 'react'
import { render, screen } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { vi } from 'vitest'
import { QuizLayout } from './QuizLayout'

// Mock the child components
vi.mock('./Network/OfflineIndicator', () => ({
  OfflineIndicator: ({ className }: { className?: string }) => (
    <div data-testid="offline-indicator" className={className}>Offline Indicator</div>
  )
}))

vi.mock('./SaveStatusIndicator', () => ({
  SaveStatusIndicator: ({ isSaving, saveError }: { isSaving: boolean; saveError: string | null }) => (
    <div data-testid="save-status-indicator">
      {isSaving ? 'Saving...' : saveError || 'Save Status'}
    </div>
  )
}))

const theme = createTheme()

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
)

describe('QuizLayout', () => {
  const defaultProps = {
    menuComponent: <div data-testid="menu">Menu Component</div>,
    gameAreaComponent: <div data-testid="game-area">Game Area</div>
  }

  it('renders basic layout with required components', () => {
    render(
      <TestWrapper>
        <QuizLayout {...defaultProps} />
      </TestWrapper>
    )

    expect(screen.getByTestId('menu')).toBeInTheDocument()
    expect(screen.getByTestId('game-area')).toBeInTheDocument()
    expect(screen.getByTestId('offline-indicator')).toBeInTheDocument()
    expect(screen.getByTestId('save-status-indicator')).toBeInTheDocument()
  })

  it('renders quiz component when provided', () => {
    render(
      <TestWrapper>
        <QuizLayout 
          {...defaultProps}
          quizComponent={<div data-testid="quiz">Quiz Component</div>}
        />
      </TestWrapper>
    )

    expect(screen.getByTestId('quiz')).toBeInTheDocument()
  })

  it('renders score component when provided', () => {
    render(
      <TestWrapper>
        <QuizLayout 
          {...defaultProps}
          scoreComponent={<div data-testid="score">Score Component</div>}
        />
      </TestWrapper>
    )

    expect(screen.getByTestId('score')).toBeInTheDocument()
  })

  it('renders additional content when provided', () => {
    render(
      <TestWrapper>
        <QuizLayout 
          {...defaultProps}
          additionalContent={<div data-testid="additional">Additional Content</div>}
        />
      </TestWrapper>
    )

    expect(screen.getByTestId('additional')).toBeInTheDocument()
  })

  it('shows loading state when isLoading is true', () => {
    render(
      <TestWrapper>
        <QuizLayout 
          {...defaultProps}
          isLoading={true}
        />
      </TestWrapper>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByTestId('menu')).not.toBeInTheDocument()
    expect(screen.queryByTestId('game-area')).not.toBeInTheDocument()
  })

  it('shows custom loading message when provided', () => {
    render(
      <TestWrapper>
        <QuizLayout 
          {...defaultProps}
          isLoading={true}
          loadingMessage="Custom loading message"
        />
      </TestWrapper>
    )

    expect(screen.getByText('Custom loading message')).toBeInTheDocument()
  })

  it('hides offline indicator when showOfflineIndicator is false', () => {
    render(
      <TestWrapper>
        <QuizLayout 
          {...defaultProps}
          showOfflineIndicator={false}
        />
      </TestWrapper>
    )

    expect(screen.queryByTestId('offline-indicator')).not.toBeInTheDocument()
  })

  it('hides save status indicator when showSaveIndicator is false', () => {
    render(
      <TestWrapper>
        <QuizLayout 
          {...defaultProps}
          showSaveIndicator={false}
        />
      </TestWrapper>
    )

    expect(screen.queryByTestId('save-status-indicator')).not.toBeInTheDocument()
  })

  it('passes saving state to SaveStatusIndicator', () => {
    render(
      <TestWrapper>
        <QuizLayout 
          {...defaultProps}
          isSaving={true}
        />
      </TestWrapper>
    )

    expect(screen.getByText('Saving...')).toBeInTheDocument()
  })

  it('passes save error to SaveStatusIndicator', () => {
    render(
      <TestWrapper>
        <QuizLayout 
          {...defaultProps}
          saveError="Save failed"
        />
      </TestWrapper>
    )

    expect(screen.getByText('Save failed')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <TestWrapper>
        <QuizLayout 
          {...defaultProps}
          className="custom-class"
        />
      </TestWrapper>
    )

    expect(container.querySelector('.quiz-layout')).toHaveClass('custom-class')
  })

  it('has proper accessibility attributes', () => {
    render(
      <TestWrapper>
        <QuizLayout 
          {...defaultProps}
          quizComponent={<div data-testid="quiz">Quiz</div>}
          scoreComponent={<div data-testid="score">Score</div>}
        />
      </TestWrapper>
    )

    // Check for semantic HTML roles
    expect(screen.getByRole('banner')).toBeInTheDocument() // header
    expect(screen.getByRole('main')).toBeInTheDocument() // main content
    expect(screen.getByRole('complementary')).toBeInTheDocument() // score aside
    expect(screen.getByLabelText('Game score')).toBeInTheDocument()
  })

  it('has proper loading state accessibility', () => {
    render(
      <TestWrapper>
        <QuizLayout 
          {...defaultProps}
          isLoading={true}
        />
      </TestWrapper>
    )

    const loadingElement = screen.getByRole('status')
    expect(loadingElement).toHaveAttribute('aria-live', 'polite')
  })

  it('renders all components in correct order', () => {
    const { container } = render(
      <TestWrapper>
        <QuizLayout 
          {...defaultProps}
          quizComponent={<div data-testid="quiz">Quiz</div>}
          scoreComponent={<div data-testid="score">Score</div>}
          additionalContent={<div data-testid="additional">Additional</div>}
        />
      </TestWrapper>
    )

    const elements = container.querySelectorAll('[data-testid]')
    const testIds = Array.from(elements).map(el => el.getAttribute('data-testid'))
    
    // Menu should be first, then indicators, then game area, quiz, score
    expect(testIds.indexOf('menu')).toBeLessThan(testIds.indexOf('offline-indicator'))
    expect(testIds.indexOf('offline-indicator')).toBeLessThan(testIds.indexOf('game-area'))
    expect(testIds.indexOf('game-area')).toBeLessThan(testIds.indexOf('quiz'))
    expect(testIds.indexOf('quiz')).toBeLessThan(testIds.indexOf('score'))
  })
})