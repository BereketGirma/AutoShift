import '../styles/MainContent.css';
import { useState } from 'react';
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

interface Shift{
    id: number;
    day: string;
    startTime: string;
    endTime: string;
}

function MainContent () {

    const [shifts, setShift] = useState<Shift[]>([
        {id: 1, day: 'Monday', startTime: '9:00 AM', endTime: '5:00 PM'},
        {id: 2, day: 'Tuesday', startTime: '11:00 AM', endTime: '2:00 PM'},
        {id: 3, day: 'Wednesday', startTime: '10:00 AM', endTime: '4:00 PM'},
    ]);

    const [snackbarQueue, setSnackbarQueue] = useState<string[]>([]);
    const [snackbarOpen, setSnackbarOpen] = useState(false)
    const [currentSnackbarMessage, setCurrentSnackbarMessage] = useState("")

    const handleDeleteShift = (id: number) => {
       const shiftToDelete = shifts.find(shift => shift.id === id);
        if (shiftToDelete) {
            setShift((prevShifts) => prevShifts.filter((shift) => shift.id !== id));

            const message = `Shift on ${shiftToDelete.day} from ${shiftToDelete.startTime} to ${shiftToDelete.endTime} deleted!`
            setSnackbarQueue((prevQueue) => [...prevQueue, message]);
            
            if(!snackbarOpen){
                setSnackbarOpen(true);
                setCurrentSnackbarMessage(message);
                setSnackbarQueue((prevQueue) => prevQueue.slice(1))
            }
        }
    };

    const showNextSnackbar = () => {
        console.log(snackbarQueue)
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

    const handleSaveShift = (newShift: { day: string; startTime: string; endTime: string}) => {
        const newShiftWithId = {
            ...newShift,
            id: shifts.length + 1,
        }
        setShift([...shifts, newShiftWithId])
    };

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
                            {shifts.map((shift) => (
                                <TableRow key={shift.id}>
                                    <TableCell>{shift.id}</TableCell>
                                    <TableCell>{shift.day}</TableCell>
                                    <TableCell>{shift.startTime}</TableCell>
                                    <TableCell>{shift.endTime}</TableCell>
                                    <TableCell>
                                        <IconButton
                                            color = "warning"
                                            className='no-outline'
                                            onClick={() => handleDeleteShift(shift.id)}
                                        >
                                            <DeleteIcon/>
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
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
                <Button variant="contained" color='secondary'>
                    Continue
                </Button>
            </div>

            <AddShiftModal open={modalOpen} onClose={handleCloseModal} onAddShift={handleSaveShift}></AddShiftModal>
        </div>
    )
}

export default MainContent;