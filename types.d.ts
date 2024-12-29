export  {};
import type { ElectronAPI } from './src/electron/util'

declare global{
    interface Window {
        electron: ElectronAPI;
    }
}
