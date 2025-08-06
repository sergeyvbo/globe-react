import { useState, useEffect } from "react"
import './Quiz.css'
import { Button, Grid2, Typography } from "@mui/material"
import { FlagImage } from '../Common/utils/flagUtils'


interface Props {
    showFlags?: boolean
    disabled: boolean
    options: { code: string, name: string }[]
    correctOption: string
    onSubmit: (isCorrect: boolean) => void
    onComplete?: () => void
}

const Quiz = (props: Props) => {
    const {
        showFlags,
        disabled,
        options,
        correctOption,
        onSubmit,
        onComplete } = props
    const [showResult, setShowResult] = useState(false)
    const [selectedOption, setSelectedOption] = useState<string | null>(null)
    const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false)
    const [canContinue, setCanContinue] = useState(false)

    // Reset result state when new question loads (options change)
    useEffect(() => {
        if (!showResult && !isAnswerSubmitted) {
            setSelectedOption(null)
            setCanContinue(false)
        }
    }, [options, showResult, isAnswerSubmitted])

    // Handle result display with max 2 second timeout
    useEffect(() => {
        if (showResult) {
            // Auto-continue after 2 seconds maximum
            const maxTimer = setTimeout(() => {
                proceedToNext()
            }, 2000)

            return () => clearTimeout(maxTimer)
        }
    }, [showResult])

    const proceedToNext = (): void => {
        setShowResult(false)
        setSelectedOption(null)
        setIsAnswerSubmitted(false)
        setCanContinue(false)
        onComplete?.()
    }

    const onBtnClick = (option: string): void => {
        // If showing results and user clicks, proceed to next question
        if (showResult && canContinue) {
            proceedToNext()
            return
        }

        // If already answered or disabled, ignore
        if (disabled || isAnswerSubmitted) return

        console.log('Answer selected:', option, 'Correct:', correctOption, 'Is correct:', option === correctOption)

        setSelectedOption(option)
        setShowResult(true)
        setIsAnswerSubmitted(true)

        // Allow continuing after a short delay to ensure visual feedback is seen
        setTimeout(() => {
            setCanContinue(true)
            onSubmit(option === correctOption)
        }, 300) // Минимальная задержка для визуализации
    }

    const buttonResultClass = (option: string): string => {
        if (!showResult || !selectedOption) {
            return ''
        }
        return option === correctOption ? "Quiz-button-success" : "Quiz-button-failure"
    }

    return (
        <Grid2 container className="Quiz-container" spacing={1} >
            {options.map((option, index) => {
                return (
                    <Grid2 size={{ xs: 4 }} key={index}>
                        <Button
                            disabled={disabled && !canContinue}
                            variant="contained"
                            className={`Quiz-button ${buttonResultClass(option.name)}`}
                            onClick={() => onBtnClick(option.name)}
                            startIcon={showFlags ? <FlagImage countryCode={option.code} size="20x15" alt={option.code} /> : null}
                            style={{
                                opacity: (showResult && selectedOption && selectedOption !== option.name && option.name !== correctOption) ? 0.5 : 1,
                                transform: (showResult && selectedOption === option.name && option.name === correctOption) ? 'scale(1.05)' : 'scale(1)',
                                transition: 'all 0.3s ease-in-out',
                                cursor: (showResult && canContinue) ? 'pointer' : 'default'
                            }}
                        >
                            <Typography>
                                {
                                    option.name
                                }
                            </Typography>
                        </Button>
                    </Grid2>
                )
            })}
        </Grid2>
    )
}



export { Quiz }