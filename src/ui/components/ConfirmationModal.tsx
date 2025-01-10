import React, { useEffect, useState } from 'react';
import {
    Button,
    Modal,
    Box,
    Typography,
} from '@mui/material';


const ConfirmationModal: React.FC = () => {
    const [isOpen, setOpen] = useState(false);
    const [shiftDetails, setShiftDetails] = useState<any>(null)

    useEffect(() => {
        const handleConfirmation = (_event: any, shift: any) => {
            setShiftDetails(shift);
            setOpen(true)
        };

        window.electron.on('confirm-or-cancel', handleConfirmation)

        return () => {
            window.electron.removeListener('confirm-or-cancel', handleConfirmation)
        }
    })

    const handleCancel = () => {
        window.electron.invoke('confirm-or-cancel', { confirmed: false })
        setOpen(false)
    };
    
    const handleContinue = () => {
        window.electron.invoke('confirm-or-cancel', { confirmed: true })
        setOpen(false)
    };

    return (
        <Modal open={isOpen}>
            <Box sx={{
                display:'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                bgcolor: 'background.paper',
                borderRadius: '5px',
                boxShadow: 24,
                p: 2,
                width: '60%',
                textAlign: 'center'
                }}>
                {/* Modal title */}
                <Typography variant='body1' component = 'h2' color='black'>
                    Conflict occured with class time while adding shift
                </Typography>

                <Typography variant='body2' component='h2' color='grey' sx={{mt: 1}}>
                    {shiftDetails
                        ? `Shift: ${shiftDetails.date} from ${shiftDetails.startTime} - ${shiftDetails.endTime}`
                        : 'Loading shift details...'}
                </Typography>

                <Typography variant='body2' component='h2' color='grey' sx={{mt: 1}}>
                    Please select "Continue" add shift regardless of conflict
                </Typography>

                {/* Button container */}
                <Box 
                    sx={{ 
                        display: 'flex', 
                        justifyContent:'center', 
                        mt:2, 
                        gap: 2
                    }}
                >
                    <Button variant='contained' color="error" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button variant='contained' color="primary" onClick={handleContinue}>
                        Continue
                    </Button>
                </Box>
            </Box>
        </Modal>
    )
}

export default ConfirmationModal;