import React, { useEffect, useState, useCallback } from 'react'
import { Button, Grid2, Box, Stack } from '@mui/material'

import { CountryFlagData } from '../Common/types'
import { shuffleArray } from '../Common/utils'
import { useAuth } from '../Common/Auth/AuthContext'
import { useBaseQuiz } from '../Common/Hooks/useBaseQuiz'
import { FlagImage } from '../Common/utils/flagUtils'
import { FlagMainMenu } from './FlagMainMenu'
import { Score } from '../CountryQuiz/Score'
import { QuizLayout } from '../Common/QuizLayout'

import flagJson from '../Common/GeoData/countryCodes2.json'
import './FlagQuiz.css'

type Match = {
    flag: string;
    country: string;
}

type ButtonColor = "inherit" | "success" | "primary" | "secondary" | "error" | "info" | "warning" | undefined

export const FlagQuiz = React.memo(() => {
    const OPTIONS_LENGTH = 5

    const { user, isAuthenticated } = useAuth()

    // Use shared base quiz hook for common functionality
    const {
        correctScore,
        wrongScore,
        actions,
        gameProgress
    } = useBaseQuiz({
        gameType: 'flags',
        isAuthenticated,
        user
    })

    const [countries, setCountries] = useState<CountryFlagData[]>([])
    const [flags, setFlags] = useState<string[]>([])
    const [selectedFlag, setSelectedFlag] = useState<string | null>(null)
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
    const [matches, setMatches] = useState<Match[]>([])
    const [error, setError] = useState<Match>()

    const data = flagJson as CountryFlagData[]

    useEffect(() => {
        startGame(data)
    }, [])

    const startGame = useCallback((countryList: CountryFlagData[]) => {
        setMatches([])
        setError(undefined)
        const randomCountries = shuffleArray(countryList).slice(0, OPTIONS_LENGTH)
        setCountries(randomCountries)
        setFlags(shuffleArray(randomCountries.map(x => x.code)))
    }, [])

    const isMatch = useCallback((code: string): boolean => {
        return matches.some(x => (x.flag === code || x.country === code))
    }, [matches])

    const checkMatch = useCallback(async (match: Match) => {
        if (countries.find(x => x.code === match.flag && x.name === match.country)) {
            setMatches([...matches, match])
            // Manually update scores without using shared actions that disable buttons
            actions.onCorrectAnswer()
            // Reset disabled state immediately for FlagQuiz since it allows multiple matches
            setTimeout(() => actions.resetGame(), 0)
        }
        else {
            // Manually update scores without using shared actions that disable buttons
            actions.onWrongAnswer()
            // Reset disabled state immediately for FlagQuiz since it allows multiple matches
            setTimeout(() => actions.resetGame(), 0)
            setError(match)
            setTimeout(() => {
                setError(undefined)
            }, 1000)
        }
    }, [countries, matches, actions])

    const handleFlagClick = useCallback((code: string) => {
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
    }, [isMatch, selectedFlag, selectedCountry, checkMatch]);

    const handleCountryClick = useCallback((name: string) => {
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
    }, [isMatch, selectedCountry, selectedFlag, checkMatch]);

    const getFlagColor = useCallback((code: string): ButtonColor => {
        if (isMatch(code)) {
            return 'success'
        }
        if (error && error.flag == code) {
            return 'error'
        }
        return 'primary'
    }, [isMatch, error])

    const getCountryColor = useCallback((country: string): ButtonColor => {
        if (isMatch(country)) {
            return 'success'
        }
        if (error && error.country == country) {
            return 'error'
        }
        return 'primary'
    }, [isMatch, error])

    const handleContinue = useCallback(() => {
        startGame(data)
        actions.resetGame()
    }, [startGame, data, actions])

    if (countries.length && flags.length) {
        return (
            <QuizLayout
                menuComponent={<FlagMainMenu />}
                gameAreaComponent={
                    <Box
                        height={'90dvh'}
                        width={'100%'}
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        justifyContent="center"
                    >
                        <Grid2 container spacing={2} >
                            <Grid2 size={6}>
                                <Stack className='flag-stack' spacing={2}>
                                    {flags.map(flag => (
                                        <Button
                                            key={flag}
                                            className='flag-button'
                                            variant={(selectedFlag === flag || isMatch(flag)) ? 'contained' : 'outlined'}
                                            color={getFlagColor(flag)}
                                            startIcon={<FlagImage countryCode={flag} size="64x48" alt={flag} />}
                                            onClick={() => handleFlagClick(flag)}
                                            disableElevation={isMatch(flag)}
                                        />
                                    ))}
                                </Stack>
                            </Grid2>
                            <Grid2 size={6}>
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
                            </Grid2>
                        </Grid2>
                        {OPTIONS_LENGTH === matches.length && (
                            <Button 
                                className='continue-button' 
                                onClick={handleContinue} 
                                variant="contained"
                                style={{
                                    marginTop: '20px'
                                }}
                            >
                                Продолжить
                            </Button>
                        )}
                    </Box>
                }
                scoreComponent={<Score correctScore={correctScore} wrongScore={wrongScore} />}
                showOfflineIndicator={true}
                showSaveIndicator={true}
                isSaving={gameProgress.isSaving}
                saveError={gameProgress.saveError}
            />
        )
    }
    
    return (
        <QuizLayout
            menuComponent={<FlagMainMenu />}
            gameAreaComponent={<div />}
            isLoading={true}
            loadingMessage="Loading flags..."
        />
    )
})
