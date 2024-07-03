import { useEffect, useState } from 'react';
import { Button, Grid, Box, Stack } from '@mui/material';
import './FlagQuiz.css'
import { shuffleArray } from '../Common/utils';
import { FlagMainMenu } from './FlagMainMenu';
import { Score } from '../CountryQuiz/Score';

interface Country {
    code: string
    name: string
    name_ru?: string
}

type Match = {
    flag: string;
    country: string;
}

type ButtonColor = "inherit" | "success" | "primary" | "secondary" | "error" | "info" | "warning" | undefined

export const FlagQuiz = () => {
    const OPTIONS_LENGTH = 5

    const [data, setData] = useState<Country[]>([])
    const [countries, setCountries] = useState<Country[]>([])
    const [flags, setFlags] = useState<string[]>([])
    const [selectedFlag, setSelectedFlag] = useState<string | null>(null)
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
    const [matches, setMatches] = useState<Match[]>([])
    const [error, setError] = useState<Match>()
    const [correctScore, setCorrectScore] = useState(0)
    const [wrongScore, setWrongScore] = useState(0)

    useEffect(() => {

        const fetchData = async () => {
            try {
                const response = await fetch(`${process.env.PUBLIC_URL}/countryCodes2.json`)
                const countryCodes = await response.json()
                // const countryList = countryCodes.map(code => ({ code, name: countryCodes[code] }))
                setData(countryCodes)
                startGame(countryCodes)
            } catch (error) {
                console.error('Error fetching country data:', error)
            }
        }
        fetchData()
    }, []);

    const startGame = (countryList: Country[]) => {
        setMatches([])
        setError(undefined)
        const randomCountries = shuffleArray(countryList).slice(0, OPTIONS_LENGTH)
        setCountries(randomCountries)
        setFlags(shuffleArray(randomCountries.map(x => x.code)))
    }

    const handleFlagClick = (code: string) => {
        if (isMatch(code)) return
        if (selectedFlag === code) {
            setSelectedFlag(null)
            return
        }
        if (selectedCountry) {
            checkMatch({ flag: code, country: selectedCountry })
            setSelectedCountry(null);
            setSelectedFlag(null);
            return
        }
        setSelectedFlag(code);
    };

    const handleCountryClick = (name: string) => {
        if (isMatch(name)) return
        if (selectedCountry === name) {
            setSelectedCountry(null)
            return
        }
        if (selectedFlag) {
            checkMatch({ flag: selectedFlag, country: name })
            setSelectedCountry(null);
            setSelectedFlag(null);
            return
        }
        setSelectedCountry(name)
    };

    const checkMatch = (match: Match) => {
        if (countries.find(x => x.code === match.flag && x.name === match.country)) {
            setMatches([...matches, match])
            setCorrectScore(correctScore + 1)
        }
        else {
            setWrongScore(wrongScore + 1)
            setError(match)
            setTimeout(() => {
                console.log('reset error')
                setError(undefined)
            }, 1000)
        }
    }

    const isMatch = (code: string): boolean => {
        return matches.some(x => (x.flag === code || x.country === code))
    }

    const getFlagColor = (code: string): ButtonColor => {
        if (isMatch(code)) {
            return 'success'
        }
        if (error && error.flag == code) {
            return 'error'
        }
        return 'primary'
    }

    const getCountryColor = (country: string): ButtonColor => {
        if (isMatch(country)) {
            return 'success'
        }
        if (error && error.country == country) {
            return 'error'
        }
        return 'primary'
    }

    const handleContinue = () => {
        startGame(data)
    }

    return (
        <>
            <FlagMainMenu />
            <Box
                height={'90dvh'}
                width={'100%'}
                display="flex"
                alignItems="center"
            >
                <Grid container spacing={2} >
                    <Grid item xs={6}>
                        <Stack className='flag-stack' spacing={2}>
                            {flags.map(flag => (
                                <Button
                                    key={flag}
                                    className='flag-button'
                                    variant={(selectedFlag === flag || isMatch(flag)) ? 'contained' : 'outlined'}
                                    color={getFlagColor(flag)}
                                    startIcon={<img alt={flag} src={`https://flagcdn.com/64x48/${flag}.png`} />}
                                    onClick={() => handleFlagClick(flag)}
                                    disableElevation={isMatch(flag)}
                                />
                            ))}
                        </Stack>
                    </Grid>
                    <Grid item xs={6}>
                        <Stack className='country-stack' spacing={2}>
                            {countries.map(country => (
                                <Button
                                    key={country.name}
                                    className='country-button'
                                    variant={(selectedCountry === country.name || isMatch(country.code)) ? 'contained' : 'outlined'}
                                    color={getCountryColor(country.name)}
                                    onClick={() => handleCountryClick(country.name)}
                                    disableElevation={isMatch(country.code)}
                                >
                                    <h3>{country.name_ru}</h3>
                                </Button>
                            ))}
                        </Stack>
                    </Grid>
                </Grid>
            </Box>
            <Score correctScore={correctScore} wrongScore={wrongScore}></Score>
            {OPTIONS_LENGTH === matches.length && (
                <Button className='continue-button' onClick={handleContinue} variant="contained">
                    Продолжить
                </Button>
            )}</>
    )
}
