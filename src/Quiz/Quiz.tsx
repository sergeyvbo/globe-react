import { useState, useEffect } from "react"
import './Quiz.css'
import { Button, Grid, Typography } from "@mui/material"


interface Props {
    showFlags?: boolean
    disabled: boolean
    options: { code: string, name: string }[]
    correctOption: string
    onSubmit: (isCorrect: boolean) => void
}

const Quiz = (props: Props) => {
    const {
        showFlags,
        disabled,
        options,
        correctOption,
        onSubmit, } = props
    const [showResult, setShowResult] = useState(false)
    const [selectedOption, setSelectedOption] = useState<string | null>(null)
    const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false)

    // Reset result state when new question loads (options change)
    // But only if we're not currently showing results
    useEffect(() => {
        if (!showResult && !isAnswerSubmitted) {
            setSelectedOption(null)
        }
    }, [options, showResult, isAnswerSubmitted])

    // Handle result display timeout - longer than parent component timeout
    useEffect(() => {
        if (showResult) {
            const timer = setTimeout(() => {
                setShowResult(false)
                setSelectedOption(null)
                setIsAnswerSubmitted(false)
            }, 3000)
            return () => clearTimeout(timer)
        }
    }, [showResult])

    const onBtnClick = (option: string) => {
        if (disabled || showResult || isAnswerSubmitted) return // Prevent multiple clicks
        
        console.log('Answer selected:', option, 'Correct:', correctOption, 'Is correct:', option === correctOption)
        
        setSelectedOption(option)
        setShowResult(true)
        setIsAnswerSubmitted(true)
        
        // Small delay to ensure visual feedback is shown before calling onSubmit
        setTimeout(() => {
            onSubmit(option === correctOption)
        }, 150) // Увеличил задержку для лучшей визуализации
    }

    const buttonResultClass = (option: string) => {
        if (!showResult || !selectedOption) {
            return ''
        }
        return option === correctOption ? "Quiz-button-success" : "Quiz-button-failure"
    }

    return (
        <Grid container className="Quiz-container" spacing={1} >
            {options.map((option, index) => {
                return (
                    <Grid item xs={4} key={index}>
                        <Button
                            disabled={disabled || showResult}
                            variant="contained"
                            className={`Quiz-button ${buttonResultClass(option.name)}`}
                            onClick={() => onBtnClick(option.name)}
                            startIcon={showFlags ? <img alt={option.code} src={`https://flagcdn.com/20x15/${option.code}.png`} /> : null}
                            style={{
                                opacity: (showResult && selectedOption && selectedOption !== option.name && option.name !== correctOption) ? 0.5 : 1,
                                transform: (showResult && selectedOption === option.name && option.name === correctOption) ? 'scale(1.05)' : 'scale(1)',
                                transition: 'all 0.3s ease-in-out'
                            }}
                        >
                            <Typography>
                                {option.name}
                            </Typography>
                        </Button>
                    </Grid>
                )
            })}
        </Grid>
    )
}



export { Quiz }