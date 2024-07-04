import { Settings, Public } from "@mui/icons-material"
import { AppBar, Toolbar, IconButton, Button } from "@mui/material"

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
                <Button
                    size='large'
                    color='primary'
                    aria-label='states'
                    href='/globe-react/#/states'>
                    USA
                </Button>
            </Toolbar>
        </AppBar>
    )
}

export { FlagMainMenu }