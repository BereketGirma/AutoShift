import { useState } from "react";
import { DesktopDatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs"
import { 
    Button,
    Box,
    Typography, 
    Paper,
    Container
} from "@mui/material";
import dayjs, {Dayjs} from "dayjs";

interface CalanderContentProps {
    onNavigateToMain: () => void;
    onNavigateToLoading: () => void;
}

function CalenderContent({onNavigateToMain, onNavigateToLoading}: CalanderContentProps) {
    const [selectedStartDate, setSelectedStartDate] = useState<Dayjs | null>(dayjs());
    const [selectedEndDate, setSelectedEndDate] = useState<Dayjs | null>(dayjs());

    const handleStartDateChange = (newDate: Dayjs | null) => {
        setSelectedStartDate(newDate)

        if(newDate && selectedEndDate && newDate.isAfter(selectedEndDate)){
            setSelectedEndDate(newDate)            
        }
    }

    const handleEndDateChange = (newDate: Dayjs | null) => {
        if(newDate && selectedStartDate && newDate.isAfter(selectedEndDate)){
            setSelectedEndDate(newDate)
        }
    }

    const handleSubmit = async() => {
        onNavigateToLoading()
        await window.electron.invoke('run-script', selectedStartDate?.format('YYYY-MM-DD'), selectedEndDate?.format('YYYY-MM-DD'))   
    }
    
    return (
        <Paper 
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                width: '100%',
                overflow: 'hidden',
                borderRadius: '5px',
                backgroundColor: 'white',
                textAlign:'center',
                alignContent: 'center',
                gap: '1em',
                p: '1em'
            }}
        >
            <Box display={'flex'}>
                <Button onClick={onNavigateToMain} variant="outlined">
                    Back
                </Button>
            </Box>
            
            {/* Date picker selection */}
            <Container 
                sx={{
                    display:"flex",
                    flexDirection:'column',
                    gap:5,
                    height: '80%'
                }}
            >
                <Box>
                    <Typography variant="h5" color="black">
                        Pick a Date
                    </Typography>

                    <Typography variant="body2" color="textSecondary">
                        Select Start and End Date of payment period.
                    </Typography>

                </Box>
                
                <Box display={'flex'} justifyContent={'center'} gap={2}>
                    <LocalizationProvider dateAdapter = {AdapterDayjs}>
                        <DesktopDatePicker 
                            label="Start date"
                            value={selectedStartDate}
                            onChange={handleStartDateChange}
                        />
                    </LocalizationProvider>
                    <LocalizationProvider dateAdapter = {AdapterDayjs}>
                        <DesktopDatePicker 
                            label="End date"
                            value={selectedEndDate}
                            onChange={handleEndDateChange}
                            minDate={selectedStartDate || undefined}
                        />
                    </LocalizationProvider>
                </Box>
            </Container>
            
            <Box display={'flex'} justifyContent={'center'}>
                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    sx={{marginTop: 2, position:'relative'}}
                    onClick={handleSubmit}
                >
                    Run Script
                </Button>
            </Box>
        </Paper>
    )
}

export default CalenderContent;