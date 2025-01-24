import { Box, List, Typography, Button, ListItem, Paper, IconButton, Tooltip, Modal, LinearProgress } from '@mui/material';
import { useState, useEffect } from 'react';
import LaunchIcon from '@mui/icons-material/Launch'
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import LoopIcon from '@mui/icons-material/Loop'

interface updateCheckerProps {
    onNavigate: () => void;
}

function UpdateChecker({onNavigate}: updateCheckerProps) {
    const [status, setStatus] = useState("idle");
    const [progress, setProgress] = useState(0);
    const [isMac, setIsMac] = useState<boolean>(false);
    const [spinning, setSpinning] = useState<boolean>(false);
    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);

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

        setSpinning(true)
        await new Promise((resolve) => setTimeout(resolve, 500))
        setSpinning(false)

        setModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsDownloading(false)
        setModalOpen(false)
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
        setIsDownloading(true)

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
                    <Box display={'flex'} justifyContent={'space-between'}>
                        <Button variant="contained" onClick={onNavigate} >
                            Back
                        </Button>

                        {isMac && 
                        <Tooltip title="Check For Updates">
                            <IconButton 
                                onClick={checkForUpdates} 
                                color='secondary' 
                                sx={{ 
                                    animation: spinning
                                        ? 'spin 0.5s ease-in-out'
                                        : 'none',  
                                }}
                            >
                                <LoopIcon color='secondary'/>
                            </IconButton>
                        </Tooltip>
                        }
                        
                    </Box>
                    
                    <Typography variant='h5' color='black'>
                        Version History
                    </Typography>
                </Box>

                

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
                                        <Tooltip title="Download">
                                            <IconButton color='primary'>
                                                <FileDownloadIcon />
                                            </IconButton>
                                        </Tooltip>
                                        
                                        <Tooltip title="Open link">
                                            <IconButton color='primary'>
                                                <LaunchIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                            </ListItem>
                        )}
                    </List>  

                                        
                </Box>

                
                {isMac ? (
                    <></>
                ) : (
                    <Paper>
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
                    </Paper>
                )}

                <Modal open={modalOpen} onClose={handleCloseModal}>
                    <Box 
                        display={'flex'}
                        flexDirection={'column'}
                        position={'absolute'}
                        alignItems={'center'}
                        justifyContent={'center'}
                        top={'50%'}
                        left={'50%'}
                        borderRadius={'0.5em'}
                        bgcolor={'background.paper'}
                        p={2}
                        gap={2}
                        width={'50%'}
                        maxWidth={'500px'}
                        height={'auto'}
                        textAlign={'center'}
                        sx={{
                            transform: 'translate(-50%, -50%)',
                        }}
                    >
                        <Box>
                            <Typography color='black' variant='h6'> 
                                    Update Available!
                                    
                            </Typography>

                            <Typography color='grey' variant='body2'>
                                Click 'Download' to start update download
                            </Typography>
                        </Box>
                        
                        <Box
                            display={'flex'}
                            flex={1}
                            flexDirection={'column'}
                            alignItems={'center'}
                            width={'100%'}
                            p={1}
                        >
                            {!isDownloading ? (
                                <Button onClick={startDownload} variant='contained'>
                                    Download
                                </Button>
                            ):(
                                <Box display={'flex'} alignItems={'center'} width={'100%'}>
                                    <Box width={'100%'} mr={1}>
                                        <LinearProgress color='secondary' variant='determinate' value={progress}/>
                                    </Box>
                                    
                                    <Box>
                                        <Typography color='grey' variant='body2'>
                                            {(progress * 10).toFixed(2)}%
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Modal>
            </Paper>
    )
}

export default UpdateChecker;