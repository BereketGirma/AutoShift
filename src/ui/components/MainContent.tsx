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
} from '@mui/material';

import DeleteIcon from '@mui/icons-material/Delete';
import AddShiftModal from './AddShiftModal';
import { ExcelData } from '../../electron/util';
import { useSnackbar } from './SnackbarProvider';


interface MainContentProps {
    onNavigate: () => void
}

function MainContent ({onNavigate}: MainContentProps) {
    const { enqueueSnackbar } = useSnackbar();

    const [shifts, setShift] = useState<ExcelData[]>([]);

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
                    enqueueSnackbar(`Saved Shift: ${data.day} from ${data.startTime} to ${data.endTime}`, 'success')
                    return getShifts()
                } else {
                    if(response.error === 'Collision'){
                        enqueueSnackbar('Shift conflicts with existing schedule!', 'error')
                    } else {
                        enqueueSnackbar('An error occured with adding shift!', 'error')
                    }
                }
            })
            .catch((error:string) => {
                console.error('Error invoking write to file:',error);
                enqueueSnackbar('Unexpected error occured while saving shift.', 'error')
            })
    }

    const handleDeleteShift = (shiftToDelete: ExcelData) => {
        window.electron.invoke('delete-from-file', shiftToDelete)
            .then((response: { success: boolean; error?: string }) => {
                if(response.success) {
                    enqueueSnackbar(`Deleted Shift: ${shiftToDelete.day} from ${shiftToDelete.startTime} to ${shiftToDelete.endTime}`, 'warning')
                    return getShifts()
                } else {
                    enqueueSnackbar(`Failed to delete Shift: ${shiftToDelete.day} from ${shiftToDelete.startTime} to ${shiftToDelete.endTime}`, 'error')
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
            </Paper>
            
            <div className='button-container'>
                <Button variant="contained" color='primary' className='add-shift' onClick={handleOpenModal}>
                    Add Shift
                </Button>
                <Button variant="contained" color='secondary' onClick={onNavigate}>
                    Continue
                </Button>
            </div>

            <AddShiftModal open={modalOpen} onClose={handleCloseModal} onAddShift={handleSaveShift}></AddShiftModal>
        </div>
    )
}

export default MainContent;