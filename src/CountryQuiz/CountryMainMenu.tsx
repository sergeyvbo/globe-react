import { Settings, Public, Flag } from "@mui/icons-material"
import { AppBar, Toolbar, IconButton, Button } from "@mui/material"

const CountryMainMenu = () => {
    return (
        <AppBar color='transparent' elevation={0}>
            <Toolbar>
                <IconButton
                    size='large'
                    edge='start'
                    color='primary'
                    aria-label='menu'
                    disabled
                >
                    <Settings />
                </IconButton>
                <IconButton
                    size='large'
                    edge='start'
                    color='primary'
                    aria-label='countries'
                    href='/globe-react/#/countries'
                >
                    <Public />
                </IconButton>
                <IconButton
                    size='large'
                    edge='start'
                    color='primary'
                    aria-label='flags'
                    href='/globe-react/#/flags'
                >
                    <Flag />
                </IconButton>
            </Toolbar>
        </AppBar>
    )
}

export { CountryMainMenu }