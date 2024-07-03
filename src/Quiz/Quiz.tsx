import { useState } from "react"
import './Quiz.css'
import { Button, styled } from "@mui/material"


interface Props {
    disabled: boolean
    options: { code: string, name: string }[]
    correctOption: string
    onSubmit: (isCorrect: boolean) => void
}

const Quiz = (props: Props) => {
    const {
        disabled,
        options,
        correctOption,
        onSubmit, } = props
    const [showResult, setShowResult] = useState(false)

    const onBtnClick = (option: string) => {
        setShowResult(true)
        onSubmit(option === correctOption)
    }

    const buttonResultClass = (option: string) => {
        if (!showResult) {
            return ''
        }
        setTimeout(() => {
            setShowResult(false)
        }, 2000);
        return option === correctOption ? "Quiz-button-success" : "Quiz-button-failure"
    }

    return (
        <div className="Quiz-container">
            {options.map((option, index) => {
                return (
                    // <button key={index} className={`Quiz-button ${buttonResultClass(option)}`} onClick={() => onBtnClick(option)}>{option}</button>
                    <StyledButton
                        disabled={disabled}
                        key={index}
                        variant="contained"
                        className={`Quiz-button ${buttonResultClass(option.name)}`}
                        onClick={() => onBtnClick(option.name)}
                        startIcon={<img alt={option.code} src={`https://flagcdn.com/20x15/${option.code}.png`} />}

                    >
                        {option.name}
                    </StyledButton>
                )
            })}
        </div>
    )
}

const StyledButton = styled(Button)({
    width: '33%',
    height: '60px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    fontSize: 'clamp(.8rem, 3vw, 2rem)',
    lineHeight: '1',
    overflowWrap: 'break-word',
    whiteSpace: 'normal',
    textOverflow: 'ellipsis',
})

export { Quiz }