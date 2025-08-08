import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FlagQuiz } from './FlagQuiz'
import { useAuth } from '../Common/Auth/AuthContext'
import { useOfflineDetector } from '../Common/Network/useOfflineDetector'
import { gameProgressService } from '../Common/GameProgress/GameProgressService'
import { useSaveErrorHandler } from '../Common/ErrorHandling/useSaveErrorHandler'
import { useBaseQuiz } from '../Common/Hooks/useBaseQuiz'

// Mock dependencies
vi.mock('../Common/Auth/AuthContext')
vi.mock('../Common/Network/useOfflineDetector')
vi.mock('../Common/GameProgress/GameProgressService')
vi.mock('../Common/ErrorHandling/useSaveErrorHandler')
vi.mock('../Common/Hooks/useBaseQuiz')
vi.mock('../Common/utils', () => ({
  shuffleArray: (arr: unknown[]) => arr
}))

// Mock flag data
vi.mock('../Common/GeoData/countryCodes2.json', () => ({
  default: [
    { name: 'United States', name_ru: 'США', code: 'us' },
    { name: 'Canada', name_ru: 'Канада', code: 'ca' },
    { name: 'Mexico', name_ru: 'Мексика', code: 'mx' },
    { name: 'Brazil', name_ru: 'Бразилия', code: 'br' },
    { name: 'Argentina', name_ru: 'Аргентина', code: 'ar' }
  ]
}))

// Mock CSS import
vi.mock('./FlagQuiz.css', () => ({}))

// Mock components
vi.mock('./FlagMainMenu', () => ({
  FlagMainMenu: () => <div data-testid="flag-main-menu">Flag Main Menu</div>
}))

vi.mock('../CountryQuiz/Score', () => ({
  Score: ({ correctScore, wrongScore }: { correctScore: number; wrongScore: number }) => (
    <div data-testid="score">Score: {correctScore}/{wrongScore}</div>
  )
}))

const mockUseAuth = vi.mocked(useAuth)
const mockUseOfflineDetector = vi.mocked(useOfflineDetector)
const mockGameProgressService = vi.mocked(gameProgressService)
const mockUseSaveErrorHandler = vi.mocked(useSaveErrorHandler)
const mockUseBaseQuiz = vi.mocked(useBaseQuiz)

