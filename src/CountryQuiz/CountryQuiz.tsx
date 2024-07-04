import { GeoPermissibleObjects } from "d3"
import { useState, useEffect } from "react"
import { Globe } from "../Globe/Globe"
import { Quiz } from "../Quiz/Quiz"
import { Score } from "./Score"
import { CountryQuizSettings, Difficulty, MainMenu } from "../MainMenu/MainMenu"
import { randomElement, shuffleArray } from "../Common/utils"
import { defaultSettings } from "../Common/defaults"
import { CountryOption } from "../Common/types"

type RegionType = 'continent' | 'region_un' | 'subregion' | 'region_wb' | 'world'

const CountryQuiz = () => {

    const OPTIONS_SIZE = 3

    interface Country {
        code: string
        name: string
        name_ru?: string
    }

    const [geoData, setGeoData] = useState<GeoPermissibleObjects[] | null>(null)
    const [flags, setFlags] = useState<Country[]>([])
    const [correctScore, setCorrectScore] = useState(0)
    const [wrongScore, setWrongScore] = useState(0)
    //const [countries, setCountries] = useState<string[]>([])
    const [options, setOptions] = useState<CountryOption[]>([])
    const [correctOption, setCorrectOption] = useState<CountryOption>()
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

        const fetchFlags = async () => {
            try {
                const response = await fetch(`${process.env.PUBLIC_URL}/countryCodes2.json`)
                const countryCodes = await response.json()
                // const countryList = countryCodes.map(code => ({ code, name: countryCodes[code] }))
                setFlags(countryCodes)
            } catch (error) {
                console.error('Error fetching flag data:', error)
            }
        }
        fetchFlags()
    }, []);

    useEffect(() => {
        startGame()
    }, [geoData, settings])

    const startGame = () => {

        if (!geoData) {
            return
        }

        let countryData = geoData
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

        // const optionsSet = new Set<CountryOption>();
        // while (optionsSet.size < OPTIONS_SIZE && countries.length >= OPTIONS_SIZE) {
        //     const randomCountry = randomElement(countries)
        //     optionsSet.add(randomCountry)
        // }
        //const optionsArray = Array.from(optionsSet)
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

    if (geoData && options.length) {
        return (
            <div >
                <MainMenu settings={settings} setSettings={setSettings} />
                <Globe
                    geoData={geoData}
                    selectedCountry={correctOption?.name ?? ''}
                    showPin={settings.showPin}
                    showZoomButtons={settings.showZoomButtons}
                    showBorders={settings.showBorders}
                />
                <Quiz
                    disabled={disabled}
                    options={options.map(x => ({ code: x.code, name: x.translatedName }))}
                    correctOption={correctOption?.translatedName ?? ''}
                    onSubmit={onSubmit} />
                <Score correctScore={correctScore} wrongScore={wrongScore} />
            </div>
        )
    }
    return <p> Loading...</p>
}

export { CountryQuiz }