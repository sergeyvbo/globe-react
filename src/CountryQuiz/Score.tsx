import { getString } from "../Localization/strings"

interface Props {
    correctScore: number,
    wrongScore: number
}
const Score = ({ correctScore, wrongScore }: Props) => {
    return (
        <div className="CountryQuiz-score">
            <div className="CountryQuiz-scorebackground">
                {getString('correct')}: <span className="CountryQuiz-success">{correctScore}</span>  {getString('wrong')}: <span className="CountryQuiz-failure">{wrongScore}</span>
            </div>
        </div>
    )
}

export { Score }