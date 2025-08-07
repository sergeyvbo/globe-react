import React, { useCallback, useEffect, useState } from "react"
import { ExtendedFeatureCollection } from "d3"

import { CountryOption, StateFeature } from "../Common/types"
import { getSettings, randomElement, shuffleArray } from "../Common/utils"
import { useAuth } from "../Common/Auth/AuthContext"
import { useBaseQuiz } from "../Common/Hooks/useBaseQuiz"
import { Map } from "./Map"
import { Quiz } from "../Quiz/Quiz"
import { Score } from "../CountryQuiz/Score"
import { CountryMainMenu } from "../CountryQuiz/CountryMainMenu"
import { QuizLayout } from "../Common/QuizLayout"

import geoJson from '../Common/GeoData/us.json'

export const StateQuiz: React.FC = React.memo(() => {

    const OPTIONS_SIZE = 3

    const { user, isAuthenticated } = useAuth()

    // Use shared base quiz hook for common quiz functionality
    const {
        correctScore,
        wrongScore,
        disabled,
        actions,
        gameProgress
    } = useBaseQuiz({
        gameType: 'states',
        isAuthenticated,
        user
    })

    const [options, setOptions] = useState<CountryOption[]>([])
    const [correctOption, setCorrectOption] = useState<CountryOption>()

    const geoData = geoJson as ExtendedFeatureCollection
    const settings = getSettings()

    useEffect(() => {
        startGame()
    }, [])

    const getRandomOptions = useCallback((data: StateFeature[]): CountryOption[] => {
        const states = data.map((state: StateFeature) => ({
            code: state.properties.STATE,
            name: state.properties.NAME,
            translatedName: state.properties.NAME, // For states, use the same name as translated name
        }))

        return shuffleArray(states).slice(0, OPTIONS_SIZE)
    }, [])

    const startGame = useCallback((): void => {
        const randomOptions = getRandomOptions(geoData.features! as unknown as StateFeature[])
        setOptions(randomOptions)
        setCorrectOption(randomElement(randomOptions))
    }, [geoData.features, getRandomOptions])

    const onSubmit = useCallback(async (isCorrect: boolean) => {
        if (isCorrect) {
            await actions.onCorrectAnswer()
        } else {
            await actions.onWrongAnswer()
        }
    }, [actions])

    // Function to be called when Quiz component is ready for next question
    const onQuizComplete = useCallback((): void => {
        startGame()
        actions.resetGame()
    }, [startGame, actions])

    return (
        <QuizLayout
            menuComponent={<CountryMainMenu />}
            gameAreaComponent={
                geoData && options.length ? (
                    <Map
                        geoData={geoData.features as unknown as StateFeature[]}
                        selected={correctOption?.name ?? ''}
                    />
                ) : null
            }
            quizComponent={
                geoData && options.length ? (
                    <Quiz
                        showFlags={false}
                        disabled={disabled}
                        options={options.map(x => ({ code: x.code, name: x.name }))}
                        correctOption={correctOption?.name ?? ''}
                        onSubmit={onSubmit}
                        onComplete={onQuizComplete}
                    />
                ) : null
            }
            scoreComponent={
                geoData && options.length ? (
                    <Score correctScore={correctScore} wrongScore={wrongScore} />
                ) : null
            }
            showOfflineIndicator={true}
            showSaveIndicator={true}
            isSaving={gameProgress.isSaving}
            saveError={gameProgress.saveError}
            isLoading={!geoData || !options.length}
            loadingMessage="Loading..."
        />
    )
})
