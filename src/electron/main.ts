import {app, BrowserWindow, Menu } from 'electron';
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

  // Custom mac menu options
  const macMenu: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'AutoShift',
      submenu: [
        { role: 'quit'}
      ]
    },
    // {
    //   label: 'File',
    //   submenu: [
    //     { label: 'Open'},
    //     { type: 'separator'},
    //     { role: 'quit'}
    //   ]
    // },
    
  //   {
  //     label: 'Edit',
  //     submenu: [
  //       { role: 'undo' },
  //       { role: 'redo' },
  //       { type: 'separator'},
  //       { role: 'cut' },
  //       { role: 'copy' },
  //       { role: 'paste' }
  //     ]
  //   }
  ];

  // Custom windows menu options
  const winMenu: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'AutoShift',
      submenu: [
        { role: 'quit'}
      ]
    },
    // {
    //   label: 'File',
    //   submenu: [
    //     { label: 'Open'},
    //     { type: 'separator'},
    //     { role: 'quit'}
    //   ]
    // },
    
    // {
    //   label: 'Edit',
    //   submenu: [
    //     { role: 'undo' },
    //     { role: 'redo' },
    //     { type: 'separator'},
    //     { role: 'cut' },
    //     { role: 'copy' },
    //     { role: 'paste' }
    //   ]
    // }
  ];

  const menuTemplate = process.platform === 'darwin' ? macMenu : []

  const appMenu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(appMenu)

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

//When the app is ready create the window
//Checks if it is on dev mode as well
app.whenReady().then(() => {
  createWindow();
  
  //Check for updates as app launches
  autoUpdater.autoDownload = false
  autoUpdater.checkForUpdatesAndNotify()

  if(mainWindow) {
    registerIpcHandlers(mainWindow, autoUpdater)
  }

  app.on('activate', () => {
    //Checks if window exists, then try to show it. If not create a new window 
    if(BrowserWindow.getAllWindows().length === 0){
      createWindow();
    } else {
      mainWindow?.show();
    }
  })

})

//When app is closed, terminate process
app.on('window-all-closed', () => {

  //For MacOS
  if (process.platform !== 'darwin') {
    app.quit();
  }
})