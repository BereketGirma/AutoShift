import { Box, Typography, Button } from '@mui/material';
import { useState, useEffect } from 'react';

interface updateCheckerProps {
    onNavigate: () => void;
}

function UpdateChecker({onNavigate}: updateCheckerProps) {
    const [status, setStatus] = useState("idle");
    const [progress, setProgress] = useState(0);

    // let platform: string | null = null;
    
    useEffect(() => {
        // window.electron.invoke('get-platform', (_event: any, response: any) => {
        //     console.log('Work')
        //     platform = response.platform
        // })

        window.electron.on('update-status', (_event: any, data: any) => {
            console.log("Working:",data)
            setStatus(data.status)
            if(data.progress) setProgress(data.progress);
        });
            
        return () => {
            window.electron.removeAllListener('update-status');
        };
    }, []);

    const checkForUpdates = async () => {
        setStatus('Checking for updates...')
        const response = await window.electron.invoke('check-for-updates');
        console.log(response)
    }

    const quitAndInstall = async () => {
        console.log('Quit and Install requested')
        const response = await window.electron.invoke('quit-and-install')
        if(response.success){
            console.log('progressing to install')
        } else {
            console.log('Failed to quit and install:',response)
        }
    }

    const startDownload = async () => {
        const response = await window.electron.invoke('start-download');
        if(response.success){
            console.log('Download Started successfully');
        } else {
            console.log("HMM WHY NO WORK",response)
            console.error('Failed to start download:', response.error)
        }
    }

    //For MacOS devices
    // const openReleasePage = () => {
    //     console.log(platform)
    //     const url = 'https://github.com/BereketGirma/AutoShift/releases'
    //     window.electron.invoke('open-external', url)
    // }

    return(
        <div className='home'>
            <Box>
                <Button onClick={onNavigate}>
                    Back to MainMenu
                </Button>

                    <Typography variant='body1' color='black'>
                        Update app from web
                    </Typography>

                {status === 'downloading' && (
                    <Typography color='black'>
                        Progress: {(progress * 100).toFixed(2)}%
                    </Typography>
                )}

                <Button onClick={checkForUpdates} variant='contained'>
                    Check for Updates
                </Button>

                {status === 'update-available' && (
                    <Button onClick={startDownload} variant='contained'>
                        Download Update
                    </Button>
                )}

                {status === 'downloaded' && (
                    <Button onClick={quitAndInstall} variant='contained'>
                        Install Update
                    </Button>
                )}

                {status === 'no-updates' && (
                    <Typography variant='body1'>
                        No Updates available. Your app is up to date!
                    </Typography>
                )}

                {status === 'error' && (
                    <Typography variant='body1' color='error'>
                        An error occured while checking for updates. Please try again later.
                    </Typography>
                )}
            </Box>

        </div>
    )
}

export default UpdateChecker;