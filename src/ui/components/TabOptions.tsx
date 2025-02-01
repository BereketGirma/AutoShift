import React, { useState, useEffect } from 'react';
import { 
    Table,
    TableBody, 
    TableCell, 
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Box,
    Tooltip,
    Tab,
} from '@mui/material';
import {  TabList, TabPanel, TabContext } from '@mui/lab'
import { styled } from '@mui/system'
import DeleteIcon from '@mui/icons-material/Delete';
import { useSnackbar } from './SnackbarProvider';
import { ExcelData } from '../../electron/util';

const ModernTab = styled(Tab) (({ theme }) => ({
    textTransform: 'none',
    fontWeight: 'bold',
    fontSize: '0.875rem',
    marginRight: theme.spacing(1),
    borderRadius: '8px 8px 0 0',
    transition: 'all 0.3s ease',
    '&.Mui-selected': {
        backgroundColor: theme.palette.primary.light,
        // borderBottom: '6px solid' + theme.palette.primary.main,
    },

    '&:hover': {
        backgroundColor: theme.palette.primary.light,
    },
}));

const ModernTabList = styled(TabList) (({ theme }) => ({
    borderBottom: `1px solid ${theme.palette.divider}`,

    '& .MuiTabs-indicator': {
        backgroundColor: theme.palette.primary.main,
        height: '0.15rem',
    },
    
    '&.MuiTabs-scroller': {
        overflow: 'visible !important',
    },
}));

const ModernTabPanel = styled(TabPanel) (({ theme }) => ({
    padding: theme.spacing(0),
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
}));

function ModernTabs() {
    const { enqueueSnackbar } = useSnackbar();
    const [shifts, setShift] = useState<ExcelData[]>([]);
    const [tabValue, setTabValue] = useState('0');
    const jobTitles = useState(['Test 1', 'Test 2', 'Test 3'])

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

    const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
        setTabValue(newValue);
    };

    return (
        <Box width={'100%'} height={'100%'} display={'flex'} flexDirection={'column'}>
            <TabContext value={tabValue}>
                <Box>
                    <ModernTabList onChange={handleTabChange} scrollButtons="auto" variant='scrollable'>
                        {jobTitles[0].map((job, index) => (
                            <ModernTab key={index} label={job} value={`${index}`}></ModernTab>
                        ))}
                    </ModernTabList>
                </Box>
                
                <ModernTabPanel value={`${tabValue}`} aria-selected>
                    <Box
                        sx={{
                            flex:1,
                            display:'flex',
                            flexDirection: 'column',
                            overflow:'auto',
                        }}
                    >
                        <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                            <Table stickyHeader>
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
                                                No shifts found. Add a shift to continue!
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
                                                <Tooltip title="Delete">
                                                    <IconButton
                                                        color = "error"
                                                        className='no-outline'
                                                        onClick={() => handleDeleteShift(shift)}
                                                    >
                                                        <DeleteIcon/>
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    )))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </ModernTabPanel>
            </TabContext>
        </Box>
    );
}

export default ModernTabs