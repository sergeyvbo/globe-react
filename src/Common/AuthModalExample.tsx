import React, { useState } from 'react'
import { Button, Box, Typography } from '@mui/material'
import { AuthModal } from './AuthModal'
import { useAuth } from './AuthContext'

/**
 * Example component demonstrating how to use AuthModal
 * This is for testing and demonstration purposes
 */
export const AuthModalExample: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false)
  const [initialMode, setInitialMode] = useState<'welcome' | 'login' | 'register'>('welcome')
  const { isAuthenticated, user, logout } = useAuth()

  const handleOpenModal = (mode: 'welcome' | 'login' | 'register' = 'welcome') => {
    setInitialMode(mode)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>
        AuthModal Example
      </Typography>
      
      {isAuthenticated ? (
        <Box>
          <Typography variant="h6" color="primary" gutterBottom>
            Welcome, {user?.name || user?.email}!
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Provider: {user?.provider}
          </Typography>
          <Button 
            variant="outlined" 
            onClick={handleLogout}
            sx={{ mt: 2 }}
          >
            Logout
          </Button>
        </Box>
      ) : (
        <Box>
          <Typography variant="body1" gutterBottom>
            You are not authenticated
          </Typography>
          
          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button 
              variant="contained" 
              onClick={() => handleOpenModal('welcome')}
            >
              Open Welcome Modal
            </Button>
            
            <Button 
              variant="outlined" 
              onClick={() => handleOpenModal('login')}
            >
              Open Login Modal
            </Button>
            
            <Button 
              variant="outlined" 
              onClick={() => handleOpenModal('register')}
            >
              Open Register Modal
            </Button>
          </Box>
        </Box>
      )}

      <AuthModal
        open={modalOpen}
        onClose={handleCloseModal}
        initialMode={initialMode}
      />
    </Box>
  )
}

export default AuthModalExample