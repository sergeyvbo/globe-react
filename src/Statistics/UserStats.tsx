import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  LinearProgress,
  Divider,
  Chip,
  Stack
} from '@mui/material'
import {
  TrendingUp as TrendingUpIcon,
  Quiz as QuizIcon,
  Flag as FlagIcon,
  Public as PublicIcon,
  LocationOn as LocationIcon,
  EmojiEvents as TrophyIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material'
import { useAuth } from '../Common/Auth'
import { gameStatsApiService, GameStatsApiError } from '../Common/GameProgress/GameStatsApiService'
import { GameStatsResponse, AuthErrorType } from '../Common/types'

interface UserStatsProps {
  className?: string
}

export const UserStats: React.FC<UserStatsProps> = ({ className }) => {
  const { user, isAuthenticated } = useAuth()
  const [gameStats, setGameStats] = useState<GameStatsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadUserStats = async () => {
      if (!isAuthenticated || !user) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        const stats = await gameStatsApiService.getUserStats()
        setGameStats(stats)
      } catch (err) {
        console.error('Failed to load user statistics:', err)
        
        if (err instanceof GameStatsApiError) {
          // Use the RFC 9457 error message directly for better user experience
          const errorMessage = err.message || 'Failed to load statistics. Please try again later.'
          
          switch (err.type) {
            case AuthErrorType.TOKEN_EXPIRED:
              setError('Your session has expired. Please log in again.')
              break
            case AuthErrorType.NETWORK_ERROR:
              setError('Unable to connect to the server. Please check your internet connection and try again.')
              break
            case AuthErrorType.VALIDATION_ERROR:
              // Handle validation errors from RFC 9457
              setError(errorMessage)
              break
            default:
              // Use the RFC 9457 error message for better context
              setError(errorMessage)
          }
        } else {
          setError('An unexpected error occurred. Please try again later.')
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadUserStats()
  }, [isAuthenticated, user])

  // Show authentication required message
  if (!isAuthenticated) {
    return (
      <Box className={className} sx={{ p: 3 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <QuizIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Authentication Required
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please log in to view your game statistics.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    )
  }

  // Show loading state
  if (isLoading) {
    return (
      <Box className={className} sx={{ p: 3 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Loading Statistics...
            </Typography>
          </CardContent>
        </Card>
      </Box>
    )
  }

  // Show error state
  if (error) {
    return (
      <Box className={className} sx={{ p: 3 }}>
        <Card>
          <CardContent>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Try refreshing the page or contact support if the problem persists.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    )
  }

  // Show no data state
  if (!gameStats || gameStats.totalGames === 0) {
    return (
      <Box className={className} sx={{ p: 3 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <QuizIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Game History Yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Start playing quizzes to see your statistics here!
            </Typography>
          </CardContent>
        </Card>
      </Box>
    )
  }

  const getGameTypeIcon = (gameType: string) => {
    switch (gameType) {
      case 'countries':
        return <PublicIcon sx={{ mr: 1, color: 'primary.main' }} />
      case 'flags':
        return <FlagIcon sx={{ mr: 1, color: 'success.main' }} />
      case 'states':
        return <LocationIcon sx={{ mr: 1, color: 'warning.main' }} />
      default:
        return <QuizIcon sx={{ mr: 1, color: 'text.secondary' }} />
    }
  }

  const getGameTypeName = (gameType: string) => {
    switch (gameType) {
      case 'countries':
        return 'Countries Quiz'
      case 'flags':
        return 'Flags Quiz'
      case 'states':
        return 'States Quiz'
      default:
        return gameType.charAt(0).toUpperCase() + gameType.slice(1)
    }
  }

  return (
    <Box className={className} sx={{ p: 3 }}>
      <Card>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <TrendingUpIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h5" component="h2">
              Your Game Statistics
            </Typography>
          </Box>

          {/* Overall Statistics */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }}>
                  {gameStats.totalGames}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Games
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main" sx={{ fontWeight: 'bold' }}>
                  {Math.round(gameStats.averageAccuracy)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Average Accuracy
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main" sx={{ fontWeight: 'bold' }}>
                  {gameStats.bestStreak}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Best Streak
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="info.main" sx={{ fontWeight: 'bold' }}>
                  {gameStats.totalCorrectAnswers}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Correct Answers
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Additional Stats Row */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={6}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="error.main" sx={{ fontWeight: 'bold' }}>
                  {gameStats.totalWrongAnswers}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Wrong Answers
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={6}>
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  <TimeIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    Last Played
                  </Typography>
                </Box>
                <Typography variant="body1">
                  {gameStats.lastPlayedAt 
                    ? new Date(gameStats.lastPlayedAt).toLocaleDateString()
                    : 'Never'
                  }
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Game Type Statistics */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TrophyIcon sx={{ mr: 2, color: 'warning.main' }} />
              <Typography variant="h6" component="h3">
                Statistics by Game Type
              </Typography>
            </Box>

            <Stack spacing={3}>
              {Object.entries(gameStats.gameTypeStats)
                .filter(([_, stats]) => stats.games > 0)
                .map(([gameType, stats]) => (
                  <Box key={gameType}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      {getGameTypeIcon(gameType)}
                      <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                        {getGameTypeName(gameType)}
                      </Typography>
                      <Chip 
                        label={`${stats.games} game${stats.games !== 1 ? 's' : ''}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                    
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">
                          Accuracy
                        </Typography>
                        <Typography variant="h6" color="success.main">
                          {Math.round(stats.accuracy)}%
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">
                          Best Streak
                        </Typography>
                        <Typography variant="h6" color="warning.main">
                          {stats.bestStreak}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">
                          Correct/Wrong
                        </Typography>
                        <Typography variant="h6" color="info.main">
                          {stats.correctAnswers}/{stats.wrongAnswers}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ minWidth: 80 }}>
                        Progress:
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={stats.accuracy}
                        sx={{ 
                          flexGrow: 1, 
                          mx: 2, 
                          height: 8, 
                          borderRadius: 4,
                          backgroundColor: 'grey.300'
                        }}
                        color={stats.accuracy >= 80 ? 'success' : stats.accuracy >= 60 ? 'warning' : 'error'}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {Math.round(stats.accuracy)}%
                      </Typography>
                    </Box>
                  </Box>
                ))}
            </Stack>
          </Box>

          {/* Show message if no game type stats */}
          {Object.values(gameStats.gameTypeStats).every(stats => stats.games === 0) && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="body2" color="text.secondary">
                No detailed game type statistics available yet.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

export default UserStats