import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, IconButton, Dialog, DialogTitle, DialogContent, FormControl, FormControlLabel, FormGroup, Switch, Select, MenuItem, Box } from '@mui/material';
import { Settings } from '@mui/icons-material';
import { getString } from '../Localization/strings';

const defaultSettings = {
    language: 'en',
    showPin: false,
    difficulty: 'medium',
    showZoomButtons: true,
    showBorders: true,
    countrySet: 'showAll',
};

const MainMenu = () => {
    const [open, setOpen] = useState(false);
    const [settings, setSettings] = useState(defaultSettings);

    useEffect(() => {
        const savedSettings = localStorage.getItem('settings');
        if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
        }
    }, []);

    const handleSettingsChange = (key: string, value: string | boolean) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        localStorage.setItem('settings', JSON.stringify(newSettings));
    };

    return (
        <>
            <AppBar color='transparent' elevation={0}>
                <Toolbar>
                    <IconButton
                        size="large"
                        edge="start"
                        color="primary"
                        aria-label="menu"
                        onClick={() => setOpen(!open)}
                    >
                        <Settings />
                    </IconButton>
                </Toolbar>
            </AppBar>
            <Dialog
                className='MainMenu-Dialog'
                open={open}
                onClose={() => setOpen(false)}>
                <DialogTitle>{getString("settings")}</DialogTitle>
                <DialogContent sx={{ margin: "5px" }}>
                    <FormControl component="fieldset">
                        <FormGroup>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.showPin}
                                        onChange={(e) => handleSettingsChange('showPin', e.target.checked)}
                                        disabled
                                    />
                                }
                                label={getString("showPin")}
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.showZoomButtons}
                                        onChange={(e) => handleSettingsChange('showZoomButtons', e.target.checked)}
                                        disabled
                                    />
                                }
                                label={getString("showZoomButtons")}
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings.showBorders}
                                        onChange={(e) => handleSettingsChange('showBorders', e.target.checked)}
                                        disabled
                                    />
                                }
                                label={getString("showBorders")}
                            />
                            <FormControl>
                                <Box mt={2}>
                                    <Select
                                        label={getString("language")}
                                        value={settings.language}
                                        onChange={(e) => handleSettingsChange('language', e.target.value)}
                                    >
                                        <MenuItem value='ru'>Русский</MenuItem>
                                        <MenuItem value='en'>English</MenuItem>
                                        {/* Добавьте дополнительные языки по мере необходимости */}
                                    </Select>
                                </Box>
                            </FormControl>
                            <FormControl>
                                <Box mt={2}>
                                    <Select
                                        value={settings.difficulty}
                                        onChange={(e) => handleSettingsChange('difficulty', e.target.value)}
                                        disabled
                                    >
                                        <MenuItem value='easy'>{getString("easy")}</MenuItem>
                                        <MenuItem value='medium'>{getString("medium")}</MenuItem>
                                        <MenuItem value='hard'>{getString("hard")}</MenuItem>
                                    </Select>
                                </Box>
                            </FormControl>
                            <FormControl>
                                <Box mt={2}>
                                    <Select
                                        label={getString('countrySet')}
                                        value={settings.countrySet}
                                        onChange={(e) => handleSettingsChange('countrySet', e.target.value)}
                                        disabled
                                    >
                                        <MenuItem value='showAll'>{getString("showAll")}</MenuItem>
                                        <MenuItem value='showSovereignCountries'>{getString("showSovereignCountries")}</MenuItem>
                                        <MenuItem value='showDisputed'>{getString("showDisputed")}</MenuItem>
                                        <MenuItem value='showOthers'>{getString("showOthers")}</MenuItem>
                                    </Select>
                                </Box>
                            </FormControl>
                        </FormGroup>
                    </FormControl>
                </DialogContent>
            </Dialog>
        </>
    );
}

export { MainMenu }