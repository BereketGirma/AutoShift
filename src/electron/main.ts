import {app, BrowserWindow} from 'electron';
import path from 'path';
import { isDev } from './util.js'

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: "/preload.cts"
    }
  });

  if(isDev()) {
    mainWindow.loadURL('http://localhost:3000')
  } else {
    mainWindow.loadFile(path.join(app.getAppPath() + '/dist-react/index.html'));
  }
};

app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', () => {
    if(BrowserWindow.getAllWindows().length === 0){
      createWindow();
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
})