import '../styles/SplashScreen.css';
import logo from '../logo/logo-no-background.png'
import { useEffect, useState } from 'react';
import { LinearProgress, Box, Typography } from '@mui/material';

interface SplashScreenProps {
    onInitilizationComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onInitilizationComplete }) => {
    const [progress, setProgress] = useState<number>(0);
    const [statusText, setStatusText] = useState<string>('Initializing...');

    useEffect(() => {
        const initializeApp = async () => {
            try {
                setStatusText('Checking for required files...');

                const result = await window.electron.checkAndCreateFile()
                console.log(`File stauts: ${result.status}, Path: ${result.filePath}`)

                if(result.stauts === 'created'){
                    setTimeout(() => setStatusText('File created successfully!'), 2000);
                } else {
                    setTimeout(() => setStatusText('Files found!'), 2000);
                }

                for(let i:number = 0; i<=100; i++){
                    setTimeout(() => setProgress(i), i * 30);
                }

                setTimeout(() => onInitilizationComplete(), 4000);
            } catch (error) {
                console.error('Error during initialization:',error);
            }
        };
        
        initializeApp();
    }, [onInitilizationComplete]);

    return (
        <div className='splash-screen'>
            <img src={logo} alt="AutoShift Logo" className='splash-logo'/>
            <Box sx={{ width: '80%', mt: 3}}>
                <LinearProgress variant='determinate' value={progress}/>
            </Box>
            <Typography sx={{ mt: 2 }} variant='subtitle1'>
                {statusText}
            </Typography>
        </div>
    )
}

export default SplashScreen;