import { useEffect, useState } from "react"
import { ExtendedFeatureCollection, GeoPermissibleObjects } from "d3"
import { Map } from "./Map"
import { CountryOption, StateFeature } from "../Common/types"
import { Score } from "../CountryQuiz/Score"
import { Quiz } from "../Quiz/Quiz"
import { getSettings, randomElement, shuffleArray } from "../Common/utils"
import { CountryMainMenu } from "../CountryQuiz/CountryMainMenu"
import { useAuth } from "../Common/Auth/AuthContext"
import { QuizLayout } from "../Common/QuizLayout"
import { useBaseQuiz } from "../Common/Hooks/useBaseQuiz"
import geoJson from '../Common/GeoData/us.json'

const StateQuiz = () => {

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

    const getRandomOptions = (data: StateFeature[]): Array<{code: string, name: string}> => {
        const states = data.map((state: StateFeature) => ({
            code: state.properties.STATE,
            name: state.properties.NAME,
        }))

        return shuffleArray(states).slice(0, OPTIONS_SIZE)
    }

    const startGame = (): void => {
        const randomOptions = getRandomOptions(geoData.features!)
        setOptions(randomOptions)
        setCorrectOption(randomElement(randomOptions))
    }

    const onSubmit = async (isCorrect: boolean) => {
        if (isCorrect) {
            await actions.onCorrectAnswer()
        } else {
            await actions.onWrongAnswer()
        }
    }

    // Function to be called when Quiz component is ready for next question
    const onQuizComplete = (): void => {
        startGame()
        actions.resetGame()
    }

    return (
        <QuizLayout
            menuComponent={<CountryMainMenu />}
            gameAreaComponent={
                geoData && options.length ? (
                    <Map
                        geoData={geoData.features}
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
}

export { StateQuiz }