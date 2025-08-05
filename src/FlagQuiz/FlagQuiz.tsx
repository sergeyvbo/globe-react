import { useEffect, useState, useCallback } from 'react';
import { Button, Grid, Box, Stack } from '@mui/material';
import './FlagQuiz.css'
import { shuffleArray } from '../Common/utils';
import { FlagImage } from '../Common/utils/flagUtils';
import { FlagMainMenu } from './FlagMainMenu';
import { Score } from '../CountryQuiz/Score';
import { useAuth } from '../Common/Auth/AuthContext';
import { gameProgressService, GameSession } from '../Common/GameProgress/GameProgressService';
import { useOfflineDetector } from '../Common/Network/useOfflineDetector';
import { OfflineIndicator } from '../Common/Network/OfflineIndicator';
import flagJson from '../Common/GeoData/countryCodes2.json'
import { CountryFlagData } from '../Common/types';

type Match = {
    flag: string;
    country: string;
}

type ButtonColor = "inherit" | "success" | "primary" | "secondary" | "error" | "info" | "warning" | undefined

export const FlagQuiz = () => {
    const OPTIONS_LENGTH = 5

    const { user, isAuthenticated } = useAuth()
    const { isOnline, isOffline } = useOfflineDetector()

    //const [data, setData] = useState<Country[]>([])
    const [countries, setCountries] = useState<CountryFlagData[]>([])
    const [flags, setFlags] = useState<string[]>([])
    const [selectedFlag, setSelectedFlag] = useState<string | null>(null)
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
    const [matches, setMatches] = useState<Match[]>([])
    const [error, setError] = useState<Match>()
    const [correctScore, setCorrectScore] = useState(0)
    const [wrongScore, setWrongScore] = useState(0)

    // Game session state for progress tracking
    const [gameSession, setGameSession] = useState<GameSession>({
        gameType: 'flags',
        correctAnswers: 0,
        wrongAnswers: 0,
        sessionStartTime: new Date()
    })

    // Saving state
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    const data = flagJson as CountryFlagData[]

    useEffect(() => {
        startGame(data)
        // Initialize session start time when game begins
        setGameSession(prev => ({
            ...prev,
            sessionStartTime: new Date()
        }))
    }, [])

    // Update game session when scores change
    useEffect(() => {
        setGameSession(prev => ({
            ...prev,
            correctAnswers: correctScore,
            wrongAnswers: wrongScore
        }))
    }, [correctScore, wrongScore])

    // Auto-save progress function
    const autoSaveProgress = useCallback(async () => {
        if (correctScore === 0 && wrongScore === 0) return

        setIsSaving(true)
        setSaveError(null)

        try {
            const currentSession: GameSession = {
                ...gameSession,
                correctAnswers: correctScore,
                wrongAnswers: wrongScore,
                sessionEndTime: new Date()
            }

            if (isAuthenticated && user) {
                // Save for authenticated users
                await gameProgressService.saveGameProgress(user.id, 'flags', currentSession)
                console.log('Flag quiz progress auto-saved for authenticated user')
            } else {
                // Save temporarily for unauthenticated users
                gameProgressService.saveTempSession(currentSession)
                console.log('Flag quiz progress saved temporarily for unauthenticated user')
            }
        } catch (error) {
            console.error('Failed to auto-save flag quiz progress:', error)
            setSaveError(isOffline ? 'Saved offline - will sync when online' : 'Failed to save progress')
        } finally {
            setIsSaving(false)
        }
    }, [isAuthenticated, user, correctScore, wrongScore, gameSession, isOffline])

    // Auto-save progress on score changes and round completion
    useEffect(() => {
        if (correctScore > 0 || wrongScore > 0) {
            autoSaveProgress()
        }
    }, [correctScore, wrongScore, autoSaveProgress])

    // Auto-save when round is completed
    useEffect(() => {
        if (OPTIONS_LENGTH === matches.length && (correctScore > 0 || wrongScore > 0)) {
            autoSaveProgress()
        }
    }, [matches.length, correctScore, wrongScore, autoSaveProgress])

    // Auto-save every 30 seconds during active gameplay
    useEffect(() => {
        if (correctScore === 0 && wrongScore === 0) return

        const interval = setInterval(() => {
            autoSaveProgress()
        }, 30000) // 30 seconds

        return () => clearInterval(interval)
    }, [correctScore, wrongScore, autoSaveProgress])

    // Handle online/offline transitions
    useEffect(() => {
        if (isOnline && gameProgressService.hasPendingOfflineSessions()) {
            // Try to sync offline sessions when coming back online
            const syncOfflineSessions = async () => {
                try {
                    await gameProgressService.syncOfflineSessionsManually()
                    console.log('Offline flag quiz sessions synced successfully')
                } catch (error) {
                    console.error('Failed to sync offline flag quiz sessions:', error)
                }
            }
            
            syncOfflineSessions()
        }
    }, [isOnline])

    // Save progress when user leaves
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (correctScore > 0 || wrongScore > 0) {
                // Use synchronous save for beforeunload
                const currentSession: GameSession = {
                    ...gameSession,
                    correctAnswers: correctScore,
                    wrongAnswers: wrongScore,
                    sessionEndTime: new Date()
                }

                if (isAuthenticated && user) {
                    // For authenticated users, try to save but don't block
                    gameProgressService.saveGameProgress(user.id, 'flags', currentSession).catch(console.error)
                } else {
                    // For unauthenticated users, save to temp storage
                    gameProgressService.saveTempSession(currentSession)
                }
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [isAuthenticated, user, correctScore, wrongScore, gameSession])

    const startGame = (countryList: CountryFlagData[]) => {
        setMatches([])
        setError(undefined)
        const randomCountries = shuffleArray(countryList).slice(0, OPTIONS_LENGTH)
        setCountries(randomCountries)
        setFlags(shuffleArray(randomCountries.map(x => x.code)))
    }

    const handleFlagClick = (code: string) => {
        if (isMatch(code)) return
        if (selectedFlag === code) {
            setSelectedFlag(null)
            return
        }
        if (selectedCountry) {
            checkMatch({ flag: code, country: selectedCountry })
            setSelectedCountry(null);
            setSelectedFlag(null);
            return
        }
        setSelectedFlag(code);
    };

    const handleCountryClick = (name: string) => {
        if (isMatch(name)) return
        if (selectedCountry === name) {
            setSelectedCountry(null)
            return
        }
        if (selectedFlag) {
            checkMatch({ flag: selectedFlag, country: name })
            setSelectedCountry(null);
            setSelectedFlag(null);
            return
        }
        setSelectedCountry(name)
    };

    const checkMatch = async (match: Match) => {
        if (countries.find(x => x.code === match.flag && x.name === match.country)) {
            setMatches([...matches, match])
            setCorrectScore(correctScore + 1)
        }
        else {
            setWrongScore(wrongScore + 1)
            setError(match)
            setTimeout(() => {
                console.log('reset error')
                setError(undefined)
            }, 1000)
        }

        // Auto-save after each match attempt
        try {
            await autoSaveProgress()
        } catch (error) {
            console.error('Failed to save progress after match:', error)
        }
    }

    const isMatch = (code: string): boolean => {
        return matches.some(x => (x.flag === code || x.country === code))
    }

    const getFlagColor = (code: string): ButtonColor => {
        if (isMatch(code)) {
            return 'success'
        }
        if (error && error.flag == code) {
            return 'error'
        }
        return 'primary'
    }

    const getCountryColor = (country: string): ButtonColor => {
        if (isMatch(country)) {
            return 'success'
        }
        if (error && error.country == country) {
            return 'error'
        }
        return 'primary'
    }

    const handleContinue = () => {
        startGame(data)
    }

    return (
        <>
            <FlagMainMenu />
            
            {/* Offline Indicator */}
            <OfflineIndicator />
            
            {/* Save Status Indicator */}
            {(isSaving || saveError) && (
                <div 
                    style={{
                        position: 'fixed',
                        top: '50px',
                        right: '10px',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        zIndex: 999,
                        backgroundColor: saveError ? '#ff9800' : '#2196f3',
                        color: 'white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                >
                    {isSaving ? '💾 Saving...' : saveError}
                </div>
            )}
            
            <Box
                height={'90dvh'}
                width={'100%'}
                display="flex"
                alignItems="center"
            >
                <Grid container spacing={2} >
                    <Grid item xs={6}>
                        <Stack className='flag-stack' spacing={2}>
                            {flags.map(flag => (
                                <Button
                                    key={flag}
                                    className='flag-button'
                                    variant={(selectedFlag === flag || isMatch(flag)) ? 'contained' : 'outlined'}
                                    color={getFlagColor(flag)}
                                    startIcon={<FlagImage countryCode={flag} size="64x48" alt={flag} />}
                                    onClick={() => handleFlagClick(flag)}
                                    disableElevation={isMatch(flag)}
                                />
                            ))}
                        </Stack>
                    </Grid>
                    <Grid item xs={6}>
                        <Stack className='country-stack' spacing={2}>
                            {countries.map(country => (
                                <Button
                                    key={country.name}
                                    className='country-button'
                                    variant={(selectedCountry === country.name || isMatch(country.code)) ? 'contained' : 'outlined'}
                                    color={getCountryColor(country.name)}
                                    onClick={() => handleCountryClick(country.name)}
                                    disableElevation={isMatch(country.code)}
                                >
                                    <h3>{country.name_ru}</h3>
                                </Button>
                            ))}
                        </Stack>
                    </Grid>
                </Grid>
            </Box>
            <Score correctScore={correctScore} wrongScore={wrongScore}></Score>
            {OPTIONS_LENGTH === matches.length && (
                <Button className='continue-button' onClick={handleContinue} variant="contained">
                    Продолжить
                </Button>
            )}</>
    )
}
