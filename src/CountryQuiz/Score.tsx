interface Props {
    correctScore: number,
    wrongScore: number
}
const Score = ({ correctScore, wrongScore }: Props) => {
    return (
        <div className="CountryQuiz-score">
            <div className="CountryQuiz-scorebackground">
                Correct: <span className="CountryQuiz-success">{correctScore}</span>  Wrong: <span className="CountryQuiz-failure">{wrongScore}</span>
            </div>
        </div>
    )
}

export { Score }