import { useState } from "react"
import './Quiz.css'
import { Button } from "@mui/material"
import { blue } from '@mui/material/colors'


interface Props {
    question: string
    options: string[]
    correctOption: string
    onSubmit: (isCorrect: boolean) => void
}

const Quiz = (props: Props) => {
    const { question, options, correctOption, onSubmit } = props
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
            {question && <h3>{question}</h3>}
            {options.map((option, index) => {
                return (
                    // <button key={index} className={`Quiz-button ${buttonResultClass(option)}`} onClick={() => onBtnClick(option)}>{option}</button>
                    <Button
                        key={index}
                        variant="contained"
                        className={`Quiz-button ${buttonResultClass(option)}`}
                        onClick={() => onBtnClick(option)}
                    >
                        {option}
                    </Button>
                )
            })}
        </div>
    )
}

export { Quiz }