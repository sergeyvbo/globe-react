import { ExtendedFeature, GeoPermissibleObjects, max } from "d3"
import { useState, useEffect } from "react"
import { Globe } from "../Globe/Globe"
import { Quiz } from "../Quiz/Quiz"
import { Score } from "./Score"

const CountryQuiz = () => {

    const OPTIONS_SIZE = 3

    const [geoData, setGeoData] = useState<GeoPermissibleObjects[] | null>(null)
    const [correctScore, setCorrectScore] = useState(0)
    const [wrongScore, setWrongScore] = useState(0)
    const [countries, setCountries] = useState<string[]>([])
    const [options, setOptions] = useState<string[]>([])
    const [correctOption, setCorrectOption] = useState<string>('')
    const [showSuccess, setShowSuccess] = useState(false)
    const [showFailure, setShowFailure] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`${process.env.PUBLIC_URL}/world.json`)
                const data = await response.json()
                setGeoData(data.features)

                setCountries(data.features.map((f: ExtendedFeature) => f.properties!.name))
            } catch (error) {
                console.error('Error fetching country data:', error)
            }
        }

        fetchData()
    }, [])

    useEffect(() => {
        startGame()
    }, [countries])

    const random = (max: number) => Math.floor(Math.random() * max)

    const startGame = () => {
        if (!countries.length) return
        const optionsSet = new Set<string>();
        while (optionsSet.size < OPTIONS_SIZE) {
            const randomCountry = countries[random(countries.length)]
            optionsSet.add(randomCountry)
        }
        const optionsArray = Array.from(optionsSet)
        setOptions(optionsArray)
        setCorrectOption(optionsArray[random(OPTIONS_SIZE)])
    }

    const onSubmit = (isCorrect: boolean) => {
        if (isCorrect) {
            setCorrectScore(correctScore + 1)
            setShowSuccess(true)
        }
        else {
            setWrongScore(wrongScore + 1)
            setShowFailure(true)
        }
        setTimeout(() => {
            setShowSuccess(false)
            setShowFailure(false)
            startGame()
        }, 1000)

    }

    if (geoData && options.length) {
        return (
            <div >
                <Globe
                    geoData={geoData}
                    selectedCountry={correctOption}
                />
                <Quiz
                    question={''}
                    options={options}
                    correctOption={correctOption}
                    onSubmit={onSubmit} />
                <Score correctScore={correctScore} wrongScore={wrongScore} />
            </div>
        )
    }
    return <p> Loading...</p>
}

export { CountryQuiz }