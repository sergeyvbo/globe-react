import React, { useEffect, useState } from 'react'
import { useAuth } from './Auth/AuthContext'
import { Box, Typography, Button, Paper, Alert } from '@mui/material'

export const SessionDemo: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth()
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [lastActivity, setLastActivity] = useState<string>('')

  useEffect(() => {
    // Check session info from localStorage
    const updateSessionInfo = () => {
      try {
        const session = localStorage.getItem('auth_session')
        const activity = localStorage.getItem('auth_last_activity')
        
        if (session) {
          const parsedSession = JSON.parse(session)
          setSessionInfo({
            expiresAt: parsedSession.expiresAt,
            timeUntilExpiry: new Date(parsedSession.expiresAt).getTime() - Date.now()
          })
        } else {
          setSessionInfo(null)
        }
        
        if (activity) {
          const activityTime = new Date(parseInt(activity))
          setLastActivity(activityTime.toLocaleString())
        }
      } catch (error) {
        console.error('Error reading session info:', error)
      }
    }

    updateSessionInfo()
    
    // Update every second
    const interval = setInterval(updateSessionInfo, 1000)
    
    return () => clearInterval(interval)
  }, [isAuthenticated])

  const formatTimeUntilExpiry = (ms: number) => {
    if (ms <= 0) return 'Expired'
    
    const minutes = Math.floor(ms / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)
    
    return `${minutes}m ${seconds}s`
  }

  if (isLoading) {
    return (
      <Box p={2}>
        <Typography>Loading authentication state...</Typography>
      </Box>
    )
  }

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        Session Management Demo
      </Typography>
      
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Authentication Status
        </Typography>
        <Alert severity={isAuthenticated ? 'success' : 'info'}>
          {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
        </Alert>
        
        {user && (
          <Box mt={2}>
            <Typography><strong>User:</strong> {user.email}</Typography>
            <Typography><strong>Provider:</strong> {user.provider}</Typography>
          </Box>
        )}
      </Paper>

      {sessionInfo && (
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Session Information
          </Typography>
          <Typography><strong>Expires At:</strong> {new Date(sessionInfo.expiresAt).toLocaleString()}</Typography>
          <Typography><strong>Time Until Expiry:</strong> {formatTimeUntilExpiry(sessionInfo.timeUntilExpiry)}</Typography>
          {lastActivity && (
            <Typography><strong>Last Activity:</strong> {lastActivity}</Typography>
          )}
          
          {sessionInfo.timeUntilExpiry <= 5 * 60 * 1000 && sessionInfo.timeUntilExpiry > 0 && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              Session will expire soon. Automatic refresh should occur.
            </Alert>
          )}
        </Paper>
      )}

      <Paper elevation={1} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Session Management Features
        </Typography>
        <Typography variant="body2" paragraph>
          This demo shows the automatic session management features:
        </Typography>
        <ul>
          <li>✅ Session restoration on page load</li>
          <li>✅ Automatic token expiration checking</li>
          <li>✅ Automatic token refresh (5 minutes before expiry)</li>
          <li>✅ Automatic logout on session expiry</li>
          <li>✅ User activity tracking</li>
          <li>✅ Inactivity timeout (30 minutes)</li>
          <li>✅ Periodic session validation (every minute)</li>
        </ul>
        
        <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
          Move your mouse or interact with the page to update activity timestamp.
        </Typography>
      </Paper>
    </Box>
  )
}

export default SessionDemo