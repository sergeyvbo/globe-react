import { useEffect, useState } from "react"
import { ExtendedFeatureCollection, GeoPermissibleObjects } from "d3"
import { Map } from "./Map"
import { CountryOption } from "../Common/types"
import { Score } from "../CountryQuiz/Score"
import { Quiz } from "../Quiz/Quiz"
import { getSettings, randomElement, shuffleArray } from "../Common/utils"
import { CountryMainMenu } from "../CountryQuiz/CountryMainMenu"
import geoJson from '../Common/GeoData/us.json'

const StateQuiz = () => {

    const OPTIONS_SIZE = 3

    const [disabled, setDisabled] = useState(false)
    const [options, setOptions] = useState<CountryOption[]>([])
    const [correctOption, setCorrectOption] = useState<CountryOption>()
    const [correctScore, setCorrectScore] = useState(0)
    const [wrongScore, setWrongScore] = useState(0)

    const geoData = geoJson as ExtendedFeatureCollection
    const settings = getSettings()

    useEffect(() => {
        startGame()
    }, [])

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