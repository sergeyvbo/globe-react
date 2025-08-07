import React, { useState, useEffect, useCallback, useMemo } from "react"
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

const Quiz = React.memo((props: Props) => {
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

    const proceedToNext = useCallback((): void => {
        setShowResult(false)
        setSelectedOption(null)
        setIsAnswerSubmitted(false)
        setCanContinue(false)
        onComplete?.()
    }, [onComplete])

    const onBtnClick = useCallback((option: string): void => {
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
    }, [showResult, canContinue, disabled, isAnswerSubmitted, correctOption, onSubmit, proceedToNext])

    const buttonResultClass = useCallback((option: string): string => {
        if (!showResult || !selectedOption) {
            return ''
        }
        return option === correctOption ? "Quiz-button-success" : "Quiz-button-failure"
    }, [showResult, selectedOption, correctOption])

    // Memoize button styles to prevent recalculation on every render
    const getButtonStyle = useCallback((option: string) => ({
        opacity: (showResult && selectedOption && selectedOption !== option && option !== correctOption) ? 0.5 : 1,
        transform: (showResult && selectedOption === option && option === correctOption) ? 'scale(1.05)' : 'scale(1)',
        transition: 'all 0.3s ease-in-out',
        cursor: (showResult && canContinue) ? 'pointer' : 'default'
    }), [showResult, selectedOption, correctOption, canContinue])

    return (
        <Grid2 container className="Quiz-container" spacing={1} >
            {options.map((option, index) => {
                return (
                    <Grid2 size={{ xs: 4 }} key={index}>
                        <QuizButton
                            key={option.name}
                            option={option}
                            disabled={disabled && !canContinue}
                            showFlags={showFlags}
                            buttonResultClass={buttonResultClass(option.name)}
                            onBtnClick={onBtnClick}
                            buttonStyle={getButtonStyle(option.name)}
                        />
                    </Grid2>
                )
            })}
        </Grid2>
    )
})

// Memoized button component to prevent unnecessary re-renders
interface QuizButtonProps {
    option: { code: string, name: string }
    disabled: boolean
    showFlags?: boolean
    buttonResultClass: string
    onBtnClick: (option: string) => void
    buttonStyle: React.CSSProperties
}

const QuizButton: React.FC<QuizButtonProps> = React.memo(({
    option,
    disabled,
    showFlags,
    buttonResultClass,
    onBtnClick,
    buttonStyle
}) => {
    const handleClick = useCallback(() => {
        onBtnClick(option.name)
    }, [onBtnClick, option.name])

    const flagIcon = useMemo(() => 
        showFlags ? <FlagImage countryCode={option.code} size="20x15" alt={option.code} /> : null,
        [showFlags, option.code]
    )

    return (
        <Button
            disabled={disabled}
            variant="contained"
            className={`Quiz-button ${buttonResultClass}`}
            onClick={handleClick}
            startIcon={flagIcon}
            style={buttonStyle}
        >
            <Typography>
                {option.name}
            </Typography>
        </Button>
    )
})

export { Quiz }