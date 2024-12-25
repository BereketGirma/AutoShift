import './App.css'
import { useEffect, useState } from 'react'
import SplashScreen from './components/SplashScreen';
import MainContent from './components/MainContent';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      {showSplash ? <SplashScreen /> : <MainContent />}
    </div>
  )
}

export default App