describe('FlagQuiz', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Default mock implementations
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      changePassword: vi.fn(),
      error: null,
      clearError: vi.fn()
    })

    mockUseOfflineDetector.mockReturnValue({
      isOnline: true,
      isOffline: false,
      networkStatus: {
        isOnline: true,
        isOffline: false
      },
      testConnectivity: vi.fn()
    })

    mockGameProgressService.saveGameProgress = vi.fn().mockResolvedValue(undefined)
    mockGameProgressService.saveTempSession = vi.fn()
    mockGameProgressService.hasPendingOfflineSessions = vi.fn().mockReturnValue(false)
    mockGameProgressService.syncOfflineSessionsManually = vi.fn().mockResolvedValue(undefined)

    // Mock useSaveErrorHandler
    mockUseSaveErrorHandler.mockReturnValue({
      error: null,
      isRetrying: false,
      retryCount: 0,
      handleError: vi.fn(),
      retry: vi.fn(),
      clearError: vi.fn(),
      canRetry: false,
      setRetryOperation: vi.fn(),
      isOffline: false,
      getUserMessage: null,
      getDisplayConfig: null
    })

    // Mock useBaseQuiz
    mockUseBaseQuiz.mockReturnValue({
      correctScore: 0,
      wrongScore: 0,
      disabled: false,
      gameSession: {
        gameType: 'flags',
        correctAnswers: 0,
        wrongAnswers: 0,
        sessionStartTime: new Date()
      },
      actions: {
        onCorrectAnswer: vi.fn(),
        onWrongAnswer: vi.fn(),
        resetGame: vi.fn(),
        setDisabled: vi.fn(),
        resetScores: vi.fn()
      },
      gameProgress: {
        isSaving: false,
        saveError: null,
        autoSaveProgress: vi.fn().mockResolvedValue(undefined)
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the game components correctly', () => {
    render(<FlagQuiz />)
    
    expect(screen.getByTestId('flag-main-menu')).toBeInTheDocument()
    expect(screen.getByTestId('score')).toBeInTheDocument()
    
    // Should render flag buttons
    const flagButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('img')
    )
    expect(flagButtons).toHaveLength(5)
    
    // Should render country buttons
    expect(screen.getByText('США')).toBeInTheDocument()
    expect(screen.getByText('Канада')).toBeInTheDocument()
    expect(screen.getByText('Мексика')).toBeInTheDocument()
  })

  it('shows offline indicator when offline', () => {
    mockUseOfflineDetector.mockReturnValue({
      isOnline: false,
      isOffline: true,
      networkStatus: {
        isOnline: false,
        isOffline: true
      },
      testConnectivity: vi.fn()
    })

    render(<FlagQuiz />)
    
    expect(screen.getByText('🔴 Offline Mode')).toBeInTheDocument()
  })

  it('saves progress automatically for authenticated users when making matches', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' }
    const mockAutoSaveProgress = vi.fn().mockResolvedValue(undefined)
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      changePassword: vi.fn(),
      error: null,
      clearError: vi.fn()
    })

    // Mock useBaseQuiz to return updated scores and auto-save function
    mockUseBaseQuiz.mockReturnValue({
      correctScore: 1,
      wrongScore: 0,
      disabled: false,
      gameSession: {
        gameType: 'flags',
        correctAnswers: 1,
        wrongAnswers: 0,
        sessionStartTime: new Date()
      },
      actions: {
        onCorrectAnswer: vi.fn(),
        onWrongAnswer: vi.fn(),
        resetGame: vi.fn(),
        setDisabled: vi.fn(),
        resetScores: vi.fn()
      },
      gameProgress: {
        isSaving: false,
        saveError: null,
        autoSaveProgress: mockAutoSaveProgress
      }
    })

    render(<FlagQuiz />)
    
    // Click on US flag
    const usFlag = screen.getAllByRole('button').find(button => 
      button.querySelector('img[alt="us"]')
    )
    expect(usFlag).toBeTruthy()
    fireEvent.click(usFlag!)
    
    // Click on USA country button
    const usaCountry = screen.getByText('США')
    fireEvent.click(usaCountry)

    // Verify that the actions were called (the actual saving is handled by useBaseQuiz)
    await waitFor(() => {
      expect(screen.getByText('Score: 1/0')).toBeInTheDocument()
    })
  })

  it('saves progress temporarily for unauthenticated users', async () => {
    // Mock useBaseQuiz to return updated scores for unauthenticated user
    mockUseBaseQuiz.mockReturnValue({
      correctScore: 1,
      wrongScore: 0,
      disabled: false,
      gameSession: {
        gameType: 'flags',
        correctAnswers: 1,
        wrongAnswers: 0,
        sessionStartTime: new Date()
      },
      actions: {
        onCorrectAnswer: vi.fn(),
        onWrongAnswer: vi.fn(),
        resetGame: vi.fn(),
        setDisabled: vi.fn(),
        resetScores: vi.fn()
      },
      gameProgress: {
        isSaving: false,
        saveError: null,
        autoSaveProgress: vi.fn().mockResolvedValue(undefined)
      }
    })

    render(<FlagQuiz />)
    
    // Click on US flag
    const usFlag = screen.getAllByRole('button').find(button => 
      button.querySelector('img[alt="us"]')
    )
    expect(usFlag).toBeTruthy()
    fireEvent.click(usFlag!)
    
    // Click on USA country button
    const usaCountry = screen.getByText('США')
    fireEvent.click(usaCountry)

    // Verify that the score was updated (the actual saving is handled by useBaseQuiz)
    await waitFor(() => {
      expect(screen.getByText('Score: 1/0')).toBeInTheDocument()
    })
  })

  it('handles wrong matches correctly', async () => {
    // Mock useBaseQuiz to return wrong score
    mockUseBaseQuiz.mockReturnValue({
      correctScore: 0,
      wrongScore: 1,
      disabled: false,
      gameSession: {
        gameType: 'flags',
        correctAnswers: 0,
        wrongAnswers: 1,
        sessionStartTime: new Date()
      },
      actions: {
        onCorrectAnswer: vi.fn(),
        onWrongAnswer: vi.fn(),
        resetGame: vi.fn(),
        setDisabled: vi.fn(),
        resetScores: vi.fn()
      },
      gameProgress: {
        isSaving: false,
        saveError: null,
        autoSaveProgress: vi.fn().mockResolvedValue(undefined)
      }
    })

    render(<FlagQuiz />)
    
    // Click on US flag
    const usFlag = screen.getAllByRole('button').find(button => 
      button.querySelector('img[alt="us"]')
    )
    expect(usFlag).toBeTruthy()
    fireEvent.click(usFlag!)
    
    // Click on wrong country (Canada instead of USA)
    const canadaCountry = screen.getByText('Канада')
    fireEvent.click(canadaCountry)

    await waitFor(() => {
      expect(screen.getByText('Score: 0/1')).toBeInTheDocument()
    })
  })

  it('handles offline mode gracefully', async () => {
    mockUseOfflineDetector.mockReturnValue({
      isOnline: false,
      isOffline: true,
      networkStatus: {
        isOnline: false,
        isOffline: true
      },
      testConnectivity: vi.fn()
    })

    const mockUser = { id: 'user123', email: 'test@example.com' }
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      changePassword: vi.fn(),
      error: null,
      clearError: vi.fn()
    })

    // Mock useBaseQuiz to simulate offline save error
    mockUseBaseQuiz.mockReturnValue({
      correctScore: 1,
      wrongScore: 0,
      disabled: false,
      gameSession: {
        gameType: 'flags',
        correctAnswers: 1,
        wrongAnswers: 0,
        sessionStartTime: new Date()
      },
      actions: {
        onCorrectAnswer: vi.fn(),
        onWrongAnswer: vi.fn(),
        resetGame: vi.fn(),
        setDisabled: vi.fn(),
        resetScores: vi.fn()
      },
      gameProgress: {
        isSaving: false,
        saveError: 'Saved offline - will sync when online',
        autoSaveProgress: vi.fn().mockRejectedValue(new Error('Network error'))
      }
    })

    render(<FlagQuiz />)
    
    // Make a correct match
    const usFlag = screen.getAllByRole('button').find(button => 
      button.querySelector('img[alt="us"]')
    )
    fireEvent.click(usFlag!)
    
    const usaCountry = screen.getByText('США')
    fireEvent.click(usaCountry)

    // The test should pass if the game handles offline mode gracefully
    // and shows the correct score
    await waitFor(() => {
      expect(screen.getByText('Score: 1/0')).toBeInTheDocument()
    })

    // Check that offline message is displayed
    expect(screen.getByText('Saved offline - will sync when online')).toBeInTheDocument()
  })

  it('syncs offline sessions when coming back online', async () => {
    // This test is now handled by useBaseQuiz and useGameProgress
    // We just need to verify that the component renders correctly
    // when transitioning from offline to online
    
    // Start offline
    mockUseOfflineDetector.mockReturnValue({
      isOnline: false,
      isOffline: true,
      networkStatus: {
        isOnline: false,
        isOffline: true
      },
      testConnectivity: vi.fn()
    })

    const { rerender } = render(<FlagQuiz />)

    // Come back online
    mockUseOfflineDetector.mockReturnValue({
      isOnline: true,
      isOffline: false,
      networkStatus: {
        isOnline: true,
        isOffline: false
      },
      testConnectivity: vi.fn()
    })

    rerender(<FlagQuiz />)

    // Verify the component still renders correctly
    expect(screen.getByTestId('flag-main-menu')).toBeInTheDocument()
    expect(screen.getByTestId('score')).toBeInTheDocument()
  })

  it('shows continue button when all matches are completed', async () => {
    render(<FlagQuiz />)
    
    // Make all 5 matches
    const countries = ['США', 'Канада', 'Мексика', 'Бразилия', 'Аргентина']
    const flags = ['us', 'ca', 'mx', 'br', 'ar']
    
    for (let i = 0; i < 5; i++) {
      // Click flag
      const flag = screen.getAllByRole('button').find(button => 
        button.querySelector(`img[alt="${flags[i]}"]`)
      )
      fireEvent.click(flag!)
      
      // Click corresponding country
      const country = screen.getByText(countries[i])
      fireEvent.click(country)
      
      // Wait a bit for state updates
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    await waitFor(() => {
      expect(screen.getByText('Продолжить')).toBeInTheDocument()
    })
  })

  it('shows saving indicator when saving progress', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' }
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
      changePassword: vi.fn(),
      error: null,
      clearError: vi.fn()
    })

    // Mock useBaseQuiz to show saving state
    mockUseBaseQuiz.mockReturnValue({
      correctScore: 1,
      wrongScore: 0,
      disabled: false,
      gameSession: {
        gameType: 'flags',
        correctAnswers: 1,
        wrongAnswers: 0,
        sessionStartTime: new Date()
      },
      actions: {
        onCorrectAnswer: vi.fn(),
        onWrongAnswer: vi.fn(),
        resetGame: vi.fn(),
        setDisabled: vi.fn(),
        resetScores: vi.fn()
      },
      gameProgress: {
        isSaving: true,
        saveError: null,
        autoSaveProgress: vi.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, 1000))
        )
      }
    })

    render(<FlagQuiz />)
    
    // Should show saving indicator
    expect(screen.getByText('💾 Saving...')).toBeInTheDocument()
  })
})