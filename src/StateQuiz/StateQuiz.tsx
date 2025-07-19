import { useEffect, useState } from "react"
import { ExtendedFeatureCollection, GeoPermissibleObjects } from "d3"
import { Map } from "./Map"
import { CountryOption } from "../Common/types"
import { Score } from "../CountryQuiz/Score"
import { Quiz } from "../Quiz/Quiz"
import { getSettings, randomElement, shuffleArray } from "../Common/utils"
import { CountryMainMenu } from "../CountryQuiz/CountryMainMenu"
import { useAuth } from "../Common/Auth/AuthContext"
import { gameProgressService, GameSession } from "../Common/GameProgress/GameProgressService"
import geoJson from '../Common/GeoData/us.json'

const StateQuiz = () => {

    const OPTIONS_SIZE = 3

    const { user, isAuthenticated } = useAuth()

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

    // Save progress when user leaves
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (isAuthenticated && user && (correctScore > 0 || wrongScore > 0)) {
                saveGameSession()
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [isAuthenticated, user, correctScore, wrongScore, gameSession])

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
            
            await gameProgressService.saveGameProgress(user.id, 'states', sessionToSave)
            console.log('States quiz session saved:', sessionToSave)
        } catch (error) {
            console.error('Failed to save states quiz session:', error)
        }
    }

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

    if (geoData && options.length) {
        return (
            <>
                <CountryMainMenu />
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