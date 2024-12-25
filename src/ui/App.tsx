import { useEffect, useState } from 'react'
import SplashScreen from './components/SplashScreen';
import MainContent from './components/MainContent';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: "#007bff",
    },
    secondary: {
      main:"#ffa228",
    },
    warning: {
      main: "#ff0000"
    },
  }
})

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      {showSplash ? <SplashScreen /> : <MainContent />}
    </ThemeProvider>
  )
}

export default App
