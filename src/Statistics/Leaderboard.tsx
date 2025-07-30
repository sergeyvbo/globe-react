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
  Tooltip,
  Avatar,
  Badge
} from '@mui/material'
import {
  EmojiEvents as TrophyIcon,
  Quiz as QuizIcon,
  Flag as FlagIcon,
  Public as PublicIcon,
  LocationOn as LocationIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Person as PersonIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material'
import { useAuth } from '../Common/Auth'
import { leaderboardService, LeaderboardApiError } from '../Common/GameProgress/LeaderboardService'
import { LeaderboardResponse, LeaderboardEntryDto, LeaderboardPeriod, AuthErrorType } from '../Common/types'

interface LeaderboardProps {
  className?: string
  pageSize?: number
}

type GameTypeFilter = 'all' | 'countries' | 'flags' | 'states'

export const Leaderboard: React.FC<LeaderboardProps> = ({ 
  className, 
  pageSize = 20 
}) => {
  const { user, isAuthenticated } = useAuth()
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [gameTypeFilter, setGameTypeFilter] = useState<GameTypeFilter>('all')
  const [periodFilter, setPeriodFilter] = useState<LeaderboardPeriod>('all')

  const loadLeaderboard = useCallback(async (
    page: number = 1, 
    gameType: GameTypeFilter = 'all',
    period: LeaderboardPeriod = 'all'
  ) => {
    try {
      setIsLoading(true)
      setError(null)
      
      let response: LeaderboardResponse
      
      if (gameType !== 'all' && period !== 'all') {
        // Use filtered leaderboard for multiple filters
        response = await leaderboardService.getFilteredLeaderboard({
          gameType: gameType,
          period: period,
          page,
          pageSize
        })
      } else if (gameType !== 'all') {
        // Filter by game type only
        response = await leaderboardService.getLeaderboardByGameType(gameType, page, pageSize)
      } else if (period !== 'all') {
        // Filter by period only
        response = await leaderboardService.getLeaderboardByPeriod(period, page, pageSize)
      } else {
        // Global leaderboard
        response = await leaderboardService.getGlobalLeaderboard(page, pageSize)
      }
      
      setLeaderboardData(response)
    } catch (err) {
      console.error('Failed to load leaderboard:', err)
      
      if (err instanceof LeaderboardApiError) {
        // Use the message from RFC 9457 error parsing for better user experience
        const errorMessage = err.message || 'Failed to load leaderboard. Please try again later.'
        
        switch (err.type) {
          case AuthErrorType.TOKEN_EXPIRED:
            setError('Your session has expired. Please log in again to view personalized leaderboard data.')
            break
          case AuthErrorType.NETWORK_ERROR:
            setError('Unable to connect to the server. Please check your internet connection and try again.')
            break
          case AuthErrorType.VALIDATION_ERROR:
            setError('Invalid request parameters. Please try refreshing the page.')
            break
          default:
            // Use the parsed RFC 9457 error message for better context
            setError(errorMessage)
        }
      } else {
        setError('An unexpected error occurred. Please try again later.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [pageSize])

  useEffect(() => {
    loadLeaderboard(currentPage, gameTypeFilter, periodFilter)
  }, [loadLeaderboard, currentPage, gameTypeFilter, periodFilter])

  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page)
  }

  const handleGameTypeFilterChange = (event: any) => {
    const newFilter = event.target.value as GameTypeFilter
    setGameTypeFilter(newFilter)
    setCurrentPage(1) // Reset to first page when filter changes
  }

  const handlePeriodFilterChange = (event: any) => {
    const newPeriod = event.target.value as LeaderboardPeriod
    setPeriodFilter(newPeriod)
    setCurrentPage(1) // Reset to first page when filter changes
  }

  const handleRefresh = () => {
    loadLeaderboard(currentPage, gameTypeFilter, periodFilter)
  }

  const getGameTypeIcon = (gameType: string) => {
    switch (gameType?.toLowerCase()) {
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
    switch (gameType?.toLowerCase()) {
      case 'countries':
        return 'Countries'
      case 'flags':
        return 'Flags'
      case 'states':
        return 'States'
      default:
        return 'All Games'
    }
  }

  const getPeriodName = (period: LeaderboardPeriod) => {
    switch (period) {
      case 'week':
        return 'This Week'
      case 'month':
        return 'This Month'
      case 'year':
        return 'This Year'
      case 'all':
      default:
        return 'All Time'
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <TrophyIcon sx={{ color: '#FFD700', fontSize: 24 }} /> // Gold
      case 2:
        return <TrophyIcon sx={{ color: '#C0C0C0', fontSize: 22 }} /> // Silver
      case 3:
        return <TrophyIcon sx={{ color: '#CD7F32', fontSize: 20 }} /> // Bronze
      default:
        return (
          <Box 
            sx={{ 
              width: 24, 
              height: 24, 
              borderRadius: '50%', 
              backgroundColor: 'primary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 'bold'
            }}
          >
            {rank}
          </Box>
        )
    }
  }

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'success'
    if (accuracy >= 60) return 'warning'
    return 'error'
  }

  return (
    <Box className={className} sx={{ p: 3 }}>
      <Card>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TrophyIcon sx={{ mr: 2, color: 'warning.main' }} />
              <Typography variant="h5" component="h2">
                Leaderboard
              </Typography>
            </Box>
            <Tooltip title="Refresh">
              <IconButton onClick={handleRefresh} disabled={isLoading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Filters */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
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
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Time Period</InputLabel>
              <Select
                value={periodFilter}
                label="Time Period"
                onChange={handlePeriodFilterChange}
                disabled={isLoading}
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="week">This Week</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
                <MenuItem value="year">This Year</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Current filters display */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Showing {getPeriodName(periodFilter)} leaderboard for {getGameTypeName(gameTypeFilter)}
            </Typography>
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
                Loading Leaderboard...
              </Typography>
            </Box>
          )}

          {/* No Data State */}
          {!isLoading && !error && (!leaderboardData || 
            (!leaderboardData.players && !leaderboardData.entries) || 
            (leaderboardData.players && leaderboardData.players.length === 0) ||
            (leaderboardData.entries && leaderboardData.entries.length === 0)) && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <TrophyIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Players Found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {gameTypeFilter === 'all' && periodFilter === 'all'
                  ? 'No players have completed any games yet.'
                  : `No players found for ${getGameTypeName(gameTypeFilter)} in ${getPeriodName(periodFilter).toLowerCase()}.`
                }
              </Typography>
            </Box>
          )}

          {/* Current User Rank Display */}
          {!isLoading && !error && leaderboardData && isAuthenticated && leaderboardData.currentUserRank && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <StarIcon sx={{ mr: 1 }} />
                <Typography variant="body2">
                  Your current rank: #{leaderboardData.currentUserRank} out of {leaderboardData.totalPlayers} players
                </Typography>
              </Box>
            </Alert>
          )}

          {/* Leaderboard Table */}
          {!isLoading && !error && leaderboardData && 
            ((leaderboardData.players && leaderboardData.players.length > 0) ||
             (leaderboardData.entries && leaderboardData.entries.length > 0)) && (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell align="center" sx={{ width: 80 }}>Rank</TableCell>
                      <TableCell>Player</TableCell>
                      <TableCell align="center">Total Score</TableCell>
                      <TableCell align="center">Accuracy</TableCell>
                      <TableCell align="center">Games Played</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(leaderboardData.players || leaderboardData.entries || []).map((player: LeaderboardEntryDto) => (
                      <TableRow 
                        key={player.userId} 
                        hover
                        sx={{
                          backgroundColor: player.isCurrentUser ? 'action.selected' : 'inherit',
                          '&:hover': {
                            backgroundColor: player.isCurrentUser 
                              ? 'action.selected' 
                              : 'action.hover'
                          }
                        }}
                      >
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            {getRankIcon(player.rank)}
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar 
                              src={player.userAvatar} 
                              sx={{ 
                                width: 32, 
                                height: 32, 
                                mr: 2,
                                bgcolor: player.isCurrentUser ? 'primary.main' : 'grey.400'
                              }}
                            >
                              {player.userAvatar ? null : <PersonIcon />}
                            </Avatar>
                            <Box>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: player.isCurrentUser ? 'bold' : 'normal',
                                  color: player.isCurrentUser ? 'primary.main' : 'inherit'
                                }}
                              >
                                {player.userName || player.displayName || 'Anonymous Player'}
                                {player.isCurrentUser && (
                                  <Chip 
                                    label="You" 
                                    size="small" 
                                    color="primary" 
                                    sx={{ ml: 1, height: 20 }}
                                  />
                                )}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingUpIcon sx={{ fontSize: 16, color: 'primary.main', mr: 0.5 }} />
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: player.rank <= 3 ? 'bold' : 'normal',
                                color: player.rank <= 3 ? 'primary.main' : 'inherit'
                              }}
                            >
                              {player.totalScore.toLocaleString()}
                            </Typography>
                          </Box>
                        </TableCell>
                        
                        <TableCell align="center">
                          <Chip
                            label={`${Math.round(player.accuracy)}%`}
                            color={getAccuracyColor(player.accuracy)}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        
                        <TableCell align="center">
                          <Typography variant="body2">
                            {player.gamesPlayed || player.totalGames}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              {leaderboardData.totalPlayers > pageSize && (
                <Stack spacing={2} sx={{ mt: 3, alignItems: 'center' }}>
                  <Pagination
                    count={Math.ceil(leaderboardData.totalPlayers / pageSize)}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                    showFirstButton
                    showLastButton
                    disabled={isLoading}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Showing {((currentPage - 1) * pageSize) + 1} to{' '}
                    {Math.min(currentPage * pageSize, leaderboardData.totalPlayers)} of{' '}
                    {leaderboardData.totalPlayers} players
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

export default Leaderboard