import { ExcelOperations } from './excelOperations.js';
import { runSeleniumScript } from './script.js';
import fs from 'fs';
import { createIpcMain, ExcelData, getPlatform } from './util.js'
import { ipcMain, BrowserWindow, shell } from 'electron';
import { AppUpdater } from 'electron-updater';
import { platform } from 'os';

export function registerIpcHandlers(mainWindow: BrowserWindow, autoUpdater: AppUpdater) {
    const ipc = createIpcMain()
    const excelOps = new ExcelOperations();

    ipc.handle('check-for-updates', async() => {
        try{
            await autoUpdater.checkForUpdates()
            return { success: true, message: 'Checking for updates...' };
        } catch(error: any) {
            return { success: false, message: error.message || 'Failed to check for updates'}
        }
    })

    ipc.handle('quit-and-install', () => {
        try{
            autoUpdater.quitAndInstall(false, true);
            return { success: true, message: 'App is updating...' }
        } catch (error: any) {
            return { success: false, message: error.message || 'Failed to install updates'}
        }
   
    })

    ipc.handle('start-download', async () => {
        console.log('Attempting to start download')
        try{
            await autoUpdater.downloadUpdate()
            console.log('Download started successfully.')
            return { succcess: true, message: 'Downloading update' }
        } catch (error: any) {
            console.error('Error starting download:', error)
            return { succcess: false, message: error.message }
        }
    })

    autoUpdater.on('update-available', () => {
        mainWindow.webContents.send('update-status', { status: 'update-available' })
    });

    autoUpdater.on('update-not-available', () => {
        mainWindow.webContents.send('update-status', { status: 'no-updates' });
    });

    autoUpdater.on('download-progress', (progress) => {
        mainWindow.webContents.send('update-status',{
            status: 'downloading',
            progress: progress.percent
        });
    });

    autoUpdater.on('update-downloaded', () => {
        mainWindow.webContents.send('update-status', { status: 'downloaded' });
    });

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

    ipc.handle('open-external', async (_event, url: string) => {
        await shell.openExternal(url)
    })

    ipc.handle('get-platform', async () => {
        return { platform: await getPlatform()}
    })

}