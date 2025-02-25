import { Box, List, Typography, Button, ListItem, Paper, IconButton, Tooltip } from '@mui/material';
import { useState, useEffect } from 'react';
import LaunchIcon from '@mui/icons-material/Launch'
// import FileDownloadIcon from '@mui/icons-material/FileDownload';
import LoopIcon from '@mui/icons-material/Loop'
import UpdateModal from './UpdateModal';

interface updateCheckerProps {
    onNavigate: () => void;
}

function UpdateChecker({onNavigate}: updateCheckerProps) {
    const [isMac, setIsMac] = useState<boolean>(false);
    const [spinning, setSpinning] = useState<boolean>(false);
    const [modalOpen, setModalOpen] = useState<boolean>(false);
    
    
    const updateList = [
        {
            version: '1.1.0 - Latest',
            released: '2/24/2025',
            url: 'https://github.com/BereketGirma/AutoShift/releases/tag/Latest'
        },
        {
            version: '1.0.0 - Beta',
            released: '1/25/2025',
            url: 'https://github.com/BereketGirma/AutoShift/releases/tag/AutoShift-v1.0-Beta'
        },
    ]

    const openExternalLink = (url: string) => {
        window.electron.invoke('open-external-link', url);
    }
    
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
       
    }, []);

    const checkForUpdates = async () => {
        // setStatus('Checking for updates...')
        const response = await window.electron.invoke('check-for-updates');
        console.log(response)

        setSpinning(true)
        await new Promise((resolve) => setTimeout(resolve, 500))
        setSpinning(false)

        setModalOpen(true)
    }

    const handleCloseModal = () => {
        setModalOpen(false)
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

                        {!isMac && 
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
                                        {/* <Tooltip title="Download">
                                            <IconButton color='primary'>
                                                <FileDownloadIcon />
                                            </IconButton>
                                        </Tooltip> */}
                                        
                                        <Tooltip title="Open link">
                                            <IconButton color='primary' onClick={() => openExternalLink(update.url)}>
                                                <LaunchIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                            </ListItem>
                        )}
                    </List>  
                </Box>

                <UpdateModal open={modalOpen} onClose={handleCloseModal}></UpdateModal>
            </Paper>
    )
}

export default UpdateChecker;