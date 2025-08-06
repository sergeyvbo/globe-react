import React, { useState, useEffect } from 'react'
import { AppBar, Toolbar, IconButton, Dialog, DialogTitle, DialogContent, FormControl, FormControlLabel, FormGroup, Switch, Select, MenuItem, Box, Button, Avatar, Menu, ListItemIcon, ListItemText } from '@mui/material'
import { Flag, Settings, AccountCircle, Logout, Person, TrendingUp, EmojiEvents } from '@mui/icons-material'
import { getString, getAuthString } from '../Localization/strings'
import { getSettings } from '../Common/utils'
import { CountryQuizSettings } from '../Common/types'
import { useAuth } from '../Common/Auth/AuthContext'
import { AuthModal } from '../Common/Auth/AuthModal'
import { useModal } from '../Common/Modals'


const MainMenu = () => {
    const [settings, setSettings] = useState<CountryQuizSettings>(getSettings())
    const [open, setOpen] = useState(false)
    const [authModalOpen, setAuthModalOpen] = useState(false)
    const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null)
    
    const { user, isAuthenticated, logout } = useAuth()
    const { openModal } = useModal()

    const handleSettingsChange = (key: string, value: string | boolean): void => {
        const newSettings = { ...settings, [key]: value }
        setSettings(newSettings)
        localStorage.setItem('countryQuizSettings', JSON.stringify(newSettings))
    }

    const handleLoginClick = (): void => {
        setAuthModalOpen(true)
    }

    const handleProfileClick = (event: React.MouseEvent<HTMLElement>): void => {
        setProfileMenuAnchor(event.currentTarget)
    }

    const handleProfileMenuClose = (): void => {
        setProfileMenuAnchor(null)
    }

    const handleLogout = async () => {
        try {
            await logout()
            handleProfileMenuClose()
        } catch (error) {
            console.error('Logout failed:', error)
        }
    }

    const handleProfileNavigation = (): void => {
        openModal('userProfile')
        handleProfileMenuClose()
    }

    const handleStatsNavigation = (): void => {
        openModal('statistics')
        handleProfileMenuClose()
    }

    const handleLeaderboardNavigation = (): void => {
        openModal('leaderboard')
        handleProfileMenuClose()
    }

    return (
        <>
            <AppBar color='transparent' elevation={0}>
                <Toolbar>
                    <IconButton
                        size='large'
                        edge='start'
                        color='primary'
                        aria-label='menu'
                        onClick={() => setOpen(!open)}
                    >
                        <Settings />
                    </IconButton>
                    <IconButton
                        size='large'
                        edge='start'
                        color='primary'
                        aria-label='flags'
                        href='/globe-react/#/flags'
                    >
                        <Flag />
                    </IconButton>
                    <Button
                        size='large'
                        color='primary'
                        aria-label='states'
                        href='/globe-react/#/states'>
                        USA
                    </Button>
                    <IconButton
                        size='large'
                        color='primary'
                        aria-label='leaderboard'
                        onClick={handleLeaderboardNavigation}
                    >
                        <EmojiEvents />
                    </IconButton>

                    {/* Authentication UI */}
                    <Box sx={{ flexGrow: 1 }} />
                    {isAuthenticated ? (
                        <>
                            <IconButton
                                size='large'
                                color='primary'
                                onClick={handleProfileClick}
                                aria-label='profile'
                            >
                                {user?.avatar ? (
                                    <Avatar src={user.avatar} sx={{ width: 32, height: 32 }} />
                                ) : (
                                    <AccountCircle />
                                )}
                            </IconButton>
                            <Menu
                                anchorEl={profileMenuAnchor}
                                open={Boolean(profileMenuAnchor)}
                                onClose={handleProfileMenuClose}
                                onClick={handleProfileMenuClose}
                                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                            >
                                <MenuItem onClick={handleProfileNavigation}>
                                    <ListItemIcon>
                                        <Person fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText>{getAuthString('profile')}</ListItemText>
                                </MenuItem>
                                <MenuItem onClick={handleStatsNavigation}>
                                    <ListItemIcon>
                                        <TrendingUp fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText>Statistics</ListItemText>
                                </MenuItem>
                                <MenuItem onClick={handleLeaderboardNavigation}>
                                    <ListItemIcon>
                                        <EmojiEvents fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText>Leaderboard</ListItemText>
                                </MenuItem>
                                <MenuItem onClick={handleLogout}>
                                    <ListItemIcon>
                                        <Logout fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText>{getAuthString('logout')}</ListItemText>
                                </MenuItem>
                            </Menu>
                        </>
                    ) : (
                        <Button
                            color='primary'
                            onClick={handleLoginClick}
                            aria-label='login'
                        >
                            {getAuthString('login')}
                        </Button>
                    )}

                </Toolbar>
            </AppBar>
            <Dialog
                className='MainMenu-Dialog'
                open={open}
                onClose={() => setOpen(false)}>
                <DialogTitle>{getString('settings')}</DialogTitle>
                <DialogContent sx={{ margin: '5px' }}>
                    <FormControl component='fieldset'>
                        <FormGroup>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.showPin}
                                        onChange={(e) => handleSettingsChange('showPin', e.target.checked)}
                                    />
                                }
                                label={getString('showPin')}
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.showZoomButtons}
                                        onChange={(e) => handleSettingsChange('showZoomButtons', e.target.checked)}
                                    />
                                }
                                label={getString('showZoomButtons')}
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.showBorders}
                                        onChange={(e) => handleSettingsChange('showBorders', e.target.checked)}
                                    />
                                }
                                label={getString('showBorders')}
                            />
                            <FormControl>
                                <Box mt={2}>
                                    <Select
                                        label={getString('language')}
                                        value={settings.language}
                                        onChange={(e) => handleSettingsChange('language', e.target.value)}
                                    >
                                        <MenuItem value='ru'>Русский</MenuItem>
                                        <MenuItem value='en'>English</MenuItem>
                                    </Select>
                                </Box>
                            </FormControl>
                            <FormControl>
                                <Box mt={2}>
                                    <Select
                                        value={settings.difficulty}
                                        onChange={(e) => handleSettingsChange('difficulty', e.target.value)}
                                    >
                                        <MenuItem value='easy'>{getString('easy')}</MenuItem>
                                        <MenuItem value='medium'>{getString('medium')}</MenuItem>
                                        <MenuItem value='hard'>{getString('hard')}</MenuItem>
                                    </Select>
                                </Box>
                            </FormControl>
                            <FormControl>
                                {/* <Box mt={2}>
                                    <Select
                                        label={getString('countrySet')}
                                        value={settings.countrySet}
                                        onChange={(e) => handleSettingsChange('countrySet', e.target.value)}
                                    >
                                        <MenuItem value='showAll'>{getString('showAll')}</MenuItem>
                                        <MenuItem value='showSovereignCountries'>{getString('showSovereignCountries')}</MenuItem>
                                        <MenuItem value='showDisputed'>{getString('showDisputed')}</MenuItem>
                                        <MenuItem value='showOthers'>{getString('showOthers')}</MenuItem>
                                    </Select>
                                </Box> */}
                            </FormControl>
                        </FormGroup>
                    </FormControl>
                </DialogContent>
            </Dialog>
            
            {/* Authentication Modal */}
            <AuthModal 
                open={authModalOpen} 
                onClose={() => setAuthModalOpen(false)} 

            />
        </>
    )
}

export { MainMenu }