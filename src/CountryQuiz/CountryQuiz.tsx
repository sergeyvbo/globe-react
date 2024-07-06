import { ExtendedFeatureCollection, GeoPermissibleObjects } from "d3"
import { useState, useEffect } from "react"
import { Globe } from "../Globe/Globe"
import { Quiz } from "../Quiz/Quiz"
import { Score } from "./Score"
import { MainMenu } from "../MainMenu/MainMenu"
import { getSettings, randomElement, shuffleArray } from "../Common/utils"
import { CountryFlagData, CountryOption, Difficulty } from "../Common/types"
import geoJson from '../Common/GeoData/geo.json'
import flagJson from '../Common/GeoData/countryCodes2.json'

type RegionType = 'continent' | 'region_un' | 'subregion' | 'region_wb' | 'world'

const CountryQuiz = () => {

    const OPTIONS_SIZE = 3



    const geoData = geoJson as ExtendedFeatureCollection
    const flags = flagJson as CountryFlagData[]

    const settings = getSettings()

    const [correctScore, setCorrectScore] = useState(0)
    const [wrongScore, setWrongScore] = useState(0)
    const [options, setOptions] = useState<CountryOption[]>([])
    const [correctOption, setCorrectOption] = useState<CountryOption>()
    const [disabled, setDisabled] = useState(false)


    useEffect(() => {
        startGame()
    }, [])

    const startGame = () => {

        let countryData = geoData.features
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
                <MainMenu />
                <Globe
                    geoData={geoData.features}
                    selectedCountry={correctOption?.name ?? ''}
                    showPin={settings.showPin}
                    showZoomButtons={settings.showZoomButtons}
                    showBorders={settings.showBorders}
                />
                <Quiz
                    showFlags
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