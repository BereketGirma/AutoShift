import { useState } from 'react'

import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Container } from '@mui/material';

import SplashScreen from './components/SplashScreen';
import MainContent from './components/MainContent';
import CalenderContent from './components/CalenderContent'
import SnackbarProvider from './components/SnackbarProvider';
import LoadingScreen from './components/LoadingScreen';
import UpdateChecker from './components/updateChecker';

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
  const [currentPage, setCurrentPage] = useState<"splashScreen" | "main" | "calender" | "loading" | "update">("update");

  const navigateTo = (page: "main" | "calender" | "loading") => {
    setCurrentPage(page)
  }
  
  const pages = {
    splashScreen: <SplashScreen onNavigate={() => navigateTo('main')}/>,
    main: <MainContent onNavigate={() => navigateTo('calender')}/>,
    calender: (
      <Container className='home'>
        <CalenderContent 
          onNavigateToMain={() => navigateTo('main')}
          onNavigateToLoading={() => navigateTo('loading')}
        />
      </Container>
    ),
    loading: <LoadingScreen onNavigate={() => navigateTo('main')}/>,
    update: <UpdateChecker onNavigate={() => navigateTo('main')} />,
  }

  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider>
        {pages[currentPage]}
      </SnackbarProvider>
    </ThemeProvider>

  )
}

export default App
