import { ExtendedFeatureCollection, GeoPermissibleObjects } from "d3"
import { useState, useEffect } from "react"
import { Globe } from "../Globe/Globe"
import { Quiz } from "../Quiz/Quiz"
import { Score } from "./Score"
import { MainMenu } from "../MainMenu/MainMenu"
import { AuthModal } from "../Common/Auth/AuthModal"
import { useAuth } from "../Common/Auth/AuthContext"
import { getSettings, randomElement, shuffleArray } from "../Common/utils"
import { CountryFlagData, CountryOption, Difficulty } from "../Common/types"
import { gameProgressService, GameSession } from "../Common/GameProgress/GameProgressService"
import geoJson from '../Common/GeoData/geo.json'
import flagJson from '../Common/GeoData/countryCodes2.json'

type RegionType = 'continent' | 'region_un' | 'subregion' | 'region_wb' | 'world'

const CountryQuiz = () => {

    const OPTIONS_SIZE = 3

    const { user, isAuthenticated, isLoading: authLoading } = useAuth()

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

    // Save progress when authenticated user finishes a game session
    useEffect(() => {
        if (isAuthenticated && user && (correctScore > 0 || wrongScore > 0)) {
            // Save progress periodically for authenticated users
            const saveProgress = async () => {
                try {
                    const currentSession = {
                        ...gameSession,
                        correctAnswers: correctScore,
                        wrongAnswers: wrongScore,
                        sessionEndTime: new Date()
                    }
                    
                    // Save to temporary storage for unauthenticated users
                    gameProgressService.saveTempSession(currentSession)
                } catch (error) {
                    console.error('Failed to save temporary progress:', error)
                }
            }
            
            saveProgress()
        }
    }, [isAuthenticated, user, correctScore, wrongScore, gameSession])

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

    const onSubmit = (isCorrect: boolean) => {
        if (isCorrect) {
            setCorrectScore(correctScore + 1)
        }
        else {
            setWrongScore(wrongScore + 1)
        }
        setDisabled(true)
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

    // Save progress when user leaves or session ends
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (isAuthenticated && user && (correctScore > 0 || wrongScore > 0)) {
                saveGameSession()
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [isAuthenticated, user, correctScore, wrongScore, gameSession])

    if (geoData && options.length) {
        return (
            <div >
                <MainMenu />
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