import { ExcelOperations } from './excelOperations.js';
import { runSeleniumScript, collectJobTitles } from './script.js';
import fs from 'fs';
import { createIpcMain, ExcelData, getPlatform } from './util.js'
import { ipcMain, BrowserWindow, shell } from 'electron';
import { AppUpdater } from 'electron-updater';

/**
 * All app ipc handlers are listed here
 * @param mainWindow is the main BrowserWindow created by electron
 * @param autoUpdater Electron package to get updates through
 */
export function registerIpcHandlers(mainWindow: BrowserWindow, autoUpdater: AppUpdater) {
    const ipc = createIpcMain()
    const excelOps = new ExcelOperations();

    ipc.handle('check-for-updates', async() => {
        try{
            //Checks if any new release is uploaded on GitHub repo
            const check = await autoUpdater.checkForUpdates()
            return { success: true, message: 'Checking for updates...', check: check };
        } catch(error: any) {
            return { success: false, message: error.message || 'Failed to check for updates', check: null }
        }
    })

    ipc.handle('quit-and-install', () => {
        try{
            //To quit and reinstall update
            autoUpdater.quitAndInstall(false, true);
            return { success: true, message: 'App is updating...' }
        } catch (error: any) {
            return { success: false, message: error.message || 'Failed to install updates'}
        }
   
    })

    ipc.handle('start-download', async () => {
        try{
            //Initiates app update download
            await autoUpdater.downloadUpdate()
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

    //Handles excel file creation
    ipc.handle('check-and-create-file', async () => {
        if(!fs.existsSync(excelOps.filePath)) {
            excelOps.loadFile();
            return { status: 'created', filePath: excelOps.filePath}
        } else {
            return { status: 'exists', filePath: excelOps.filePath}
        }
    })

    //Handles reading excel file
    ipc.handle('read-excel-file', async () => {
        try{
            const shifts = await excelOps.readExcelFile();
            return { success: true, data:shifts}
        } catch (error: any) {
            return { success: false, error: error.message || 'Failed to read Excel file'}
        }
    })

    //Handles writing into excel file
    ipc.handle('write-into-file', async (_event, sheetName: string, newData: ExcelData[]) => {
        try{
            await excelOps.writeIntoFile(sheetName, newData)
            return { success: true }
        } catch (error: any) {
            return {success: false, error: error.message || 'Failed to save shift'}
        }
    })

    //Handles data deletion from excel file
    ipc.handle('delete-from-file', async (_event, removedData: ExcelData, sheetName: string,) => {
        try{
            await excelOps.deleteFromFile(removedData, sheetName);
            return { success: true }
        } catch (error: any) {
            return { success: false, error: error.message || 'Failed to delete shift'}
        }
    })

    //Handles running selenium script
    ipc.handle('run-script', async (_event, startDate: string, endDate: string) => {
        try {
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

    //Handles choice selection sent through UI
    ipc.handle('confirm-or-cancel', async (_event: any, response: { confirmed: boolean }) => {
        const window = BrowserWindow.getFocusedWindow();
        if(!window) throw new Error('No window available to handle confirmation.')

        ipcMain.emit('confirm-or-cancel', null, response)

        return response;
    })

    //Redirects to GitHub releases page for download
    ipc.handle('open-external', async (_event, url: string) => {
        await shell.openExternal(url)
    })

    //Returns the platform type
    ipc.handle('get-platform', async () => {
        return { platform: await getPlatform()}
    })

    //Handles confirmation to run script
    ipc.handle('confirm-run-script', async (_event: any, response: { confirmed: boolean }) => {
        ipcMain.emit('confirm-run-script', null, response)
        return response;
    })

    ipc.handle('create-new-sheet', async (_event, sheetName: string) => {
        try{
            await excelOps.createNewSheet(sheetName)
            return { success: true}
        } catch (error: any){
            return { success: false, error: error.message || 'Failed to save shift'}
        }
    })

    ipc.handle('collect-job-titles', async () => {
        try{
            const jobTitles = await collectJobTitles(mainWindow)
            return {success: true, list: jobTitles}
        } catch (error: any){
            return { success: false, error: error.message || 'Failed to collect job titles', list: [] }
        }
    })

    ipc.handle('remove-job-title', async (_event, sheetName: string) => {
        try{
            await excelOps.deleteSheet(sheetName)
            return {success: true}
        } catch (error: any){
            return { success: false, error: error.message || 'Failed to remove job title' }
        }
    })

}
