import { Settings, Public, Flag } from "@mui/icons-material"
import { AppBar, Toolbar, IconButton } from "@mui/material"

const FlagMainMenu = () => {
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
            </Toolbar>
        </AppBar>
    )
}

export { FlagMainMenu }