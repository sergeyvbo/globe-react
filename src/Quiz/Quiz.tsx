import { useState } from "react"
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
        <Grid container className="Quiz-container" spacing={1} >
            {options.map((option, index) => {
                return (
                    <Grid item xs={4} key={index}>
                        <Button
                            disabled={disabled}
                            variant="contained"
                            className={`Quiz-button ${buttonResultClass(option.name)}`}
                            onClick={() => onBtnClick(option.name)}
                            startIcon={showFlags ? <img alt={option.code} src={`https://flagcdn.com/20x15/${option.code}.png`} /> : null}

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