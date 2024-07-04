import { useEffect, useState } from "react"
import { defaultSettings } from "../Common/defaults"
import { GeoPermissibleObjects, shuffle } from "d3"
import { Map } from "./Map"
import { CountryOption } from "../Common/types"
import { Score } from "../CountryQuiz/Score"
import { Quiz } from "../Quiz/Quiz"
import { randomElement, shuffleArray } from "../Common/utils"
import { CountryMainMenu } from "../CountryQuiz/CountryMainMenu"

const StateQuiz = () => {

    const OPTIONS_SIZE = 3
    const [geoData, setGeoData] = useState<GeoPermissibleObjects[] | null>(null)
    const [settings, setSettings] = useState(defaultSettings)
    const [disabled, setDisabled] = useState(false)
    const [options, setOptions] = useState<CountryOption[]>([])
    const [correctOption, setCorrectOption] = useState<CountryOption>()
    const [correctScore, setCorrectScore] = useState(0)
    const [wrongScore, setWrongScore] = useState(0)

    useEffect(() => {

        const fetchData = async () => {
            try {
                const response = await fetch(`${process.env.PUBLIC_URL}/us.json`)
                const data = await response.json()
                setGeoData(data.features)

                //setCountries(data.features.map((f: ExtendedFeature) => f.properties!.name))
            } catch (error) {
                console.error('Error fetching country data:', error)
            }
        }
        fetchData()

        const savedSettings = localStorage.getItem('countryQuizSettings')
        if (savedSettings) {
            setSettings(JSON.parse(savedSettings))
        }

    }, [])

    useEffect(() => {
        startGame()
    }, [geoData, settings])

    const getRandomOptions = (data: GeoPermissibleObjects[]) => {
        const states = data.map((state: any) => ({
            code: state.properties.STATE,
            name: state.properties.NAME,
        }))

        return shuffleArray(states).slice(0, OPTIONS_SIZE)
    }

    const startGame = () => {
        if (!geoData) {
            return
        }
        const randomOptions = getRandomOptions(geoData!)
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
                    geoData={geoData}
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