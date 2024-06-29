import { GeoPermissibleObjects } from "d3"
import { useState, useEffect } from "react"
import { Globe } from "../Globe/Globe"
import { Quiz } from "../Quiz/Quiz"
import { Score } from "./Score"
import { CountryQuizSettings, MainMenu } from "../MainMenu/MainMenu"

type RegionType = 'continent' | 'region_un' | 'subregion' | 'region_wb'

type CountryOption = {
    name: string,
    translatedName: string,
}

const CountryQuiz = () => {

    const OPTIONS_SIZE = 3

    const defaultSettings: CountryQuizSettings = {
        language: 'en',
        showPin: false,
        difficulty: 'medium',
        showZoomButtons: true,
        showBorders: true,
        showSovereignCountries: true,
        showDisputed: true,
        showOthers: true,
    }

    const [geoData, setGeoData] = useState<GeoPermissibleObjects[] | null>(null)
    const [correctScore, setCorrectScore] = useState(0)
    const [wrongScore, setWrongScore] = useState(0)
    //const [countries, setCountries] = useState<string[]>([])
    const [options, setOptions] = useState<CountryOption[]>([])
    const [correctOption, setCorrectOption] = useState<CountryOption>()
    const [regionType, setRegionType] = useState<RegionType>('continent')
    const [disabled, setDisabled] = useState(false)

    const [settings, setSettings] = useState(defaultSettings)

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

        const savedSettings = localStorage.getItem('countryQuizSettings')
        if (savedSettings) {
            setSettings(JSON.parse(savedSettings))
        }

    }, [])

    useEffect(() => {
        startGame()
    }, [geoData, settings])

    const startGame = () => {
        const language = settings && settings.language
        if (!geoData) {
            return
        }
        const random = (max: number) => Math.floor(Math.random() * max)
        const randomElement = (arr: any[]) => arr[random(arr.length)]

        // get distinct regions by regionType


        // const types = Array.from(new Set(geoData.map((obj: any) => obj.properties['type'] as string)))
        // const subunits = Array.from(new Set(geoData.map((obj: any) => obj.properties['subunit'] as string)))
        // const geounits = Array.from(new Set(geoData.map((obj: any) => obj.properties['geounit'] as string)))
        // const sovereignts = Array.from(new Set(geoData.map((obj: any) => obj.properties['sovereignt'] as string)))
        // const brk_groups = Array.from(new Set(geoData.map((obj: any) => obj.properties['brk_group'] as string)))

        const countryData = geoData
            .filter((obj: any) => ['Sovereign country', 'Disputed', 'Indeterminate'].includes(obj.properties['type']))

        let regions = Array.from(new Set(countryData.map((obj: any) => obj.properties[regionType] as string)))
        regions = regions.filter(x => x != 'Seven seas (open ocean)')
        const randomRegion = randomElement(regions)

        const countryNameField = language ? 'name_' + language : 'name'
        const countries = countryData
            .filter((obj: any) => obj.properties[regionType] === randomRegion)
            .map((country: any) => ({ name: country.properties.name, translatedName: country.properties[countryNameField] }))

        const optionsSet = new Set<CountryOption>();
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
        setDisabled(true)
        setTimeout(() => {
            startGame()
            setDisabled(false)
        }, 2000);
    }

    if (geoData && options.length) {
        return (
            <div >
                <MainMenu settings={settings} setSettings={setSettings} /> { }
                <Globe
                    geoData={geoData}
                    selectedCountry={correctOption?.name ?? ''}
                    showPin={settings.showPin}
                    showZoomButtons={settings.showZoomButtons}
                    showBorders={settings.showBorders}
                />
                <Quiz
                    disabled={disabled}
                    options={options.map(x => x.translatedName)}
                    correctOption={correctOption?.translatedName ?? ''}
                    onSubmit={onSubmit} />
                <Score correctScore={correctScore} wrongScore={wrongScore} />
            </div>
        )
    }
    return <p> Loading...</p>
}

export { CountryQuiz }