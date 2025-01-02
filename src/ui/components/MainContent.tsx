import '../styles/MainContent.css';
import { useEffect, useState, useRef } from 'react';
import { 
    Typography, 
    Table,
    TableBody, 
    TableCell, 
    TableContainer,
    Paper,
    TableHead,
    TableRow,
    Button,
    IconButton,
    Snackbar,
    Slide,
    Alert,
} from '@mui/material';

import DeleteIcon from '@mui/icons-material/Delete';
import AddShiftModal from './AddShiftModal';
import { ExcelData } from '../../electron/util';

interface SnackbarMessage {
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info'
}

function MainContent () {

    const [shifts, setShift] = useState<ExcelData[]>([]);

    const snackbarQueue = useRef<SnackbarMessage[]>([]);
    const processingRef = useRef(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false)
    const [currentSnackbar, setCurrentSnackbar] = useState<SnackbarMessage | null>(null);

    const getShifts = () => {
        window.electron.invoke('read-excel-file')
            .then((response: { success: boolean, data:ExcelData[]}) => {
                if(Array.isArray(response.data) && response.data.length > 0){
                    setShift(response.data);
                } else {
                    setShift([]);
                }
            })
            .catch((error: string) => {
                console.error('Error reading shifts:',error)
            })
    }

    const addToSnackbarQueue = async (message: string, severity: SnackbarMessage['severity']) => {
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

    const [modalOpen, setModalOpen] = useState(false);

    const handleOpenModal = () => {
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
    };

    const handleSaveShift = (data: ExcelData) => {
        window.electron.invoke('write-into-file', [data])
            .then((response: { success: boolean; error?: string }) => {
                if(response.success) {
                    addToSnackbarQueue(`Saved Shift: ${data.day} from ${data.startTime} to ${data.endTime}`, 'success')
                    return getShifts()
                } else {
                    if(response.error === 'Collision'){
                        addToSnackbarQueue('Shift conflicts with existing schedule!', 'error')
                    } else {
                        addToSnackbarQueue('An error occured with adding shift!', 'error')
                    }
                }
            })
            .catch((error:string) => {
                console.error('Error invoking write to file:',error);
                addToSnackbarQueue('Unexpected error occured while saving shift.', 'error')
            })
    }

    const handleDeleteShift = (shiftToDelete: ExcelData) => {
        window.electron.invoke('delete-from-file', shiftToDelete)
            .then((response: { success: boolean; error?: string }) => {
                if(response.success) {
                    addToSnackbarQueue(`Deleted Shift: ${shiftToDelete.day} from ${shiftToDelete.startTime} to ${shiftToDelete.endTime}`, 'warning')
                    return getShifts()
                } else {
                    addToSnackbarQueue(`Failed to delete Shift: ${shiftToDelete.day} from ${shiftToDelete.startTime} to ${shiftToDelete.endTime}`, 'error')
                    throw new Error(response.error || 'Failed to delete shift')
                }
            })
            .catch((error: string) => {
                console.error('Error invoking delete from file:', error)
            })
    }

    useEffect(() => {
        getShifts();
    }, [])

    return (
        <div className='home'>
            <div>
                <Typography variant='h5' color='black'> 
                    Welcome to Auto-Shift
                </Typography>
                <Typography color='grey'> 
                    Enter your shifts then once done, run the automation😃
                </Typography>
            </div>

            <Paper className='shift-container'>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Day</TableCell>
                                <TableCell>Shift Start</TableCell>
                                <TableCell>Shift End</TableCell>
                                <TableCell>Remove</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {shifts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan = {5} align='center'>
                                        No shifts found. Add a shift to get started!
                                    </TableCell>
                                </TableRow>
                            ) : (
                                shifts.map((shift, index) => (
                                <TableRow key={index}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{shift.day}</TableCell>
                                    <TableCell>{shift.startTime}</TableCell>
                                    <TableCell>{shift.endTime}</TableCell>
                                    <TableCell>
                                        <IconButton
                                            color = "error"
                                            className='no-outline'
                                            onClick={() => handleDeleteShift(shift)}
                                        >
                                            <DeleteIcon/>
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            )))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Snackbar
                    open={snackbarOpen}
                    autoHideDuration={4000}
                    TransitionComponent={Slide}
                    transitionDuration={500}
                    onClose={handleCloseSnackbar}
                    anchorOrigin={{ vertical: "top", horizontal: "center"}}
                    sx={{
                        width: '100%'
                    }}
                >
                    <Alert
                        onClose={handleCloseSnackbar}
                        severity={currentSnackbar?.severity}
                    >
                        {currentSnackbar?.message}
                    </Alert>
                </Snackbar>
            </Paper>
            
            <div className='button-container'>
                <Button variant="contained" color='primary' className='add-shift' onClick={handleOpenModal}>
                    Add Shift
                </Button>
                <Button variant="contained" color='secondary' onClick={getShifts}>
                    Continue
                </Button>
            </div>

            <AddShiftModal open={modalOpen} onClose={handleCloseModal} onAddShift={handleSaveShift}></AddShiftModal>
        </div>
    )
}

export default MainContent;