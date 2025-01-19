import { useState, useEffect, useRef } from 'react';
import { Typography, Box, CircularProgress, Button } from "@mui/material";
import { CheckCircleRounded } from "@mui/icons-material";
import ConfirmationModal from './ConfirmationModal';

interface LoadingScreenProps {
    onNavigate: () => void;
}

function LoadingScreen({onNavigate}: LoadingScreenProps) {
    const [progressMessages, setProgressMessages] = useState<string>("");
    const messageQueue = useRef<string[]>([]);
    const isProcessing = useRef<boolean>(false);
    const [isCompleted, setIsCompleted] = useState(true);
    const [waitingToContinue, setWaitingToContinue] = useState(false);
    
    const handleContinue = () => {
        setWaitingToContinue(false);
    }

    useEffect(() => {
        const handleProgressUpdate = (_event: any, data: {message: string, isFinal: boolean}) => {
            messageQueue.current.push(data.message)
            if (data.isFinal){
                messageQueue.current.push("Complete");
            }
        };

        const runScriptConfirmation = (_event: any) => {
            setWaitingToContinue(true);
            
            window.electron.invoke('confirm-run-script', { confirmed: true })
        }

        const processQueue = () => {
            if(isProcessing.current || messageQueue.current.length === 0) return;

            isProcessing.current = true;

            const nextMessage = messageQueue.current.shift()!;
            if(nextMessage === "Complete"){
                setIsCompleted(false);
            } else {
                setProgressMessages(nextMessage)
            }

            setTimeout(() => {
                isProcessing.current = false;
                processQueue();
            }, 500)
        }

        window.electron.on('progress-update', handleProgressUpdate)
        window.electron.on('confirm-run-script', runScriptConfirmation)

        if(!waitingToContinue){
            processQueue();
        }
        return () => {
            window.electron.removeListener('progress-update', handleProgressUpdate)
            window.electron.removeListener('confirm-run-script', runScriptConfirmation)

        }
    }, [waitingToContinue])
    
    return (
        <div className="home">
            <Box
                display = 'flex'
                flexDirection = 'column'
                alignItems = 'center'
                justifyContent = 'center'
                height = '100%'
                margin={4}
                gap = {8}
                border = '1px solid rgba(255, 255, 255, 0.3)'
                borderRadius={2}
                sx={{
                    position: 'relative',
                    boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
                }}
            >
                {waitingToContinue ? (
                    <Box 
                        display = 'flex'
                        flexDirection = 'column'
                        alignItems = 'center'
                        gap={3}
                    >
                        <Typography
                            color='black'
                            variant='body1'
                            sx={{
                                wordWrap: 'break-word',
                                textAlign: 'center'
                            }}
                        >
                            Please enter your credentials once the chrome window pops up.
                        </Typography>
                        <Typography color='black'>
                            The window will remain open for 2 minutes!
                        </Typography>

                        <Button variant='contained' onClick={handleContinue}>
                            Continue
                        </Button>

                    </Box>
                ) : (
                    <Box 
                        display = 'flex'
                        flexDirection = 'column'
                        alignItems = 'center'
                        gap={3}
                    >
                        {isCompleted ? (
                            <CircularProgress size="3rem"/>
                        ) : (
                            <>
                            <CheckCircleRounded color="success" sx={{ fontSize: 64 }}/>
                            <Typography
                                color = "black"
                                variant='h5'
                            >
                                Complete!
                            </Typography>
                            </>
                        )}
                        
                        <Typography 
                            color="grey" 
                            variant='body1'
                            sx={{
                                wordWrap: 'break-word',
                                textAlign: 'center'
                            }}
                        >
                            {progressMessages}
                        </Typography>

                    </Box>
                    
                )}

                {!isCompleted && !waitingToContinue && (
                    <Button variant='contained' onClick={onNavigate}>
                        Done
                    </Button>
                    )}
            </Box>

            <ConfirmationModal />
        </div>
    )
}

export default LoadingScreen