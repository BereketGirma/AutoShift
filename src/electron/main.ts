import {app, BrowserWindow, ipcMain} from 'electron';
import path from 'path';
import fs from 'fs';
import { isDev } from './util.js'
import { getPreloadPath } from './pathResolver.js';

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(getPreloadPath()),
    }
  });

  if(isDev()) {
    mainWindow.loadURL('http://localhost:3000')
  } else {
    console.log(app.getAppPath())
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


ipcMain.handle('check-and-create-file', async () => {
  const filePath = path.resolve(app.getPath('userData'), 'shift.xlsx');

  if(!fs.existsSync(filePath)) {
    console.log('Excel file does not exist. Creating...')
    fs.writeFileSync(filePath, '')
    return { status: 'created', filePath}
  } else {
    console.log('Execl file exists');
    return { status: 'exists', filePath}
  }
})