import React, { useState, useEffect, Dispatch } from 'react'
import { AppBar, Toolbar, IconButton, Dialog, DialogTitle, DialogContent, FormControl, FormControlLabel, FormGroup, Switch, Select, MenuItem, Box, Button } from '@mui/material'
import { Flag, Public, Settings } from '@mui/icons-material'
import { getString } from '../Localization/strings'

type Difficulty = 'easy' | 'medium' | 'hard'

type CountryQuizSettings = {
    language: 'en' | 'ru',
    showPin: boolean,
    difficulty: Difficulty,
    showZoomButtons: boolean,
    showBorders: boolean,
    showSovereignCountries: boolean,
    showDisputed: boolean,
    showOthers: boolean,
}

interface Props {
    settings: CountryQuizSettings
    setSettings: Dispatch<React.SetStateAction<CountryQuizSettings>>
}

const MainMenu = (props: Props) => {
    const { settings, setSettings } = props
    const [open, setOpen] = useState(false)

    const handleSettingsChange = (key: string, value: string | boolean) => {
        const newSettings = { ...settings, [key]: value }
        setSettings(newSettings)
        localStorage.setItem('countryQuizSettings', JSON.stringify(newSettings))
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
        </>
    )
}

export { MainMenu, type CountryQuizSettings, type Difficulty }