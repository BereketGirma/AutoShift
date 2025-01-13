import {app, BrowserWindow } from 'electron';
import path from 'path';
import { isDev } from './util.js'
import { getPreloadPath } from './pathResolver.js';
import pkg from 'electron-updater';
import { registerIpcHandlers } from './handlers.js';

const { autoUpdater } = pkg
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
};

app.whenReady().then(() => {
  createWindow();
  if(isDev()){
    autoUpdater.allowDowngrade = true;
    autoUpdater.checkForUpdatesAndNotify()
  } else {
    autoUpdater.checkForUpdatesAndNotify()
  }

  if(mainWindow) {
    registerIpcHandlers(mainWindow, autoUpdater)
  }

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