import React, { useState, createContext, useContext, useRef, ReactNode } from 'react'
import { Snackbar, Alert, Slide } from '@mui/material'

type SnackbarMessage = {
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info'
}

type SnackbarContextType = {
    enqueueSnackbar: (message: SnackbarMessage['message'], severity: SnackbarMessage['severity']) => void;
}

const SnackbarContext = createContext<SnackbarContextType | null>(null);

export const useSnackbar = () => {
    const context = useContext(SnackbarContext);
    if(!context) {
        throw new Error('useSnackbar must be used within a SnacbarProvider');
    }
    return context;
}

const SnackbarProvider: React.FC<{ children: ReactNode }> = ({children}) => {
    const snackbarQueue = useRef<SnackbarMessage[]>([]);
    const processingRef = useRef(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false)
    const [currentSnackbar, setCurrentSnackbar] = useState<SnackbarMessage | null>(null);

    const enqueueSnackbar = async (message: string, severity: SnackbarMessage['severity']) => {
        snackbarQueue.current.push({ message, severity });

        if(!processingRef.current) {
            await processQueue();
        }
    }

    const processQueue = async () => {
        processingRef.current = true;

        while(snackbarQueue.current.length > 0) {
            const nextSnackbar = snackbarQueue.current.shift();
            if(nextSnackbar){
                await showSnackbar(nextSnackbar);
            }
        }

        processingRef.current = false;
    }

    const showSnackbar = (snackbar: SnackbarMessage): Promise<void> => {
        return new Promise((resolve) => {
            setCurrentSnackbar(snackbar);
            setSnackbarOpen(true);

            setTimeout(() => {
                setSnackbarOpen(false);

                setTimeout(() => {
                    resolve();
                }, 500);
            }, 4000);
        })
    }

    const handleCloseSnackbar = async (_event: React.SyntheticEvent | Event, reason?: string) => {
        if(reason === 'clickaway'){
            return;
        }
        setSnackbarOpen(false);
    }

    return (
        <SnackbarContext.Provider value={{ enqueueSnackbar }}>
            {children}
            {currentSnackbar && (
                <Snackbar 
                    open={snackbarOpen} 
                    onClose={handleCloseSnackbar}
                    autoHideDuration={4000}
                    TransitionComponent={Slide}
                    transitionDuration={300}
                    anchorOrigin={{vertical: "top", horizontal: "center"}}
                >
                    <Alert
                        onClose={handleCloseSnackbar}
                        severity={currentSnackbar.severity}
                    >
                        {currentSnackbar.message}
                    </Alert>
                </Snackbar>
            )}
        </SnackbarContext.Provider>
    );
}

export default SnackbarProvider
