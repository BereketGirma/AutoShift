import {app, BrowserWindow, ipcMain} from 'electron';
import path from 'path';
import fs from 'fs';
import { isDev } from './util.js'
import { getPreloadPath } from './pathResolver.js';

let mainWindow: BrowserWindow | null = null;

//Handles creating window
const createWindow = () => {
  //Initilize window
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(getPreloadPath()),
    },
    show: false,
  });

  //Check if on development mode
  if(isDev()) {
    mainWindow.loadURL('http://localhost:3000') //Run from localhost for hot reload purposes
  } else {
    mainWindow.loadFile(path.join(app.getAppPath() + '/dist-react/index.html')); //Run from distrubution path
  }

  //Show main window once everything is loaded
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  })

  //Handle the close event on macOS to hide the window instead of closing it
  mainWindow.on('close', (e) => {
    if(process.platform === 'darwin') {
      e.preventDefault(); //Prevent the window from closing
      mainWindow?.hide(); //Hide the window instead
    }
  });
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if(BrowserWindow.getAllWindows().length === 0){
      createWindow();
    } else {
      mainWindow?.show();
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