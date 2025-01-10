import {app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { isDev, createIpcMain, ExcelData } from './util.js'
import { getPreloadPath } from './pathResolver.js';
import { ExcelOperations } from './excelOperations.js';
import { runSeleniumScript } from './script.js';
import { Dayjs } from 'dayjs';

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
    excelOps.loadFile();
    return { status: 'created', filePath: excelOps.filePath}
  } else {
    return { status: 'exists', filePath: excelOps.filePath}
  }
})

ipc.handle('read-excel-file', async () => {
  try{
    const shifts = await excelOps.readExcelFile();
    return { success: true, data:shifts}
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to read Excel file'}
  }
})

ipc.handle('write-into-file', async (_event, newData: ExcelData[]) => {
  try{
    await excelOps.writeIntoFile(newData)
    return { success: true }
  } catch (error: any) {
    return {success: false, error: error.message || 'Failed to save shift'}
  }
})

ipc.handle('delete-from-file', async (_event, removedData: ExcelData) => {
  try{
    await excelOps.deleteFromFile(removedData);
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete shift'}
  }
})

ipc.handle('run-script', async (_event, startDate: string, endDate: string) => {
  try {
    console.log("Running Selenium script...")
    if (mainWindow) {
      await runSeleniumScript(mainWindow, await excelOps.readExcelFile(), startDate, endDate);
    } else {
      throw new Error('Main window is not initialized');
    }
    return { success: true }
  } catch (error) {
    console.error('Error running Selenium script:', error);
    throw error;
  }
})

ipc.handle('confirm-or-cancel', async (_event: any, response: { confirmed: boolean }) => {
  const window = BrowserWindow.getFocusedWindow();
  if(!window) throw new Error('No window available to handle confirmation.')

  ipcMain.emit('confirm-or-cancel', null, response)

  return response;
})