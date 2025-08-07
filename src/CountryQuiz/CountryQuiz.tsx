import React, { useState, useEffect, useCallback } from "react"
import { ExtendedFeatureCollection } from "d3"

import { CountryFlagData, CountryOption, Difficulty, CountryFeature } from "../Common/types"
import { getSettings, randomElement, shuffleArray } from "../Common/utils"
import { useAuth } from "../Common/Auth/AuthContext"
import { useBaseQuiz } from "../Common/Hooks/useBaseQuiz"
import { gameProgressService } from "../Common/GameProgress/GameProgressService"
import { Globe } from "../Globe/Globe"
import { Quiz } from "../Quiz/Quiz"
import { Score } from "./Score"
import { MainMenu } from "../MainMenu/MainMenu"
import { AuthModal } from "../Common/Auth/AuthModal"
import { QuizLayout } from "../Common/QuizLayout"

import geoJson from '../Common/GeoData/geo.json'
import flagJson from '../Common/GeoData/countryCodes2.json'

type RegionType = 'continent' | 'region_un' | 'subregion' | 'region_wb' | 'world'

export const CountryQuiz: React.FC = React.memo(() => {

    const OPTIONS_SIZE = 3

    const { user, isAuthenticated, isLoading: authLoading } = useAuth()

    const geoData = geoJson as ExtendedFeatureCollection
    const flags = flagJson as CountryFlagData[]

    const settings = getSettings()

    // Use shared base quiz hook for common functionality
    const {
        correctScore,
        wrongScore,
        disabled,
        actions,
        gameProgress
    } = useBaseQuiz({
        gameType: 'countries',
        isAuthenticated,
        user
    })

    const [options, setOptions] = useState<CountryOption[]>([])
    const [correctOption, setCorrectOption] = useState<CountryOption>()

    // Auth modal state
    const [showAuthModal, setShowAuthModal] = useState(false)
    const [hasDeclinedAuth, setHasDeclinedAuth] = useState(false)


    useEffect(() => {
        startGame()
    }, [])

    // Show auth modal for unauthenticated users when auth loading is complete
    useEffect(() => {
        if (!authLoading && !isAuthenticated && !hasDeclinedAuth) {
            setShowAuthModal(true)
        }
    }, [authLoading, isAuthenticated, hasDeclinedAuth])

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



    const getFlag = useCallback((country: CountryFeature): string => {
        return flags.find(x => x.name === country.properties.name
            || x.name === country.properties.name_en
            || x.name_ru === country.properties.name_ru
            || x.code === country.properties.iso_a2.toLowerCase()
        )?.code ?? ''
    }, [flags])

    const getRandomOptions = useCallback((countryData: CountryFeature[], difficulty: Difficulty): CountryOption[] => {

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
            let regions = Array.from(new Set(countryData.map((obj: CountryFeature) => obj.properties[regionType] as string)))
            regions = regions.filter(x => x != 'Seven seas (open ocean)')
            const randomRegion = randomElement(regions)

            const regionCountries = filteredCountries.filter((x: CountryFeature) => x.properties[regionType] === randomRegion)
            if (regionCountries.length >= OPTIONS_SIZE) {
                filteredCountries = regionCountries
            }
            else {
                filteredCountries = filteredCountries.filter((x: CountryFeature) => x.properties.continent === regionCountries[0].properties.continent)
            }
        }

        const language = settings && settings.language
        const countryNameField = language ? 'name_' + language : 'name'
        const countries = filteredCountries
            .map((country: CountryFeature) => ({ code: getFlag(country), name: country.properties.name, translatedName: country.properties[countryNameField] as string }))

        const optionsArray = shuffleArray(countries).slice(0, OPTIONS_SIZE)

        return optionsArray
    }, [settings, getFlag])

    const startGame = useCallback(() => {

        let countryData = (geoData.features as unknown as CountryFeature[])
            .filter((obj: CountryFeature) => ['Country', 'Sovereign country', 'Disputed', 'Indeterminate'].includes(obj.properties.type))

        const randomOptions = getRandomOptions(countryData, settings.difficulty)

        setOptions(randomOptions)
        setCorrectOption(randomElement(randomOptions))
    }, [geoData.features, settings.difficulty, getRandomOptions])



    const onSubmit = useCallback(async (isCorrect: boolean) => {
        if (isCorrect) {
            await actions.onCorrectAnswer()
        } else {
            await actions.onWrongAnswer()
        }
    }, [actions])

    // Function to be called when Quiz component is ready for next question
    const onQuizComplete = useCallback(() => {
        startGame()
        actions.resetGame()
    }, [startGame, actions])

    // Handle auth modal close (when user clicks "Continue without login")
    const handleAuthModalClose = useCallback(() => {
        setShowAuthModal(false)
        setHasDeclinedAuth(true)
    }, [])

    // Handle when user authenticates during game - migrate current progress
    const handleAuthSuccess = useCallback(async () => {
        if (!user) return

        try {
            // Save current session progress using the shared hook's method
            await gameProgress.autoSaveProgress()

            // Also migrate any temporary progress that might exist
            await gameProgressService.migrateTempProgress(user)
        } catch (error) {
            console.error('Failed to save progress after authentication:', error)
        }
    }, [user, gameProgress])

    if (geoData && options.length) {
        return (
            <QuizLayout
                menuComponent={<MainMenu />}
                gameAreaComponent={
                    <Globe
                        geoData={geoData.features as unknown as CountryFeature[]}
                        selectedCountry={correctOption?.name ?? ''}
                        showPin={settings.showPin}
                        showZoomButtons={settings.showZoomButtons}
                        showBorders={settings.showBorders}
                    />
                }
                quizComponent={
                    <Quiz
                        showFlags
                        disabled={disabled}
                        options={options.map(x => ({ code: x.code, name: x.translatedName }))}
                        correctOption={correctOption?.translatedName ?? ''}
                        onSubmit={onSubmit}
                        onComplete={onQuizComplete}
                    />
                }
                scoreComponent={<Score correctScore={correctScore} wrongScore={wrongScore} />}
                showOfflineIndicator={true}
                showSaveIndicator={true}
                isSaving={gameProgress.isSaving}
                saveError={gameProgress.saveError}
                additionalContent={
                    <AuthModal
                        open={showAuthModal}
                        onClose={handleAuthModalClose}
                    />
                }
            />
        )
    }
    return (
        <QuizLayout
            menuComponent={<MainMenu />}
            gameAreaComponent={<div />}
            isLoading={true}
            loadingMessage="Loading..."
        />
    )
})