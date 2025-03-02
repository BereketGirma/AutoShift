import React, { useState } from 'react';
import {
    Button,
    Modal,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    SelectChangeEvent,
    Box,
    Typography,
    TextField,
} from '@mui/material';
import { useSnackbar } from './SnackbarProvider';

//Interface to handle format
interface EditShiftModalProps {
    open: boolean;
    onClose: () => void;
    onEditShift: (Shift: { day: string; startTime: string; endTime: string; comment: string | null}) => void;
}

const EditShiftModal: React.FC<EditShiftModalProps> = ({ open, onClose, onEditShift }) => {

    //Initial value of the shiftData retrived from modal
    const [shiftData, setShiftData] = useState({
        day: '',
        startTime: '',
        endTime: '',
        comment: ''
    });

    //Function to add error messages into snackbar queue
    const { enqueueSnackbar } = useSnackbar();

    /**
     * Handling changes occuring in modal such as selection or input
     * @param e event that is occuring
     */
    const handleChange = (e: React.ChangeEvent< HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
        const { name, value } = e.target;
        setShiftData((prev) => ({
            ...prev,
            [name!]: value,
        }))
    }

    /**
     * Handles saving the shift provided from modal.
     * Checks if selected start & end time overlaps.
     * @returns void
     */
    const handleSave = () => {
        if(!shiftData.day || !shiftData.startTime || !shiftData.endTime){
            enqueueSnackbar("Please select a Day, Start time and End time.", 'error')
            return;
        }

        const startTime = parseTime(shiftData.startTime)
        const endTime = parseTime(shiftData.endTime);

        if(startTime >= endTime) {
            enqueueSnackbar("Start time must be before end time.", 'error');
            return;
        }
        onEditShift(shiftData);
        setShiftData({ day: '', startTime: '', endTime: '', comment: ''})
        onClose()
    }

    /**
     * Handles time prasing and conversion to 24hour format
     * @param time the shift time
     * @returns the time converted into 24hour format
     */
    const parseTime = (time:string): number => {
        const [hourMin, period] = time.split(' ')
        let[hour, minute] = hourMin.split(':').map(Number)

        //Conversion logic
        if(period === 'PM' && hour !== 12){
            hour += 12
        } else if (period === 'AM' && hour === 12){
            hour = 0;
        }
        return hour * 60 + minute;
    }

    /**
     * Generates an array of the 12hour combination of am and pm 
     * @returns The array of combined hours of am and pm
     */
    const generate12HourTimeOptions = () => {
        const amTimes = []
        const pmTimes = []

        for(let hour = 0; hour < 12; hour++){
            const formattedHour = hour === 0 ? 12: hour;
            const format1 = `${formattedHour}:00 AM`
            const format2 = `${formattedHour}:15 AM`
            const format3 = `${formattedHour}:30 AM`
            const format4 = `${formattedHour}:45 AM`

            amTimes.push(format1, format2, format3, format4);
        }

        for(let hour = 12; hour < 24; hour++){
            const formattedHour = hour === 12 ? 12: hour%12;
            const format1 = `${formattedHour}:00 PM`
            const format2 = `${formattedHour}:15 PM`
            const format3 = `${formattedHour}:30 PM`
            const format4 = `${formattedHour}:45 PM`

            pmTimes.push(format1, format2, format3, format4);
        }

        return [...amTimes, ...pmTimes]
    }

    //Holds the generated array
    const timeOptions = generate12HourTimeOptions();

    //Array of days of the week
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                bgcolor: 'background.paper',
                borderRadius: '5px',
                boxShadow: 24,
                p: 2,
                width: '50%',
                maxWidth: '400px'
            }}>
                {/* Modal title */}
                <Typography variant='h6' component='h2' color='black'>
                    Edit Shift
                </Typography>

                {/* Day selector */}
                <FormControl fullWidth sx={{mt:2}}>
                    <InputLabel id='day-select-label'>Day</InputLabel>
                    <Select 
                        labelId='day-select-label'
                        value={shiftData.day}
                        onChange={handleChange}
                        name='day'
                        label='Day'
                    >
                        {days.map((day) => (
                            <MenuItem key={day} value={day}>
                                {day}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                
                {/* Start time selector */}
                <FormControl fullWidth sx={{mt:2}}>
                    <InputLabel id='startTime-select-label'>Start Time</InputLabel>
                    <Select 
                        labelId='startTime-select-label'
                        value={shiftData.startTime}
                        onChange={handleChange}
                        name='startTime'
                        label='StartTime'
                    >
                        {timeOptions.map((time) => (
                            <MenuItem key={time} value={time}>
                                {time}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                
                {/* End time selector */}
                <FormControl fullWidth sx={{mt:2}}>
                    <InputLabel id='endTime-select-label'>End Time</InputLabel>
                    <Select 
                        labelId='endTime-select-label'
                        value={shiftData.endTime}
                        onChange={handleChange}
                        name='endTime'
                        label='EndTime'
                    >
                        {timeOptions.map((time) => (
                            <MenuItem key={time} value={time}>
                                {time}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Comment text field */}
                <FormControl fullWidth sx={{mt:2}}>
                    <TextField 
                        value={shiftData.comment}
                        onChange={handleChange} 
                        name='comment'
                        label='Comment'
                    />
                </FormControl>

                {/* Button container */}
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent:'center', 
                    mt:2, 
                    gap: 2}}
                >
                    <Button onClick={onClose} variant='contained' color="error">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} variant='contained' color="primary">
                        Save
                    </Button>
                </Box>
            </Box>
        </Modal>
    )
}

export default EditShiftModal;