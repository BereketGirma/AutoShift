import '../styles/MainContent.css';
import { useEffect, useState } from 'react';
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
    Slide
} from '@mui/material';

import DeleteIcon from '@mui/icons-material/Delete';
import MuiAlert from '@mui/material/Alert'
import AddShiftModal from './AddShiftModal';
import { ExcelData } from '../../electron/util';

function MainContent () {

    const [shifts, setShift] = useState<ExcelData[]>([]);

    const [snackbarQueue, setSnackbarQueue] = useState<string[]>([]);
    const [snackbarOpen, setSnackbarOpen] = useState(false)
    const [currentSnackbarMessage, setCurrentSnackbarMessage] = useState("")

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

    const showNextSnackbar = () => {
        if(snackbarQueue.length > 0) {
            const nextMessage = snackbarQueue[0];
            setCurrentSnackbarMessage(nextMessage)
            setSnackbarQueue((prevQueue) => prevQueue.slice(1))
            setSnackbarOpen(true)
        }
    }

    const handleCloseSnackbar = () => {
        setSnackbarOpen(false);
        setTimeout(() => {
            showNextSnackbar();
        }, 500)
    }

    const [modalOpen, setModalOpen] = useState(false);

    const handleOpenModal = () => {
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
    };

    const handleSaveShift = (data: { day: string; startTime: string; endTime: string}) => {
        window.electron.invoke('write-into-file', [data])
            .then((response: { success: boolean; error?: string }) => {
                if(response.success) {
                    console.log('Shift saved')
                    return getShifts()
                } else {
                    throw new Error(response.error || 'Failed to save shift')
                }
            })
            .catch((error:string) => {
                console.error('Error invoking write to file:',error);
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
                                            color = "warning"
                                            className='no-outline'
                                            // onClick={() => handleDeleteShift(shift.id)}
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
                autoHideDuration={3000}
                TransitionComponent={Slide}
                transitionDuration={500}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: "top", horizontal: "center"}}
            >
                <MuiAlert
                    onClose={handleCloseSnackbar}
                    severity='success'
                >
                    {currentSnackbarMessage}
                </MuiAlert>
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