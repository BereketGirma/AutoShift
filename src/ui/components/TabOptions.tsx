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
    Modal,
    Typography,
    Button,
    CircularProgress,
} from '@mui/material';
import {  TabList, TabPanel, TabContext } from '@mui/lab'
import { styled } from '@mui/system'
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/AddCircle'
import CloseIcon from '@mui/icons-material/Close'
import { useSnackbar } from './SnackbarProvider';
import { ExcelData } from '../../electron/util';
import EditShiftModal from './EditShiftModal';

const ModernTab = styled(Tab) (({ theme }) => ({
    textTransform: 'none',
    fontWeight: 'bold',
    fontSize: '0.875rem',
    marginRight: theme.spacing(1),
    borderRadius: '8px 8px 0 0',
    transition: 'all 0.3s ease',
    minWidth: 'auto',
    padding: theme.spacing(1,2),
    '&.Mui-selected': {
        background: theme.palette.primary.light,
        paddingRight: theme.spacing(2),
    },

    '&:hover': {
        background: theme.palette.primary.light,
    },
}));

const ModernTabList = styled(TabList, {
    shouldForwardProp: (prop) => 
        !['fullWidth', 'textColor', 'selectionFollowsFocus'].includes(prop.toString())
}) (({ theme }) => ({

    '& .MuiTabs-indicator': {
        background: theme.palette.primary.main,
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



interface ModernTabsProps {
    shifts: Record<string, ExcelData[]>;
    getShifts: () => Promise<void>;
    onSheetSelected?: (sheet: string) => void;
    onEdit: (shift: Record<string, ExcelData[]>) => void;
}

function ModernTabs({shifts, getShifts, onSheetSelected}: ModernTabsProps) {
    const { enqueueSnackbar } = useSnackbar();
    const [tabValue, setTabValue] = useState('0');
    const [tabModalOpen, setTabModalOpen] = useState(false);
    const [newTabTitle, setNewTabTitle] = useState('');
    const sheetNames = Object.keys(shifts)
    const selectedSheet = sheetNames[parseInt(tabValue)] || '';
    const containsTabs = Object.keys(shifts).length !== 0
    const [showWarning, setShowWarning] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editShiftValue, setEditShiftValue] = useState<ExcelData | null>(null);

    const handleDeleteShift = (shiftToDelete: ExcelData, sheetName: string) => {
        window.electron.invoke('delete-from-file', shiftToDelete, sheetName)
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

    const handleEditShift = (shiftToEdit: ExcelData | null) => {
        window.electron.invoke('edit-from-file', shiftToEdit, selectedSheet)
            .then((response: { success: boolean; error?: string }) => {
                if(response.success) {
                    enqueueSnackbar(`Edited Shift: "${shiftToEdit?.day} from ${shiftToEdit?.startTime} to ${shiftToEdit?.endTime}" --to--> ""`, 'success')
                    return getShifts()
                } else {
                    enqueueSnackbar(`Failed to edit Shift: ${shiftToEdit?.day} from ${shiftToEdit?.startTime} to ${shiftToEdit?.endTime}`, 'error')
                    throw new Error(response.error || 'Failed to delete shift')
                }
            })
            .catch((error: string) => {
                console.error('Error invoking delete from file:', error)
            })

    }

    const setShiftToEdit = (shiftToEdit: ExcelData) => {
        console.log("Editing:", shiftToEdit)
        setEditShiftValue(shiftToEdit)
        toggleEditModal();
    }

    const toggleEditModal = () => {
        setEditModalOpen(!editModalOpen);
    }

    const handleCloseModal = () => {
        setTabModalOpen(false);
        setNewTabTitle("")
    }

    const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
        setTabValue(newValue);
    };

    const handleAutoRetrieve = async () => {
        try{
            setTabModalOpen(true);
            const jobTitles = await window.electron.invoke('collect-job-titles')

            if(jobTitles.success){
                for (const job of jobTitles.list) {
                    await window.electron.invoke('create-new-sheet', job);
                }

                enqueueSnackbar(`Successfully retrieved job titles`, 'success')
                handleCloseModal();
                await getShifts()

                return
            } else {
                enqueueSnackbar(`Failed to retrieve job titles`, 'error')
                handleCloseModal();
                return
            }
        } catch (error) {
            handleCloseModal();
            console.error('Error occured: ', error)
            enqueueSnackbar(`System error: failed to retrieve data!`, 'error')
        }
    }


    const handleDeleteTab = async () => {
        try{
            await window.electron.invoke('remove-job-title', selectedSheet)
            await getShifts()

            enqueueSnackbar(`${selectedSheet} has been deleted!`, 'success')
            setTabValue("0")
            handleCloseModal();
            setShowWarning(false);
        } catch (error) {
            console.error('Error occured: ', error)
            enqueueSnackbar(`Failed to add ${newTabTitle} tab!`, 'error')

        }
    }

    useEffect(() => {
        if(onSheetSelected){
            onSheetSelected(selectedSheet)
        }
    }, [onSheetSelected, selectedSheet])

    return (
        <Box width={'100%'} height={'100%'} display={'flex'} flexDirection={'column'}>
            <TabContext value={tabValue}>
                {!containsTabs ? (
                    <Box>
                        <Button 
                            color='primary' 
                            onClick={() => handleAutoRetrieve()}
                            sx={{ display: 'flex', alignItems: 'center', gap:1, textTransform: 'None', height: '3rem'}}
                        >
                            <AddIcon/>
                            <Typography variant='body1'>New Tab</Typography>
                        </Button>
                    </Box>
                ):(
                    <Box display={'flex'} mr={1}>
                        <ModernTabList onChange={handleTabChange} scrollButtons="auto" variant='scrollable'>
                            {sheetNames.map((sheet, index) => (
                                <ModernTab key={index} value={`${index}`} label={
                                    <Box display={'flex'} alignItems={'center'} gap={2}>
                                        {sheet}
                                        {tabValue === `${index}` && (
                                            <Tooltip title="Remove Tab">
                                                <IconButton component="span" size="small" onClick={() => setShowWarning(true)}>
                                                    <CloseIcon fontSize='small'/>
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Box>
                                }></ModernTab>
                            ))}
                        </ModernTabList>
                        <Box display={'flex'} justifyContent={'center'}>
                            <Tooltip title="Add Tab">
                                <IconButton color='primary' onClick={() => handleAutoRetrieve()}>
                                    <AddIcon/>
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>
                )}
                
                
                <ModernTabPanel value={`${tabValue}`} aria-selected>
                    <Box
                        sx={{
                            flex:1,
                            display:'flex',
                            flexDirection: 'column',
                            overflow:'auto',
                            borderTop: '0.2px solid lightgray'
                        }}
                    >
                        <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell align='center'>ID</TableCell>
                                        <TableCell align='center'>Day</TableCell>
                                        <TableCell align='center'>Shift Start</TableCell>
                                        <TableCell align='center'>Shift End</TableCell>
                                        <TableCell align='center'>Comments</TableCell>
                                        <TableCell align='center'>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {selectedSheet && shifts[selectedSheet]?.length > 0 ? (
                                        shifts[selectedSheet].map((shift, index) => (
                                            <TableRow key={index}>
                                                <TableCell align='center'>{index + 1}</TableCell>
                                                <TableCell align='center'>{shift.day}</TableCell>
                                                <TableCell align='center'>{shift.startTime}</TableCell>
                                                <TableCell align='center'>{shift.endTime}</TableCell>
                                                <TableCell
                                                    align='center'
                                                    sx={{
                                                        maxWidth: 200,
                                                        whiteSpace: 'wrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}
                                                >
                                                    {shift.comment}
                                                </TableCell>
                                                <TableCell align='center'>
                                                    <Tooltip title="Edit">
                                                        <IconButton
                                                            color = "secondary"
                                                            className='no-outline'
                                                            onClick={() => setShiftToEdit(shift)}
                                                        >
                                                            <EditIcon/>
                                                        </IconButton>
                                                    </Tooltip>

                                                    <Tooltip title="Delete">
                                                        <IconButton
                                                            color = "error"
                                                            className='no-outline'
                                                            onClick={() => handleDeleteShift(shift, selectedSheet)}
                                                        >
                                                            <DeleteIcon/>
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan = {6} align='center'>
                                                No shifts found. Add a shift to continue!
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </ModernTabPanel>
            </TabContext>

        {tabModalOpen && (
            <Modal open={tabModalOpen}>
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
                    textAlign: 'center',
                    maxWidth: '400px',
                    gap: 2
                }}>

                    {/* Modal title */}
                    <Typography variant='h6' component = 'h2' color='black'>
                        Retrieving Job Titles
                    </Typography>

                    <Box 
                        display={"flex"}
                        flexDirection={"column"}
                        gap={2}
                        margin={4}
                    >
                        <CircularProgress size="3rem"/>
                    </Box>
                </Box>
            </Modal>
        )}

        
        <Modal open={showWarning}>
            <Box 
                sx={{
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
                    width: '80%',
                    textAlign: 'center',
                    maxWidth: '400px',
                    gap: 4
                }}
            >
                <Box>
                    <Typography color='black' variant='h5'>Removing Tab - "{selectedSheet}"</Typography>

                    <Typography color='error'>
                        WARNING!! This action will get rid of any shifts saved under this tab. 
                        Please proceed if you agree to these terms.
                    </Typography>            
                </Box>

                <Box display={'flex'} gap={2}>
                    <Button variant='contained' color='error' onClick={() => setShowWarning(false)}>
                        Cancel
                    </Button>
                    <Button variant='contained' onClick={handleDeleteTab}>
                        Remove
                    </Button>
                </Box>
            </Box>

        </Modal>

        <EditShiftModal open={editModalOpen} onClose={toggleEditModal} shiftToEdit={editShiftValue} onEditShift={handleEditShift}/>
            

        </Box>
    );
}

export default ModernTabs