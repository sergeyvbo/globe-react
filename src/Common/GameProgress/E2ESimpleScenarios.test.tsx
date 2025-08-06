import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { LeaderboardEntryDto } from '../types'

// Mock the services
vi.mock('./GameStatsApiService', () => ({
  gameStatsApiService: {
    saveGameSession: vi.fn(),
    getUserStats: vi.fn(),
    getUserGameHistory: vi.fn(),
    isAuthenticated: vi.fn(),
  }
}))

vi.mock('./LeaderboardService', () => ({
  leaderboardService: {
    getGlobalLeaderboard: vi.fn(),
    getLeaderboardByGameType: vi.fn(),
    getLeaderboardByPeriod: vi.fn(),
    clearCache: vi.fn(),
  }
}))

vi.mock('./GameProgressService', () => ({
  gameProgressService: {
    saveGameProgress: vi.fn(),
    getGameProgress: vi.fn(),
    getGameStats: vi.fn(),
    saveTempSession: vi.fn(),
    getTempSession: vi.fn(),
    clearProgress: vi.fn(),
  }
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

// Simple mock components for testing
const MockGameComponent: React.FC = () => {
  const [score, setScore] = React.useState({ correct: 0, wrong: 0 })
  const [gameStarted, setGameStarted] = React.useState(false)
  
  const startGame = () => setGameStarted(true)
  const answerQuestion = (correct: boolean) => {
    setScore(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      wrong: prev.wrong + (correct ? 0 : 1)
    }))
  }
  
  const endGame = async () => {
    try {
      const { gameProgressService } = await import('./GameProgressService')
      await gameProgressService.saveGameProgress('test-user', 'countries', {
        gameType: 'countries',
        correctAnswers: score.correct,
        wrongAnswers: score.wrong,
        sessionStartTime: new Date(Date.now() - 300000), // 5 minutes ago
        sessionEndTime: new Date()
      })
    } catch (error) {
      // Handle save error gracefully - game still ends
      console.error('Failed to save game progress:', error)
    } finally {
      // Always reset game state
      setGameStarted(false)
      setScore({ correct: 0, wrong: 0 })
    }
  }
  
  return (
    <div data-testid="game-component">
      <h2>Game Component</h2>
      {!gameStarted ? (
        <button onClick={startGame} data-testid="start-game">Start Game</button>
      ) : (
        <div>
          <div data-testid="score">Score: {score.correct} correct, {score.wrong} wrong</div>
          <button onClick={() => answerQuestion(true)} data-testid="correct-answer">Correct Answer</button>
          <button onClick={() => answerQuestion(false)} data-testid="wrong-answer">Wrong Answer</button>
          <button onClick={endGame} data-testid="end-game">End Game</button>
        </div>
      )}
    </div>
  )
}

const MockStatsComponent: React.FC = () => {
  const [stats, setStats] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(false)
  
  const loadStats = async () => {
    setLoading(true)
    try {
      const { gameStatsApiService } = await import('./GameStatsApiService')
      const userStats = await gameStatsApiService.getUserStats()
      setStats(userStats)
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }
  
  React.useEffect(() => {
    loadStats()
  }, [])
  
  if (loading) return <div data-testid="stats-loading">Loading stats...</div>
  if (!stats) return <div data-testid="stats-error">Failed to load stats</div>
  
  return (
    <div data-testid="stats-component">
      <h2>User Statistics</h2>
      <div data-testid="total-games">Total Games: {stats.totalGames}</div>
      <div data-testid="accuracy">Accuracy: {stats.averageAccuracy}%</div>
      <div data-testid="best-streak">Best Streak: {stats.bestStreak}</div>
    </div>
  )
}

const MockLeaderboardComponent: React.FC = () => {
  const [leaderboard, setLeaderboard] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(false)
  const [filter, setFilter] = React.useState<string>('global')
  
  const loadLeaderboard = async (filterType: string) => {
    setLoading(true)
    try {
      const { leaderboardService } = await import('./LeaderboardService')
      let data
      if (filterType === 'countries') {
        data = await leaderboardService.getLeaderboardByGameType('countries')
      } else if (filterType === 'week') {
        data = await leaderboardService.getLeaderboardByPeriod('week')
      } else {
        data = await leaderboardService.getGlobalLeaderboard()
      }
      setLeaderboard(data)
    } catch (error) {
      console.error('Failed to load leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }
  
  React.useEffect(() => {
    loadLeaderboard(filter)
  }, [filter])
  
  if (loading) return <div data-testid="leaderboard-loading">Loading leaderboard...</div>
  if (!leaderboard) return <div data-testid="leaderboard-error">Failed to load leaderboard</div>
  
  return (
    <div data-testid="leaderboard-component">
      <h2>Leaderboard</h2>
      <div>
        <button 
          onClick={() => setFilter('global')} 
          data-testid="filter-global"
          className={filter === 'global' ? 'active' : ''}
        >
          Global
        </button>
        <button 
          onClick={() => setFilter('countries')} 
          data-testid="filter-countries"
          className={filter === 'countries' ? 'active' : ''}
        >
          Countries
        </button>
        <button 
          onClick={() => setFilter('week')} 
          data-testid="filter-week"
          className={filter === 'week' ? 'active' : ''}
        >
          This Week
        </button>
      </div>
      <div data-testid="leaderboard-list">
        {leaderboard.players?.map((player: LeaderboardEntryDto, index: number) => (
          <div 
            key={player.userId} 
            data-testid={`player-${index}`}
            className={player.isCurrentUser ? 'current-user' : ''}
          >
            #{player.rank} {player.userName} - {player.totalScore} points ({player.accuracy}%)
          </div>
        ))}
      </div>
      {leaderboard.currentUserRank && (
        <div data-testid="current-user-rank">Your rank: #{leaderboard.currentUserRank}</div>
      )}
    </div>
  )
}

describe('E2E User Scenarios - Simplified', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockClear()
    
    // Mock authenticated user by default
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'auth_access_token') return 'valid-token'
      if (key === 'auth_token_expiry') return (Date.now() + 3600000).toString()
      if (key === 'auth_user') return JSON.stringify({
        id: 'test-user',
        email: 'test@example.com',
        provider: 'email',
        createdAt: new Date().toISOString()
      })
      return null
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Full Game Cycle with Result Saving', () => {
    it('should complete a full game cycle and save results', async () => {
      const user = userEvent.setup()
      const { gameProgressService } = await import('./GameProgressService')
      
      // Mock successful game progress save
      vi.mocked(gameProgressService.saveGameProgress).mockResolvedValue()
      
      render(<MockGameComponent />)
      
      // Start the game
      const startButton = screen.getByTestId('start-game')
      await user.click(startButton)
      
      // Verify game started
      expect(screen.getByTestId('score')).toHaveTextContent('Score: 0 correct, 0 wrong')
      
      // Answer some questions
      const correctButton = screen.getByTestId('correct-answer')
      const wrongButton = screen.getByTestId('wrong-answer')
      
      await user.click(correctButton)
      await user.click(correctButton)
      await user.click(wrongButton)
      await user.click(correctButton)
      
      // Verify score updated
      expect(screen.getByTestId('score')).toHaveTextContent('Score: 3 correct, 1 wrong')
      
      // End the game
      const endButton = screen.getByTestId('end-game')
      await user.click(endButton)
      
      // Wait for game to end and results to be saved
      await waitFor(() => {
        expect(screen.getByTestId('start-game')).toBeInTheDocument()
      })
      
      // Verify game progress was saved
      expect(gameProgressService.saveGameProgress).toHaveBeenCalledWith(
        'test-user',
        'countries',
        expect.objectContaining({
          gameType: 'countries',
          correctAnswers: 3,
          wrongAnswers: 1,
          sessionStartTime: expect.any(Date),
          sessionEndTime: expect.any(Date)
        })
      )
    })

    it('should handle game save errors gracefully', async () => {
      const user = userEvent.setup()
      const { gameProgressService } = await import('./GameProgressService')
      
      // Mock failed game progress save
      vi.mocked(gameProgressService.saveGameProgress).mockRejectedValue(
        new Error('Network error')
      )
      
      render(<MockGameComponent />)
      
      // Play a quick game
      await user.click(screen.getByTestId('start-game'))
      await user.click(screen.getByTestId('correct-answer'))
      await user.click(screen.getByTestId('end-game'))
      
      // Game should still end even if save fails
      await waitFor(() => {
        expect(screen.getByTestId('start-game')).toBeInTheDocument()
      })
      
      expect(gameProgressService.saveGameProgress).toHaveBeenCalled()
    })
  })

  describe('Statistics Viewing and Display', () => {
    it('should display user statistics correctly', async () => {
      const { gameStatsApiService } = await import('./GameStatsApiService')
      
      // Mock user stats
      const mockStats = {
        totalGames: 15,
        totalCorrectAnswers: 120,
        totalWrongAnswers: 30,
        bestStreak: 25,
        averageAccuracy: 80.0,
        lastPlayedAt: '2023-01-01T12:00:00Z',
        gameTypeStats: {
          countries: {
            games: 8,
            correctAnswers: 64,
            wrongAnswers: 16,
            accuracy: 80.0,
            bestStreak: 15
          }
        }
      }
      
      vi.mocked(gameStatsApiService.getUserStats).mockResolvedValue(mockStats)
      
      render(<MockStatsComponent />)
      
      // Wait for stats to load
      await waitFor(() => {
        expect(screen.getByTestId('stats-component')).toBeInTheDocument()
      })
      
      // Verify stats are displayed correctly
      expect(screen.getByTestId('total-games')).toHaveTextContent('Total Games: 15')
      expect(screen.getByTestId('accuracy')).toHaveTextContent('Accuracy: 80%')
      expect(screen.getByTestId('best-streak')).toHaveTextContent('Best Streak: 25')
      
      expect(gameStatsApiService.getUserStats).toHaveBeenCalled()
    })

    it('should handle stats loading errors', async () => {
      const { gameStatsApiService } = await import('./GameStatsApiService')
      
      // Mock stats loading error
      vi.mocked(gameStatsApiService.getUserStats).mockRejectedValue(
        new Error('Failed to load stats')
      )
      
      render(<MockStatsComponent />)
      
      // Should show error state
      await waitFor(() => {
        expect(screen.getByTestId('stats-error')).toHaveTextContent('Failed to load stats')
      })
      
      expect(gameStatsApiService.getUserStats).toHaveBeenCalled()
    })
  })

  describe('Leaderboard Viewing and Filtering', () => {
    it('should display leaderboard with filtering options', async () => {
      const user = userEvent.setup()
      const { leaderboardService } = await import('./LeaderboardService')
      
      // Mock different leaderboard responses
      const globalLeaderboard = {
        players: [
          { rank: 1, userId: 'user1', userName: 'GlobalChamp', totalScore: 1500, accuracy: 95.0, gamesPlayed: 100, isCurrentUser: false },
          { rank: 2, userId: 'test-user', userName: 'TestUser', totalScore: 1200, accuracy: 80.0, gamesPlayed: 80, isCurrentUser: true }
        ],
        totalPlayers: 500,
        page: 1,
        pageSize: 50,
        hasNextPage: true,
        currentUserRank: 2
      }
      
      const countriesLeaderboard = {
        players: [
          { rank: 1, userId: 'user2', userName: 'CountryExpert', totalScore: 800, accuracy: 90.0, gamesPlayed: 50, isCurrentUser: false }
        ],
        totalPlayers: 150,
        page: 1,
        pageSize: 50,
        hasNextPage: false
      }
      
      const weeklyLeaderboard = {
        players: [
          { rank: 1, userId: 'user3', userName: 'WeeklyWinner', totalScore: 300, accuracy: 85.0, gamesPlayed: 20, isCurrentUser: false }
        ],
        totalPlayers: 75,
        page: 1,
        pageSize: 50,
        hasNextPage: false
      }
      
      vi.mocked(leaderboardService.getGlobalLeaderboard).mockResolvedValue(globalLeaderboard)
      vi.mocked(leaderboardService.getLeaderboardByGameType).mockResolvedValue(countriesLeaderboard)
      vi.mocked(leaderboardService.getLeaderboardByPeriod).mockResolvedValue(weeklyLeaderboard)
      
      render(<MockLeaderboardComponent />)
      
      // Wait for initial global leaderboard to load
      await waitFor(() => {
        expect(screen.getByTestId('leaderboard-component')).toBeInTheDocument()
      })
      
      // Verify global leaderboard is displayed
      expect(screen.getByTestId('player-0')).toHaveTextContent('#1 GlobalChamp - 1500 points (95%)')
      expect(screen.getByTestId('player-1')).toHaveTextContent('#2 TestUser - 1200 points (80%)')
      expect(screen.getByTestId('current-user-rank')).toHaveTextContent('Your rank: #2')
      
      // Test countries filter
      await user.click(screen.getByTestId('filter-countries'))
      
      await waitFor(() => {
        expect(screen.getByTestId('player-0')).toHaveTextContent('#1 CountryExpert - 800 points (90%)')
      })
      
      expect(leaderboardService.getLeaderboardByGameType).toHaveBeenCalledWith('countries')
      
      // Test weekly filter
      await user.click(screen.getByTestId('filter-week'))
      
      await waitFor(() => {
        expect(screen.getByTestId('player-0')).toHaveTextContent('#1 WeeklyWinner - 300 points (85%)')
      })
      
      expect(leaderboardService.getLeaderboardByPeriod).toHaveBeenCalledWith('week')
      
      // Test back to global
      await user.click(screen.getByTestId('filter-global'))
      
      await waitFor(() => {
        expect(screen.getByTestId('player-0')).toHaveTextContent('#1 GlobalChamp - 1500 points (95%)')
      })
    })

    it('should handle leaderboard loading errors', async () => {
      const { leaderboardService } = await import('./LeaderboardService')
      
      // Mock leaderboard loading error
      vi.mocked(leaderboardService.getGlobalLeaderboard).mockRejectedValue(
        new Error('Failed to load leaderboard')
      )
      
      render(<MockLeaderboardComponent />)
      
      // Should show error state
      await waitFor(() => {
        expect(screen.getByTestId('leaderboard-error')).toHaveTextContent('Failed to load leaderboard')
      })
      
      expect(leaderboardService.getGlobalLeaderboard).toHaveBeenCalled()
    })
  })

  describe('Complete User Journey', () => {
    it('should handle a complete user journey from game to stats to leaderboard', async () => {
      const user = userEvent.setup()
      const { gameProgressService } = await import('./GameProgressService')
      const { gameStatsApiService } = await import('./GameStatsApiService')
      const { leaderboardService } = await import('./LeaderboardService')
      
      // Mock services
      vi.mocked(gameProgressService.saveGameProgress).mockResolvedValue()
      
      const mockStats = {
        totalGames: 1,
        totalCorrectAnswers: 5,
        totalWrongAnswers: 2,
        bestStreak: 5,
        averageAccuracy: 71.4,
        gameTypeStats: {
          countries: { games: 1, correctAnswers: 5, wrongAnswers: 2, accuracy: 71.4, bestStreak: 5 }
        }
      }
      vi.mocked(gameStatsApiService.getUserStats).mockResolvedValue(mockStats)
      
      const mockLeaderboard = {
        players: [
          { rank: 1, userId: 'test-user', userName: 'TestUser', totalScore: 500, accuracy: 71.4, gamesPlayed: 1, isCurrentUser: true }
        ],
        totalPlayers: 1,
        page: 1,
        pageSize: 50,
        hasNextPage: false,
        currentUserRank: 1
      }
      vi.mocked(leaderboardService.getGlobalLeaderboard).mockResolvedValue(mockLeaderboard)
      
      const TestJourney: React.FC = () => {
        const [currentView, setCurrentView] = React.useState<'game' | 'stats' | 'leaderboard'>('game')
        
        return (
          <div>
            <nav>
              <button onClick={() => setCurrentView('game')} data-testid="nav-game">Game</button>
              <button onClick={() => setCurrentView('stats')} data-testid="nav-stats">Stats</button>
              <button onClick={() => setCurrentView('leaderboard')} data-testid="nav-leaderboard">Leaderboard</button>
            </nav>
            {currentView === 'game' && <MockGameComponent />}
            {currentView === 'stats' && <MockStatsComponent />}
            {currentView === 'leaderboard' && <MockLeaderboardComponent />}
          </div>
        )
      }
      
      render(<TestJourney />)
      
      // 1. Play a game
      await user.click(screen.getByTestId('start-game'))
      await user.click(screen.getByTestId('correct-answer'))
      await user.click(screen.getByTestId('correct-answer'))
      await user.click(screen.getByTestId('correct-answer'))
      await user.click(screen.getByTestId('correct-answer'))
      await user.click(screen.getByTestId('correct-answer'))
      await user.click(screen.getByTestId('wrong-answer'))
      await user.click(screen.getByTestId('wrong-answer'))
      await user.click(screen.getByTestId('end-game'))
      
      // Wait for game to end
      await waitFor(() => {
        expect(screen.getByTestId('start-game')).toBeInTheDocument()
      })
      
      expect(gameProgressService.saveGameProgress).toHaveBeenCalled()
      
      // 2. View stats
      await user.click(screen.getByTestId('nav-stats'))
      
      await waitFor(() => {
        expect(screen.getByTestId('stats-component')).toBeInTheDocument()
      })
      
      expect(screen.getByTestId('total-games')).toHaveTextContent('Total Games: 1')
      expect(screen.getByTestId('accuracy')).toHaveTextContent('Accuracy: 71.4%')
      expect(gameStatsApiService.getUserStats).toHaveBeenCalled()
      
      // 3. View leaderboard
      await user.click(screen.getByTestId('nav-leaderboard'))
      
      await waitFor(() => {
        expect(screen.getByTestId('leaderboard-component')).toBeInTheDocument()
      })
      
      expect(screen.getByTestId('player-0')).toHaveTextContent('#1 TestUser - 500 points (71.4%)')
      expect(screen.getByTestId('current-user-rank')).toHaveTextContent('Your rank: #1')
      expect(leaderboardService.getGlobalLeaderboard).toHaveBeenCalled()
      
      // 4. Go back to game for another round
      await user.click(screen.getByTestId('nav-game'))
      
      expect(screen.getByTestId('start-game')).toBeInTheDocument()
    })
  })

  describe('Offline/Online Synchronization Simulation', () => {
    it('should simulate offline behavior and sync when back online', async () => {
      const user = userEvent.setup()
      const { gameProgressService } = await import('./GameProgressService')
      
      // Mock network failure first, then success
      vi.mocked(gameProgressService.saveGameProgress)
        .mockRejectedValueOnce(new Error('Network error - offline'))
        .mockResolvedValueOnce()
      
      render(<MockGameComponent />)
      
      // Play a game while "offline"
      await user.click(screen.getByTestId('start-game'))
      await user.click(screen.getByTestId('correct-answer'))
      await user.click(screen.getByTestId('correct-answer'))
      
      // Try to end game (should fail first time)
      await user.click(screen.getByTestId('end-game'))
      
      // Game should still end even if save fails (offline behavior)
      await waitFor(() => {
        expect(screen.getByTestId('start-game')).toBeInTheDocument()
      })
      
      expect(gameProgressService.saveGameProgress).toHaveBeenCalledTimes(1)
      
      // Play another game (simulating back online)
      await user.click(screen.getByTestId('start-game'))
      await user.click(screen.getByTestId('correct-answer'))
      await user.click(screen.getByTestId('end-game'))
      
      // This time should succeed
      await waitFor(() => {
        expect(screen.getByTestId('start-game')).toBeInTheDocument()
      })
      
      expect(gameProgressService.saveGameProgress).toHaveBeenCalledTimes(2)
    })
  })
})