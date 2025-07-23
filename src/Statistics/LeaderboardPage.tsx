import React from 'react'
import {
  Box,
  Container,
  Typography
} from '@mui/material'
import { Leaderboard } from './Leaderboard'

export const LeaderboardPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Leaderboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          See how you rank against other players
        </Typography>
      </Box>

      <Leaderboard />
    </Container>
  )
}

export default LeaderboardPage