import { ExtendedFeatureCollection, GeoPermissibleObjects } from "d3"
import { useState, useEffect } from "react"
import { Globe } from "../Globe/Globe"
import { Quiz } from "../Quiz/Quiz"
import { Score } from "./Score"
import { MainMenu } from "../MainMenu/MainMenu"
import { AuthModal } from "../Common/AuthModal"
import { useAuth } from "../Common/AuthContext"
import { getSettings, randomElement, shuffleArray } from "../Common/utils"
import { CountryFlagData, CountryOption, Difficulty } from "../Common/types"
import geoJson from '../Common/GeoData/geo.json'
import flagJson from '../Common/GeoData/countryCodes2.json'

type RegionType = 'continent' | 'region_un' | 'subregion' | 'region_wb' | 'world'

const CountryQuiz = () => {

    const OPTIONS_SIZE = 3

    const { isAuthenticated, isLoading: authLoading } = useAuth()

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
    
    // Game progress state for saving when user authenticates during game
    const [gameProgress, setGameProgress] = useState<{
        correctScore: number
        wrongScore: number
        hasStartedGame: boolean
        sessionStartTime: Date | null
    }>({
        correctScore: 0,
        wrongScore: 0,
        hasStartedGame: false,
        sessionStartTime: null
    })


    useEffect(() => {
        startGame()
        // Initialize session start time when game begins
        setGameProgress(prev => ({
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

    // Update game progress when scores change
    useEffect(() => {
        setGameProgress(prev => ({
            ...prev,
            correctScore,
            wrongScore,
            hasStartedGame: correctScore > 0 || wrongScore > 0
        }))
    }, [correctScore, wrongScore])

    // Hide auth modal when user becomes authenticated and save progress
    useEffect(() => {
        if (isAuthenticated && showAuthModal) {
            setShowAuthModal(false)
            // Save current game progress when user authenticates during game
            if (gameProgress.hasStartedGame) {
                handleAuthSuccess()
            }
        }
    }, [isAuthenticated, showAuthModal, gameProgress.hasStartedGame])

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

    // Handle when user authenticates during game - preserve current progress
    const handleAuthSuccess = () => {
        // The modal will be automatically closed by the useEffect
        // Current game progress is already tracked in state
        // In a real implementation, we would save the progress to the backend here
        const sessionData = {
            ...gameProgress,
            gameType: 'countries' as const,
            sessionDuration: gameProgress.sessionStartTime 
                ? Date.now() - gameProgress.sessionStartTime.getTime() 
                : 0,
            timestamp: new Date().toISOString()
        }
        
        console.log('User authenticated during game, preserving progress:', sessionData)
        
        // TODO: In a real implementation, send this data to the backend
        // await gameProgressService.saveProgress(sessionData)
        
        // For now, we can store it in localStorage as a backup
        try {
            const existingProgress = JSON.parse(localStorage.getItem('temp_game_progress') || '[]')
            existingProgress.push(sessionData)
            localStorage.setItem('temp_game_progress', JSON.stringify(existingProgress))
        } catch (error) {
            console.warn('Failed to save temporary game progress:', error)
        }
    }

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