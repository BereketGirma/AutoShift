import { useState } from "react";
import { DesktopDatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs"
import { 
    Button,
    Box,
    Typography, 
    Container,
} from "@mui/material";
import dayjs, {Dayjs} from "dayjs";

interface CalanderContentProps {
    onNavigate: () => void
}

function CalenderContent({onNavigate}: CalanderContentProps) {
    const [selectedStartDate, setSelectedStartDate] = useState<Dayjs | null>(dayjs());
    const [selectedEndDate, setSelectedEndDate] = useState<Dayjs | null>(dayjs());

    const handleStartDateChange = (newDate: Dayjs | null) => {
        setSelectedStartDate(newDate)

        if(newDate && selectedEndDate && newDate.isAfter(selectedEndDate)){
            console.log('working')
            setSelectedEndDate(newDate)            
        }
    }

    const handleEndDateChange = (newDate: Dayjs | null) => {
        if(newDate && selectedStartDate && newDate.isAfter(selectedEndDate)){
            setSelectedEndDate(newDate)
        }
    }
    
    
    return (
        <Container 
            sx={{
                display:'flex',
                flexDirection:'column',
                alignItems:'center',
                gap:2
            }}
        >
            <Box
                sx={{
                    display:'flex',
                    width:'100%',
                    justifyContent:'flex-start',
                    mb: 2
                }}
            >
                <Button onClick={onNavigate} variant="outlined">
                    Back
                </Button>
            </Box>
            
            {/* Date picker selection */}
            <Container 
                sx={{
                    display:"flex",
                    justifyContent:"center",
                    flexDirection:'column',
                    gap:2,
                }}
            >
                <Box sx={{gap:1}}>
                    <Typography variant="h5" color="black">
                        Pick a Date
                    </Typography>

                    <Typography variant="body2" color="textSecondary">
                        Select Start and End Date of payment period.
                    </Typography>

                </Box>
                
                <Box
                    sx={{
                        display:"flex",
                        justifyContent:"center",
                        gap:2,
                    }}
                >
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
        </Container>
    )
}

export default CalenderContent;