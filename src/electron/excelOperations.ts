import * as XLSX from 'sheetjs-style';
import fs from 'fs';
import { app } from 'electron';
import path from 'path';
import { ExcelData } from './util.js'

export class ExcelOperations {
    public filePath: string;

    constructor() {
        this.filePath = path.resolve(app.getPath('userData'), 'shift.xlsx')
    }

    createNewWorkbook() {
        try{
            const headers = [['ID', 'Name', 'Shift', 'Date']];
            const ws = XLSX.utils.aoa_to_sheet(headers);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Shifts');
            XLSX.writeFile(wb, this.filePath)
        } catch (error:any) {
            console.log("Failed to write into file. \n Error: "  + error)
        }
        
    }

    async readExcelFile(): Promise<ExcelData[]> {
        try {
            if (!fs.existsSync(this.filePath)) {
                throw new Error('Excel file does not exist');
            }

            const workbook = XLSX.readFile(this.filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            return XLSX.utils.sheet_to_json<ExcelData>(worksheet, { range: 1 })

        } catch (error) {
            console.error('Error reading Excel file:', error)
            throw error
        }
    }
}