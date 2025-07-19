import React, { ReactElement } from 'react'
import { useAuth } from './AuthContext'
import { Box, Alert, Button } from '@mui/material'
import { getAuthString } from '../../Localization/strings'

interface ProtectedRouteProps {
  children: ReactElement
  fallback?: ReactElement
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback 
}) => {
  const { isAuthenticated, isLoading } = useAuth()

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="info">
          {getAuthString('loading') || 'Loading...'}
        </Alert>
      </Box>
    )
  }

  // If not authenticated, show fallback or default message
  if (!isAuthenticated) {
    if (fallback) {
      return fallback
    }

    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          {getAuthString('mustBeLoggedIn') || 'You must be logged in to access this page.'}
        </Alert>
        <Button 
          variant="contained" 
          onClick={() => window.location.hash = '#/'}
        >
          {getAuthString('backToHome') || 'Back to Home'}
        </Button>
      </Box>
    )
  }

  // User is authenticated, render the protected content
  return children
}

export default ProtectedRoute