import { useState } from 'react'
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
    error: {
      main: "#ff0000",
    },
  }
})

const App: React.FC = () => {
  const [initialized, setInitilized] = useState(false);

  return (
    <ThemeProvider theme={theme}>
      {!initialized ? (
        <SplashScreen onInitilizationComplete={() => setInitilized(true)} />
        ) : (
        <MainContent />
        )}
    </ThemeProvider>
  )
}

export default App
