import { useState } from 'react'
import SplashScreen from './components/SplashScreen';
import MainContent from './components/MainContent';
import CalanderContent from './components/CalanderContent'
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Container } from '@mui/material';
import CredentialForm from './components/CredentialForm';

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
  const [currentPage, setCurrentPage] = useState<"main" | "calander">("main");

  const navigateTo = (page: "main" | "calander") => {
    setCurrentPage(page)
  }

  return (
    <ThemeProvider theme={theme}>
      {!initialized ? (
        <SplashScreen onInitilizationComplete={() => setInitilized(true)} />
        ) : currentPage === "main" ? (
        <MainContent onNavigate={() => navigateTo('calander')}/>
        ) : (
          <Container className='home'>
            <CalanderContent onNavigate={() => navigateTo('main')} />
            <CredentialForm></CredentialForm>
          </Container>
          
        )}

    </ThemeProvider>

  )
}

export default App
