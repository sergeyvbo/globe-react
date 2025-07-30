import React, { useState, useCallback } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Paper,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  TrendingUp as StatsIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { BaseModal } from './BaseModal';
import { useModal } from './useModal';
import { UserStats } from '../../Statistics/UserStats';
import { GameHistory } from '../../Statistics/GameHistory';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`statistics-modal-tabpanel-${index}`}
      aria-labelledby={`statistics-modal-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `statistics-modal-tab-${index}`,
    'aria-controls': `statistics-modal-tabpanel-${index}`,
  };
}

interface StatisticsModalProps {
  initialTab?: number;
}

// Store tab state outside component to preserve it when modal is reopened
let persistedTabValue = 0;

// Function to reset persisted state (useful for testing)
export const resetPersistedTabState = () => {
  persistedTabValue = 0;
};

export const StatisticsModal: React.FC<StatisticsModalProps> = ({ 
  initialTab = 0 
}) => {
  const { modals, closeModal } = useModal();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Initialize tab value from persisted state or initialTab prop
  const [tabValue, setTabValue] = useState(() => {
    return initialTab !== 0 ? initialTab : persistedTabValue;
  });

  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    // Persist tab state for when modal is reopened
    persistedTabValue = newValue;
  }, []);

  const handleClose = useCallback(() => {
    closeModal('statistics');
  }, [closeModal]);

  return (
    <BaseModal
      open={modals.statistics}
      onClose={handleClose}
      title="Statistics"
      maxWidth="lg"
      fullWidth
    >
      <Paper 
        sx={{ 
          width: '100%',
          boxShadow: 'none',
          border: 'none',
          backgroundColor: 'transparent'
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="statistics modal tabs"
            variant={isMobile ? 'fullWidth' : 'standard'}
            sx={{
              '& .MuiTab-root': {
                minHeight: 48,
                textTransform: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
              }
            }}
          >
            <Tab 
              icon={<StatsIcon />} 
              label="Overview" 
              iconPosition={isMobile ? 'top' : 'start'}
              {...a11yProps(0)} 
            />
            <Tab 
              icon={<HistoryIcon />} 
              label="Game History" 
              iconPosition={isMobile ? 'top' : 'start'}
              {...a11yProps(1)} 
            />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <UserStats className="statistics-modal-content" />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <GameHistory 
            className="statistics-modal-content"
            pageSize={isMobile ? 5 : 10}
          />
        </TabPanel>
      </Paper>
    </BaseModal>
  );
};

export default StatisticsModal;