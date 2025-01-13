import { Box, Typography, Button } from '@mui/material';
import { useState, useEffect } from 'react';

interface updateCheckerProps {
    onNavigate: () => void;
}

function UpdateChecker({onNavigate}: updateCheckerProps) {
    const [status, setStatus] = useState("idle");
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        window.electron.on('update-stauts', (_event: any, data: any) => {
            setStatus(data.status)
            if(data.progress) setProgress(data.progress)
        });

        return () => {
            window.electron.removeAllListener('update-status')
        }
    }, []);

    const checkForUpdates = async () => {
        const response = await window.electron.invoke('check-for-updates');
        console.log(response)
    }

    const quitAndInstall = () => {
        window.electron.invoke('quit-and-install')
    }

    return(
        <div className='home'>
            <Box>
                <Button onClick={onNavigate}>
                    Back to MainMenu
                </Button>

                <Typography variant='h1'>
                    Auto-Updater
                </Typography>
                <Typography variant='h3'>
                    Status: {status}
                </Typography>

                {status === 'downloading' && (
                    <Typography>
                        Progress: {progress.toFixed(2)}%
                    </Typography>
                )}

                <Button onClick={checkForUpdates} disabled={status === 'checking'}>
                    Check for Updates
                </Button>

                {status === 'downloaded' && (
                    <Button onClick={quitAndInstall}>
                        Install Update
                    </Button>
                )}
            </Box>

        </div>
        
    )
}

export default UpdateChecker;