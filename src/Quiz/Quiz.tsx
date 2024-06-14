interface Props {
    question: string
    options: string[]
    correctOption: string
    onSubmit: (isCorrect: boolean) => void
}

const Quiz = (props: Props) => {
    const { question, options, correctOption, onSubmit } = props

    return (
        <div className="Quiz">
            <h3>{question}</h3>
            <ul>
                {options.map((option, index) => {
                    return (
                        <li key={index}>
                            <button onClick={() => onSubmit(option === correctOption)}>{option}</button>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

export { Quiz }