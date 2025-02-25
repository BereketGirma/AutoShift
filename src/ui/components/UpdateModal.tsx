import React, { useEffect, useState } from 'react';
import {
    Button,
    Modal,
    Box,
    Typography,
    LinearProgress
} from '@mui/material';

//Interface to handle format
interface UpdateModalProps {
    open: boolean;
    onClose: () => void
}

const UpdateModal: React.FC<UpdateModalProps> = ({ open, onClose }) => {
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("checking-for-updates");
    const [description, setDescription] = useState("checking for updates...");

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
            return response
        } else {
            console.error('Failed to start download:', response.error)
        }
    }

    const handleCloseModal = () => {
        setDescription("checking for updates...");
        setIsDownloading(false)
        onClose()
    }

    useEffect(() => {
        window.electron.on('update-status', (_event: any, data: any) => {
            setStatus(data.status)
            if(data.progress) setProgress(data.progress);

            if(data.status === 'update-available') setDescription('Update Available!')
            if(data.status === 'downloading') setDescription('Downloading...')
            if(data.status === 'downloaded') setDescription('Update Downloaded! Waiting to install...')
            if(data.status === 'no-updates') setDescription('')
            if(data.status === 'error') setDescription('')

        });
            
        return () => {
            window.electron.removeAllListener('update-status');
        };
    })

    return (
        <Modal open={open} onClose={handleCloseModal}>
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
                        Update Checker
                    </Typography>

                    <Typography color='grey' variant='body2'>
                        {description}
                    </Typography>
                </Box>
                
                <Box
                    display={'flex'}
                    flex={1}
                    flexDirection={'column'}
                    alignItems={'center'}
                    width={'100%'}
                    p={1}
                    gap={2}
                >
                    {status === 'update-available' && (
                        <Button onClick={startDownload} variant='contained' disabled={isDownloading}>
                                Download
                        </Button>
                    )}

                    {status === 'downloading' && isDownloading && (
                        <Box display={'flex'} alignItems={'center'} width={'100%'}>
                            <Box width={'100%'} mr={1}>
                                <LinearProgress color='secondary' variant='determinate' value={progress}/>
                            </Box>
                            
                            <Box>
                                <Typography color='grey' variant='body2'>
                                    {(progress).toFixed(2)}%
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    {status === 'downloaded' && (
                        <Button onClick={quitAndInstall} variant='contained'>
                            Install
                        </Button>
                    )}

                    {status === 'no-updates' && (
                        <Typography variant='body1' color='black'>
                            No Updates Available. Your app is up to date!
                        </Typography>
                    )} 

                    {status === 'error' && (
                        <Box display={'flex'} flexDirection={'column'} gap={2}>
                            <Typography variant='body1' color='error'>
                                An error occured while checking for updates. Please try again later!
                            </Typography>
                            <Box>
                                <Button variant='contained' onClick={handleCloseModal}>
                                    Done
                                </Button>
                            </Box>
                        </Box>
                    )} 


                </Box>
            </Box>
        </Modal>
    )
}

export default UpdateModal;