import { Box, List, Typography, Button, ListItem, Paper, IconButton } from '@mui/material';
import { useState, useEffect } from 'react';
import LaunchIcon from '@mui/icons-material/Launch'
import FileDownloadIcon from '@mui/icons-material/FileDownload';

interface updateCheckerProps {
    onNavigate: () => void;
}

function UpdateChecker({onNavigate}: updateCheckerProps) {
    const [status, setStatus] = useState("idle");
    const [progress, setProgress] = useState(0);
    const [isMac, setIsMac] = useState<boolean>(false);

    const updateList = [
        {
            version: '1.0.0',
            released: '1/20/2025',
            url: 'some url'
        },
        {
            version: '0.0.0',
            released: '1/20/2025',
            url: 'some url'
        },
    ]
    
    useEffect(() => {
        const getPlatform = async () => {
            try{
                const response = await window.electron.invoke('get-platform')
                if(response.platform.includes('mac')){
                    setIsMac(true)
                }
            } catch (error) {
                console.error('Error fetching platform', error)
            }
        }

        getPlatform();
       

        window.electron.on('update-status', (_event: any, data: any) => {
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

    return(
            <Paper
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    width: '100%',
                    overflow: 'hidden',
                    backgroundColor: 'white',
                    borderRadius: '5px',
                    textAlign:'center',
                    alignContent: 'center',
                    gap: '1em',
                    p: '1em'
                }}
            >
                <Box display={'flex'} flexDirection='column' gap={'2em'}>
                    <Box display={'flex'}>
                        <Button variant="contained" onClick={onNavigate} >
                            Back
                        </Button>
                    </Box>
                    
                    <Typography variant='h5' color='black'>
                        Version History
                    </Typography>
                </Box>

                
                {isMac ? (
                    <Box
                        border= {'1px solid #ddd'}
                        borderRadius={'0.5em'}
                        overflow={'auto'}
                    >
                        
                        <List sx={{ overflow: 'auto'}}>
                            {updateList.map((update, index) => 
                                <ListItem 
                                    key={index} 
                                    sx={{ 
                                        display: 'flex',
                                        borderBottom: '1px solid #ddd',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                        <Box>
                                            <Typography variant='body1' color='black' fontWeight='bold'>Version: {update.version}</Typography>
                                            <Typography variant='body2' color='black'>Released: {update.released}</Typography>
                                        </Box>

                                        <Box display='flex' gap={'1em'}>
                                            <IconButton color='primary'>
                                                <FileDownloadIcon />
                                            </IconButton>

                                            <IconButton color='primary'>
                                                <LaunchIcon />
                                            </IconButton>
                                        </Box>
                                        
                                </ListItem>
                            )}
                        </List>  

                                            
                    </Box>
                ) : (
                    <Box>
                        <Button onClick={checkForUpdates} variant='contained'>
                            Check for Updates
                        </Button>

                        {status === 'downloading' && (
                            <Typography color='black'>
                                Progress: {(progress * 10).toFixed(2)}%
                            </Typography>
                        )}

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
                )}
            </Paper>
    )
}

export default UpdateChecker;