import React, { useState } from 'react'
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper
} from '@mui/material'
import {
  TrendingUp as StatsIcon,
  History as HistoryIcon
} from '@mui/icons-material'
import { UserStats } from './UserStats'
import { GameHistory } from './GameHistory'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`stats-tabpanel-${index}`}
      aria-labelledby={`stats-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box>
          {children}
        </Box>
      )}
    </div>
  )
}

function a11yProps(index: number) {
  return {
    id: `stats-tab-${index}`,
    'aria-controls': `stats-tabpanel-${index}`,
  }
}

export const StatsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0)

  const handleTabChange = (_: React.SyntheticEvent, newValue: number): void => {
    setTabValue(newValue)
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Statistics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track your progress and view your game history
        </Typography>
      </Box>

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="statistics tabs"
            sx={{ px: 2 }}
          >
            <Tab 
              icon={<StatsIcon />} 
              label="Overview" 
              iconPosition="start"
              {...a11yProps(0)} 
            />
            <Tab 
              icon={<HistoryIcon />} 
              label="Game History" 
              iconPosition="start"
              {...a11yProps(1)} 
            />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <UserStats />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <GameHistory />
        </TabPanel>
      </Paper>
    </Container>
  )
}

export default StatsPage