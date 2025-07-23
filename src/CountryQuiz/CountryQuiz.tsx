import { ExtendedFeatureCollection, GeoPermissibleObjects } from "d3"
import { useState, useEffect, useCallback } from "react"
import { Globe } from "../Globe/Globe"
import { Quiz } from "../Quiz/Quiz"
import { Score } from "./Score"
import { MainMenu } from "../MainMenu/MainMenu"
import { AuthModal } from "../Common/Auth/AuthModal"
import { useAuth } from "../Common/Auth/AuthContext"
import { getSettings, randomElement, shuffleArray } from "../Common/utils"
import { CountryFlagData, CountryOption, Difficulty } from "../Common/types"
import { gameProgressService, GameSession } from "../Common/GameProgress/GameProgressService"
import { useOfflineDetector } from "../Common/Network/useOfflineDetector"
import { OfflineIndicator } from "../Common/Network/OfflineIndicator"
import geoJson from '../Common/GeoData/geo.json'
import flagJson from '../Common/GeoData/countryCodes2.json'

type RegionType = 'continent' | 'region_un' | 'subregion' | 'region_wb' | 'world'

const CountryQuiz = () => {

    const OPTIONS_SIZE = 3

    const { user, isAuthenticated, isLoading: authLoading } = useAuth()
    const { isOnline, isOffline } = useOfflineDetector()

    const geoData = geoJson as ExtendedFeatureCollection
    const flags = flagJson as CountryFlagData[]

    const settings = getSettings()

    const [correctScore, setCorrectScore] = useState(0)
    const [wrongScore, setWrongScore] = useState(0)
    const [options, setOptions] = useState<CountryOption[]>([])
    const [correctOption, setCorrectOption] = useState<CountryOption>()
    const [disabled, setDisabled] = useState(false)
    
    // Auth modal state
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [hasDeclinedAuth, setHasDeclinedAuth] = useState(false)
    
    // Game session state for progress tracking
    const [gameSession, setGameSession] = useState<GameSession>({
        gameType: 'countries',
        correctAnswers: 0,
        wrongAnswers: 0,
        sessionStartTime: new Date()
    })

    // Saving state
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)


    useEffect(() => {
        startGame()
        // Initialize session start time when game begins
        setGameSession(prev => ({
            ...prev,
            sessionStartTime: new Date()
        }))
    }, [])

    // Show auth modal for unauthenticated users when auth loading is complete
    useEffect(() => {
        if (!authLoading && !isAuthenticated && !hasDeclinedAuth) {
            setShowAuthModal(true)
        }
    }, [authLoading, isAuthenticated, hasDeclinedAuth])

    // Update game session when scores change
    useEffect(() => {
        setGameSession(prev => ({
            ...prev,
            correctAnswers: correctScore,
            wrongAnswers: wrongScore
        }))
    }, [correctScore, wrongScore])

    // Hide auth modal when user becomes authenticated and migrate progress
    useEffect(() => {
        if (isAuthenticated && showAuthModal && user) {
            setShowAuthModal(false)
            // Migrate current game progress when user authenticates during game
            if (correctScore > 0 || wrongScore > 0) {
                handleAuthSuccess()
            }
        }
    }, [isAuthenticated, showAuthModal, user, correctScore, wrongScore])

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
                await gameProgressService.saveGameProgress(user.id, 'countries', currentSession)
                console.log('Progress auto-saved for authenticated user')
            } else {
                // Save temporarily for unauthenticated users
                gameProgressService.saveTempSession(currentSession)
                console.log('Progress saved temporarily for unauthenticated user')
            }
        } catch (error) {
            console.error('Failed to auto-save progress:', error)
            setSaveError(isOffline ? 'Saved offline - will sync when online' : 'Failed to save progress')
        } finally {
            setIsSaving(false)
        }
    }, [isAuthenticated, user, correctScore, wrongScore, gameSession, isOffline])

    // Auto-save progress periodically and on score changes
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

    const startGame = () => {

        let countryData = geoData.features
            .filter((obj: any) => ['Country', 'Sovereign country', 'Disputed', 'Indeterminate'].includes(obj.properties['type']))

        const randomOptions = getRandomOptions(countryData, settings.difficulty)

        setOptions(randomOptions)
        setCorrectOption(randomElement(randomOptions))
    }

    const getFlag = (country: any): string => {
        return flags.find(x => x.name === country.properties.name
            || x.name === country.properties.name_en
            || x.name_ru === country.properties.name_ru
            || x.code === country.properties.iso_a2.toLowerCase()
        )?.code ?? ''
    }

    const getRandomOptions = (countryData: GeoPermissibleObjects[], difficulty: Difficulty): CountryOption[] => {

        let regionType: RegionType
        switch (difficulty) {
            case 'easy':
                regionType = 'world'
                break
            case 'medium':
                regionType = 'continent'
                break
            case 'hard':
                regionType = 'subregion'
                break
            default:
                regionType = 'continent'
        }

        let filteredCountries = countryData

        // select random region and find 3 random countries of that region
        // if there are less than 3 countries in this region, widen the region type
        if (regionType != 'world') {
            let regions = Array.from(new Set(countryData.map((obj: any) => obj.properties[regionType] as string)))
            regions = regions.filter(x => x != 'Seven seas (open ocean)')
            const randomRegion = randomElement(regions)

            const regionCountries = filteredCountries.filter((x: any) => x.properties[regionType] === randomRegion)
            if (regionCountries.length >= OPTIONS_SIZE) {
                filteredCountries = regionCountries
            }
            else {
                filteredCountries = filteredCountries.filter((x: any) => x.properties.continent === (regionCountries[0] as any).continent)
            }
        }

        const language = settings && settings.language
        const countryNameField = language ? 'name_' + language : 'name'
        const countries = filteredCountries
            .map((country: any) => ({ code: getFlag(country), name: country.properties.name, translatedName: country.properties[countryNameField] }))

        const optionsArray = shuffleArray(countries).slice(0, OPTIONS_SIZE)

        return optionsArray
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

        setTimeout(() => {
            startGame()
            setDisabled(false)
        }, 2000);
    }

    // Handle auth modal close (when user clicks "Continue without login")
    const handleAuthModalClose = () => {
        setShowAuthModal(false)
        setHasDeclinedAuth(true)
    }

    // Handle when user authenticates during game - migrate current progress
    const handleAuthSuccess = async () => {
        if (!user) return
        
        try {
            // Create current session data
            const currentSession: GameSession = {
                gameType: 'countries',
                correctAnswers: correctScore,
                wrongAnswers: wrongScore,
                sessionStartTime: gameSession.sessionStartTime,
                sessionEndTime: new Date()
            }
            
            // Save current session progress
            await gameProgressService.saveGameProgress(user.id, 'countries', currentSession)
            
            // Also migrate any temporary progress that might exist
            await gameProgressService.migrateTempProgress(user)
            
            console.log('User authenticated during game, progress saved:', currentSession)
        } catch (error) {
            console.error('Failed to save progress after authentication:', error)
        }
    }

    // Save progress when game session ends (for authenticated users)
    const saveGameSession = async () => {
        if (!isAuthenticated || !user) return
        
        try {
            const sessionToSave: GameSession = {
                ...gameSession,
                correctAnswers: correctScore,
                wrongAnswers: wrongScore,
                sessionEndTime: new Date()
            }
            
            await gameProgressService.saveGameProgress(user.id, 'countries', sessionToSave)
            console.log('Game session saved:', sessionToSave)
        } catch (error) {
            console.error('Failed to save game session:', error)
        }
    }

    // Handle online/offline transitions
    useEffect(() => {
        if (isOnline && gameProgressService.hasPendingOfflineSessions()) {
            // Try to sync offline sessions when coming back online
            const syncOfflineSessions = async () => {
                try {
                    await gameProgressService.syncOfflineSessionsManually()
                    console.log('Offline sessions synced successfully')
                } catch (error) {
                    console.error('Failed to sync offline sessions:', error)
                }
            }
            
            syncOfflineSessions()
        }
    }, [isOnline])

    // Save progress when user leaves or session ends
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
                    gameProgressService.saveGameProgress(user.id, 'countries', currentSession).catch(console.error)
                } else {
                    // For unauthenticated users, save to temp storage
                    gameProgressService.saveTempSession(currentSession)
                }
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [isAuthenticated, user, correctScore, wrongScore, gameSession])

    if (geoData && options.length) {
        return (
            <div >
                <MainMenu />
                
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
                
                <Globe
                    geoData={geoData.features}
                    selectedCountry={correctOption?.name ?? ''}
                    showPin={settings.showPin}
                    showZoomButtons={settings.showZoomButtons}
                    showBorders={settings.showBorders}
                />
                <Quiz
                    showFlags
                    disabled={disabled}
                    options={options.map(x => ({ code: x.code, name: x.translatedName }))}
                    correctOption={correctOption?.translatedName ?? ''}
                    onSubmit={onSubmit} />
                <Score correctScore={correctScore} wrongScore={wrongScore} />
                
                {/* Auth Modal for unauthenticated users */}
                <AuthModal
                    open={showAuthModal}
                    onClose={handleAuthModalClose}
                    initialMode="welcome"
                />
            </div>
        )
    }
    return <p> Loading...</p>
}

export { CountryQuiz }