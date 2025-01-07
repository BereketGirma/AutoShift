import { Typography } from "@mui/material"

const progressMessages = "Loading..."

function LoadingScreen() {
    return (
        <div className="home">
            <Typography color="black">
                {progressMessages}
            </Typography>
        </div>
    )
}

export default LoadingScreen