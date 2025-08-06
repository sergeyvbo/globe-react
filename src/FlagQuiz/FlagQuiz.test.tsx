import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FlagQuiz } from './FlagQuiz'
import { useAuth } from '../Common/Auth/AuthContext'
import { useOfflineDetector } from '../Common/Network/useOfflineDetector'
import { gameProgressService } from '../Common/GameProgress/GameProgressService'

// Mock dependencies
vi.mock('../Common/Auth/AuthContext')
vi.mock('../Common/Network/useOfflineDetector')
vi.mock('../Common/GameProgress/GameProgressService')
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

    await waitFor(() => {
      expect(mockGameProgressService.saveGameProgress).toHaveBeenCalledWith(
        'user123',
        'flags',
        expect.objectContaining({
          gameType: 'flags',
          correctAnswers: 1,
          wrongAnswers: 0
        })
      )
    })
  })

  it('saves progress temporarily for unauthenticated users', async () => {
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

    await waitFor(() => {
      expect(mockGameProgressService.saveTempSession).toHaveBeenCalledWith(
        expect.objectContaining({
          gameType: 'flags',
          correctAnswers: 1,
          wrongAnswers: 0
        })
      )
    })
  })

  it('handles wrong matches correctly', async () => {
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

    await waitFor(() => {
      expect(mockGameProgressService.saveTempSession).toHaveBeenCalledWith(
        expect.objectContaining({
          gameType: 'flags',
          correctAnswers: 0,
          wrongAnswers: 1
        })
      )
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

    // Mock save to fail (simulating offline)
    mockGameProgressService.saveGameProgress = vi.fn().mockRejectedValue(new Error('Network error'))

    render(<FlagQuiz />)
    
    // Make a correct match
    const usFlag = screen.getAllByRole('button').find(button => 
      button.querySelector('img[alt="us"]')
    )
    fireEvent.click(usFlag!)
    
    const usaCountry = screen.getByText('США')
    fireEvent.click(usaCountry)

    await waitFor(() => {
      expect(screen.getByText('Saved offline - will sync when online')).toBeInTheDocument()
    })
  })

  it('syncs offline sessions when coming back online', async () => {
    mockGameProgressService.hasPendingOfflineSessions = vi.fn().mockReturnValue(true)
    
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

    await waitFor(() => {
      expect(mockGameProgressService.syncOfflineSessionsManually).toHaveBeenCalled()
    })
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

    // Mock save to be slow
    mockGameProgressService.saveGameProgress = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    )

    render(<FlagQuiz />)
    
    // Make a match
    const usFlag = screen.getAllByRole('button').find(button => 
      button.querySelector('img[alt="us"]')
    )
    fireEvent.click(usFlag!)
    
    const usaCountry = screen.getByText('США')
    fireEvent.click(usaCountry)

    // Should show saving indicator
    expect(screen.getByText('💾 Saving...')).toBeInTheDocument()

    // Wait for save to complete
    await waitFor(() => {
      expect(screen.queryByText('💾 Saving...')).not.toBeInTheDocument()
    }, { timeout: 2000 })
  })
})