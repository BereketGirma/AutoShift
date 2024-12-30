import {app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { isDev, createIpcMain, ExcelData } from './util.js'
import { getPreloadPath } from './pathResolver.js';
import { ExcelOperations } from './excelOperations.js';

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

const ipc = createIpcMain()

const excelOps = new ExcelOperations();

ipc.handle('check-and-create-file', async () => {
  if(!fs.existsSync(excelOps.filePath)) {
    console.log('Excel file does not exist. Creating...')
    excelOps.loadFile();
    return { status: 'created', filePath: excelOps.filePath}
  } else {
    console.log('Execl file exists');
    return { status: 'exists', filePath: excelOps.filePath}
  }
})

ipc.handle('read-excel-file', async () => {
  try{
    const shifts = await excelOps.readExcelFile();
    console.log(shifts)
    return { success: true, data:shifts}
  } catch (error: any) {
    console.error('Error reading excel file:',error.message)
    return { success: false, error: error.message || 'Failed to read Excel file'}
  }
})

ipc.handle('write-into-file', async (_event, newData: ExcelData[]) => {
  try{
    excelOps.writeIntoFile(newData)
    return { success: true }
  } catch (error: any) {
    return {success: false, error: error.message || 'Failed to save shift'}
  }
})
