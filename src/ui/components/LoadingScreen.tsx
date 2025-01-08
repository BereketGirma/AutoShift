import { useState, useEffect, useRef } from 'react';
import { Typography, Box, CircularProgress, Button } from "@mui/material";
import { CheckCircleRounded } from "@mui/icons-material";

interface LoadingScreenProps {
    onNavigate: () => void;
}

function LoadingScreen({onNavigate}: LoadingScreenProps) {
    const [progressMessages, setProgressMessages] = useState<string>("");
    const messageQueue = useRef<string[]>([]);
    const isProcessing = useRef<boolean>(false);
    const [isCompleted, setIsCompleted] = useState(true);

    useEffect(() => {
        const handleProgressUpdate = (_event: any, data: {message: string, isFinal: boolean}) => {
            messageQueue.current.push(data.message)
            if (data.isFinal){
                messageQueue.current.push("Complete");
            }
            processQueue();
        };

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

        return () => {
            window.electron.removeListener('progress-update', handleProgressUpdate)
        }
    }, [])
    
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
                <Box 
                    display = 'flex'
                    flexDirection = 'column'
                    alignItems = 'center'
                    gap={3}
                >
                    {isCompleted ? (
                        <CircularProgress size="3rem"/>
                    ) : (
                        <CheckCircleRounded color="success" sx={{ fontSize: 64 }}/>
                    )}

                    <Typography 
                        color="black" 
                        variant='h5'
                        sx={{
                            wordWrap: 'break-word',
                            textAlign: 'center'
                        }}
                    >
                        {progressMessages}
                    </Typography>

                </Box>
                

                {!isCompleted ? (
                    <Button variant='contained' onClick={onNavigate}>
                        Done
                    </Button>
                    ) : (<></>)}
            </Box>
        </div>
    )
}

export default LoadingScreen