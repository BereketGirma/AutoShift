import '../styles/SplashScreen.css';
import logo from '../logo/logo-no-background.png'

const SplashScreen = () => {
    return (
        <div className='splash-screen'>
            <img src={logo} alt="AutoShift Logo" className='splash-logo'/>
        </div>
    )
}

export default SplashScreen;