import { useEffect, useState } from "react"

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
        }, 1000);
        return option === correctOption ? "Quiz-button-success" : "Quiz-button-failure"
    }

    return (
        <div className="Quiz-container">
            <h3>{question}</h3>
            {options.map((option, index) => {
                return (
                    <button key={index} className={`Quiz-button ${buttonResultClass(option)}`} onClick={() => onBtnClick(option)}>{option}</button>
                )
            })}
        </div>
    )
}

export { Quiz }