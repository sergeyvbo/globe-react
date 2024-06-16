import { GeoPermissibleObjects } from "d3"
import { useState, useEffect } from "react"
import { Globe } from "../Globe/Globe"
import { Quiz } from "../Quiz/Quiz"
import { Score } from "./Score"

type RegionType = 'continent' | 'region_un' | 'subregion' | 'region_wb'

const CountryQuiz = () => {

    const OPTIONS_SIZE = 3

    const [geoData, setGeoData] = useState<GeoPermissibleObjects[] | null>(null)
    const [correctScore, setCorrectScore] = useState(0)
    const [wrongScore, setWrongScore] = useState(0)
    //const [countries, setCountries] = useState<string[]>([])
    const [options, setOptions] = useState<string[]>([])
    const [correctOption, setCorrectOption] = useState<string>('')
    const [regionType, setRegionType] = useState<RegionType>('subregion')

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`${process.env.PUBLIC_URL}/geo.json`)
                const data = await response.json()
                setGeoData(data.features)

                //setCountries(data.features.map((f: ExtendedFeature) => f.properties!.name))
            } catch (error) {
                console.error('Error fetching country data:', error)
            }
        }

        fetchData()
    }, [])

    useEffect(() => {
        startGame()
    }, [geoData])

    const startGame = () => {
        if (!geoData) {
            return
        }
        const random = (max: number) => Math.floor(Math.random() * max)
        const randomElement = (arr: any[]) => arr[random(arr.length - 1)]

        // get distinct regions by regionType
        const regions = Array.from(new Set(geoData.map((obj: any) => obj.properties[regionType] as string)))

        const randomRegion = randomElement(regions)

        const countries = geoData
            .filter((obj: any) => obj.properties[regionType] === randomRegion)
            .map((country: any) => country.properties.name)

        const optionsSet = new Set<string>();
        while (optionsSet.size < OPTIONS_SIZE) {
            const randomCountry = randomElement(countries)
            optionsSet.add(randomCountry)
        }
        const optionsArray = Array.from(optionsSet)
        setOptions(optionsArray)
        setCorrectOption(randomElement(optionsArray))
    }

    const onSubmit = (isCorrect: boolean) => {
        if (isCorrect) {
            setCorrectScore(correctScore + 1)
        }
        else {
            setWrongScore(wrongScore + 1)
        }
        setTimeout(() => {
            startGame()
        }, 1000);
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