import { useEffect, useState, useCallback } from "react"
import { ExtendedFeatureCollection, GeoPermissibleObjects } from "d3"
import { Map } from "./Map"
import { CountryOption } from "../Common/types"
import { Score } from "../CountryQuiz/Score"
import { Quiz } from "../Quiz/Quiz"
import { getSettings, randomElement, shuffleArray } from "../Common/utils"
import { CountryMainMenu } from "../CountryQuiz/CountryMainMenu"
import { useAuth } from "../Common/Auth/AuthContext"
import { gameProgressService, GameSession } from "../Common/GameProgress/GameProgressService"
import { useOfflineDetector } from "../Common/Network/useOfflineDetector"
import { OfflineIndicator } from "../Common/Network/OfflineIndicator"
import geoJson from '../Common/GeoData/us.json'

const StateQuiz = () => {

    const OPTIONS_SIZE = 3

    const { user, isAuthenticated } = useAuth()
    const { isOnline, isOffline } = useOfflineDetector()

    const [disabled, setDisabled] = useState(false)
    const [options, setOptions] = useState<CountryOption[]>([])
    const [correctOption, setCorrectOption] = useState<CountryOption>()
    const [correctScore, setCorrectScore] = useState(0)
    const [wrongScore, setWrongScore] = useState(0)

    // Game session state for progress tracking
    const [gameSession, setGameSession] = useState<GameSession>({
        gameType: 'states',
        correctAnswers: 0,
        wrongAnswers: 0,
        sessionStartTime: new Date()
    })

    // Saving state
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    const geoData = geoJson as ExtendedFeatureCollection
    const settings = getSettings()

    useEffect(() => {
        startGame()
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
                await gameProgressService.saveGameProgress(user.id, 'states', currentSession)
                console.log('States quiz progress auto-saved for authenticated user')
            } else {
                // Save temporarily for unauthenticated users
                gameProgressService.saveTempSession(currentSession)
                console.log('States quiz progress saved temporarily for unauthenticated user')
            }
        } catch (error) {
            console.error('Failed to auto-save states quiz progress:', error)
            setSaveError(isOffline ? 'Saved offline - will sync when online' : 'Failed to save progress')
        } finally {
            setIsSaving(false)
        }
    }, [isAuthenticated, user, correctScore, wrongScore, gameSession, isOffline])

    // Auto-save progress on score changes
    useEffect(() => {
        if (correctScore > 0 || wrongScore > 0) {
            autoSaveProgress()
        }
    }, [correctScore, wrongScore, autoSaveProgress])

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
                    console.log('Offline states quiz sessions synced successfully')
                } catch (error) {
                    console.error('Failed to sync offline states quiz sessions:', error)
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
                    gameProgressService.saveGameProgress(user.id, 'states', currentSession).catch(console.error)
                } else {
                    // For unauthenticated users, save to temp storage
                    gameProgressService.saveTempSession(currentSession)
                }
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [isAuthenticated, user, correctScore, wrongScore, gameSession])

    const getRandomOptions = (data: GeoPermissibleObjects[]) => {
        const states = data.map((state: any) => ({
            code: state.properties.STATE,
            name: state.properties.NAME,
        }))

        return shuffleArray(states).slice(0, OPTIONS_SIZE)
    }

    const startGame = () => {
        const randomOptions = getRandomOptions(geoData.features!)
        setOptions(randomOptions)
        setCorrectOption(randomElement(randomOptions))
    }

    const onSubmit = async (isCorrect: boolean) => {
        if (isCorrect) {
            setCorrectScore(correctScore + 1)
        }
        else {
            setWrongScore(wrongScore + 1)
        }
        setDisabled(true)

        // Auto-save after each answer
        try {
            await autoSaveProgress()
        } catch (error) {
            console.error('Failed to save progress after answer:', error)
        }

        // Ensure minimum display time for visual feedback (3.5 seconds total)
        // This gives enough time for colors to be visible even with fast clicking
        setTimeout(() => {
            startGame()
            setDisabled(false)
        }, 3500);
    }

    if (geoData && options.length) {
        return (
            <>
                <CountryMainMenu />
                
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
                
                <Map
                    geoData={geoData.features}
                    selected={correctOption?.name ?? ''}
                />
                <Quiz
                    showFlags={false}
                    disabled={disabled}
                    options={options.map(x => ({ code: x.code, name: x.name }))}
                    correctOption={correctOption?.name ?? ''}
                    onSubmit={onSubmit} />
                <Score correctScore={correctScore} wrongScore={wrongScore} />

            </>
        )
    }
    return <p>Loading...</p>
}

export { StateQuiz }