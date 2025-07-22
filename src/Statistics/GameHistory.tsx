import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  Stack,
  Tooltip
} from '@mui/material'
import {
  History as HistoryIcon,
  Quiz as QuizIcon,
  Flag as FlagIcon,
  Public as PublicIcon,
  LocationOn as LocationIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon
} from '@mui/icons-material'
import { useAuth } from '../Common/Auth'
import { gameStatsApiService, GameStatsApiError } from '../Common/GameProgress/GameStatsApiService'
import { GameHistoryResponse, GameSessionDto, AuthErrorType } from '../Common/types'

interface GameHistoryProps {
  className?: string
  pageSize?: number
}

type GameTypeFilter = 'all' | 'countries' | 'flags' | 'states'

export const GameHistory: React.FC<GameHistoryProps> = ({ 
  className, 
  pageSize = 10 
}) => {
  const { user, isAuthenticated } = useAuth()
  const [gameHistory, setGameHistory] = useState<GameHistoryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [gameTypeFilter, setGameTypeFilter] = useState<GameTypeFilter>('all')

  const loadGameHistory = useCallback(async (page: number = 1, gameType: GameTypeFilter = 'all') => {
    if (!isAuthenticated || !user) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      // For now, we'll get all history and filter client-side
      // In a real implementation, the API should support filtering
      const history = await gameStatsApiService.getUserGameHistory(page, pageSize)
      
      // Client-side filtering by game type
      if (gameType !== 'all') {
        const filteredSessions = history.sessions.filter(session => 
          session.gameType.toLowerCase() === gameType
        )
        setGameHistory({
          ...history,
          sessions: filteredSessions,
          totalCount: filteredSessions.length
        })
      } else {
        setGameHistory(history)
      }
    } catch (err) {
      console.error('Failed to load game history:', err)
      
      if (err instanceof GameStatsApiError) {
        switch (err.type) {
          case AuthErrorType.TOKEN_EXPIRED:
            setError('Your session has expired. Please log in again.')
            break
          case AuthErrorType.NETWORK_ERROR:
            setError('Unable to connect to the server. Please check your internet connection and try again.')
            break
          default:
            setError('Failed to load game history. Please try again later.')
        }
      } else {
        setError('An unexpected error occurred. Please try again later.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user, pageSize])

  useEffect(() => {
    loadGameHistory(currentPage, gameTypeFilter)
  }, [loadGameHistory, currentPage, gameTypeFilter])

  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page)
  }

  const handleGameTypeFilterChange = (event: any) => {
    const newFilter = event.target.value as GameTypeFilter
    setGameTypeFilter(newFilter)
    setCurrentPage(1) // Reset to first page when filter changes
  }

  const handleRefresh = () => {
    loadGameHistory(currentPage, gameTypeFilter)
  }

  const getGameTypeIcon = (gameType: string) => {
    switch (gameType.toLowerCase()) {
      case 'countries':
        return <PublicIcon sx={{ fontSize: 20, color: 'primary.main' }} />
      case 'flags':
        return <FlagIcon sx={{ fontSize: 20, color: 'success.main' }} />
      case 'states':
        return <LocationIcon sx={{ fontSize: 20, color: 'warning.main' }} />
      default:
        return <QuizIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
    }
  }

  const getGameTypeName = (gameType: string) => {
    switch (gameType.toLowerCase()) {
      case 'countries':
        return 'Countries'
      case 'flags':
        return 'Flags'
      case 'states':
        return 'States'
      default:
        return gameType.charAt(0).toUpperCase() + gameType.slice(1)
    }
  }

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'success'
    if (accuracy >= 60) return 'warning'
    return 'error'
  }

  const formatDuration = (durationMs: number) => {
    const seconds = Math.floor(durationMs / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    }
    return `${remainingSeconds}s`
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  // Show authentication required message
  if (!isAuthenticated) {
    return (
      <Box className={className} sx={{ p: 3 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <HistoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Authentication Required
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please log in to view your game history.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    )
  }

  return (
    <Box className={className} sx={{ p: 3 }}>
      <Card>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <HistoryIcon sx={{ mr: 2, color: 'primary.main' }} />
              <Typography variant="h5" component="h2">
                Game History
              </Typography>
            </Box>
            <Tooltip title="Refresh">
              <IconButton onClick={handleRefresh} disabled={isLoading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Filters */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <FilterIcon sx={{ color: 'text.secondary' }} />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Game Type</InputLabel>
              <Select
                value={gameTypeFilter}
                label="Game Type"
                onChange={handleGameTypeFilterChange}
                disabled={isLoading}
              >
                <MenuItem value="all">All Games</MenuItem>
                <MenuItem value="countries">Countries</MenuItem>
                <MenuItem value="flags">Flags</MenuItem>
                <MenuItem value="states">States</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Error State */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Loading State */}
          {isLoading && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={48} sx={{ mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Loading Game History...
              </Typography>
            </Box>
          )}

          {/* No Data State */}
          {!isLoading && !error && (!gameHistory || gameHistory.sessions.length === 0) && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <HistoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {gameTypeFilter === 'all' ? 'No Game History Yet' : `No ${getGameTypeName(gameTypeFilter)} Games Yet`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {gameTypeFilter === 'all' 
                  ? 'Start playing quizzes to see your game history here!'
                  : `Play some ${getGameTypeName(gameTypeFilter)} quizzes to see them here!`
                }
              </Typography>
            </Box>
          )}

          {/* Game History Table */}
          {!isLoading && !error && gameHistory && gameHistory.sessions.length > 0 && (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Game Type</TableCell>
                      <TableCell align="center">Score</TableCell>
                      <TableCell align="center">Accuracy</TableCell>
                      <TableCell align="center">Duration</TableCell>
                      <TableCell align="center">Date & Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {gameHistory.sessions.map((session: GameSessionDto) => {
                      const { date, time } = formatDateTime(session.sessionStartTime)
                      const totalQuestions = session.correctAnswers + session.wrongAnswers
                      
                      return (
                        <TableRow key={session.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {getGameTypeIcon(session.gameType)}
                              <Typography variant="body2" sx={{ ml: 1 }}>
                                {getGameTypeName(session.gameType)}
                              </Typography>
                            </Box>
                          </TableCell>
                          
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <CheckIcon sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                                <Typography variant="body2" color="success.main">
                                  {session.correctAnswers}
                                </Typography>
                              </Box>
                              <Typography variant="body2" color="text.secondary">/</Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <CancelIcon sx={{ fontSize: 16, color: 'error.main', mr: 0.5 }} />
                                <Typography variant="body2" color="error.main">
                                  {session.wrongAnswers}
                                </Typography>
                              </Box>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {session.correctAnswers}/{totalQuestions}
                            </Typography>
                          </TableCell>
                          
                          <TableCell align="center">
                            <Chip
                              label={`${Math.round(session.accuracy)}%`}
                              color={getAccuracyColor(session.accuracy)}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <TimeIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
                              <Typography variant="body2">
                                {formatDuration(session.sessionDurationMs)}
                              </Typography>
                            </Box>
                          </TableCell>
                          
                          <TableCell align="center">
                            <Typography variant="body2">
                              {date}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {time}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              {gameHistory.totalCount > pageSize && (
                <Stack spacing={2} sx={{ mt: 3, alignItems: 'center' }}>
                  <Pagination
                    count={Math.ceil(gameHistory.totalCount / pageSize)}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                    showFirstButton
                    showLastButton
                    disabled={isLoading}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Showing {((currentPage - 1) * pageSize) + 1} to{' '}
                    {Math.min(currentPage * pageSize, gameHistory.totalCount)} of{' '}
                    {gameHistory.totalCount} games
                  </Typography>
                </Stack>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

export default GameHistory