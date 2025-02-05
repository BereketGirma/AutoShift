import '../styles/MainContent.css';
import { useEffect, useState } from 'react';
import { 
    Typography, 
    Button,
    IconButton,
    Box,
    Container,
    Badge,
    Tooltip,
    Paper
} from '@mui/material';

import DownloadIcon from '@mui/icons-material/Download'
import AddShiftModal from './AddShiftModal';
import { ExcelData } from '../../electron/util';
import { useSnackbar } from './SnackbarProvider';
import ModernTabs from './TabOptions';


interface MainContentProps {
    onNavigateToCalander: () => void
    onNavigateToUpdate: () => void;
}

function MainContent ({onNavigateToCalander, onNavigateToUpdate}: MainContentProps) {
    const { enqueueSnackbar } = useSnackbar();
    const [shifts, setShift] = useState<Record<string, ExcelData[]>>({});
    const [hasUpdates, setHasUpdates] = useState<boolean>(true);
    const [modalOpen, setModalOpen] = useState(false);

    const getShifts = () => {
        window.electron.invoke('read-excel-file')
            .then((response: { success: boolean, data: Record<string, ExcelData[]> }) => {
                console.log(response.data)
                if(response.data && typeof response.data === 'object'){
                    setShift(response.data);
                } else {
                    setShift({});
                }
            })
            .catch((error: string) => {
                console.error('Error reading shifts:',error)
            })
    }

    const handleOpenModal = () => {
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
    };

    const handleSaveShift = (sheetName: string, data: ExcelData) => {
        window.electron.invoke('write-into-file', sheetName, [data])
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

    const checkForUpdates = async () => {
        const updates = await window.electron.invoke('check-for-updates')
        if(updates.check){
            setHasUpdates(true)
        } else {
            // setHasUpdates(false)
        }
    };

    useEffect(() => {
        checkForUpdates();
        getShifts();
    }, [])

    return (
        <Box 
            display='flex'
            flexDirection='column'
            height='100%'
            width='100%'
            overflow='hidden'
            borderRadius='5px'
            textAlign='center'
            gap='1rem'
            p='1rem'
            boxSizing='border-box'
            sx={{
                background:'white',
            }}
            // justifyContent={'space-between'}
        >
            <Box
                display='flex'
                flexDirection='column'
                position='relative'
            >
                <Container
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        flexGrow: 1,
                        textAlign: 'center'
                    }}
                >
                    <Typography variant='h5' color='black'> 
                        Welcome to Auto-Shift
                    </Typography>
                    <Typography color='grey'> 
                        Enter your shifts then once done, run the automation😃
                    </Typography>
                </Container>
                    
                {hasUpdates && (
                    <Tooltip title="Update">
                        <IconButton
                            onClick={onNavigateToUpdate}
                            sx={{
                                position: 'absolute',
                                top: 0,
                                right: 0
                            }}
                        >
                            <Badge
                                color="error"
                                variant='dot'
                                overlap='circular'
                            >
                                    <DownloadIcon />
                            </Badge>
                        </IconButton>
                    </Tooltip>
                )}
            </Box>
            
            <Paper sx={{
                flex: '1',
                display: 'flex', 
                flexDirection: 'column',
                overflow:'hidden',
                height: '100%'
            }}>
                <ModernTabs shifts={shifts} getShifts={getShifts} />
            </Paper>
            
            <Box
                display={'flex'}
                justifyContent={'center'}
                gap={2}
                p={1}
            >
                <Button variant="contained" color='primary' className='add-shift' onClick={handleOpenModal} sx={{color: 'white', fontWeight: 'bold'}}>
                    Add Shift
                </Button>
                <Button variant="contained" color='secondary' onClick={onNavigateToCalander} sx={{color: 'white', fontWeight: 'bold'}}>
                    Continue
                </Button>
            </Box>

            <AddShiftModal open={modalOpen} onClose={handleCloseModal} onAddShift={handleSaveShift}></AddShiftModal>
        </Box>
    )
}

export default MainContent;