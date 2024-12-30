import XLSX from 'sheetjs-style';
import fs from 'fs';
import { app } from 'electron';
import path from 'path';
import { ExcelData } from './util.js'

export class ExcelOperations {
    public filePath: string;
    private workbook: XLSX.WorkBook | null = null;
    private worksheet: XLSX.WorkSheet | null = null;
    private readonly sheetName = "Shifts sheet"

    constructor() {
        this.filePath = path.resolve(app.getPath('userData'), 'shift.xlsx')
        this.loadFile();
    }

    public loadFile(): void {
        if(fs.existsSync(this.filePath)) {
            try{
                console.log('Loading file from path')
                this.workbook = XLSX.readFile(this.filePath)
                const sheet = this.workbook.Sheets[this.sheetName]

                if(!sheet){
                    console.warn("No Sheets found")
                    this.createNewWorkbook();
                } else {
                    this.worksheet = this.workbook.Sheets[this.sheetName];
                }
            } catch (error) {
                console.error('Error loading the workbook.')
                this.createNewWorkbook()
            }
            
        } else {
            console.log('File does not exist')
            this.createNewWorkbook()
        }
    }

    private async createNewWorkbook(): Promise<void> {
        try{
            console.log('Creating a new workbook...')
            const headers = [['ID', 'Day', 'StartTime', 'EndTime']];
            this.worksheet = XLSX.utils.aoa_to_sheet(headers);
            this.workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(this.workbook, this.worksheet, 'Shifts sheet');
            XLSX.writeFile(this.workbook, this.filePath)
            console.log('Workbook created successfully at path')
        } catch (error:any) {
            console.error("Failed to write into file. \n Error: "  + error)
        }
        
    }

    public async readExcelFile(): Promise<ExcelData[]> {
        try {
            if (!fs.existsSync(this.filePath)) {
                throw new Error('Excel file does not exist');
            }

            if(this.workbook && this.worksheet){
                const data = XLSX.utils.sheet_to_json<ExcelData>(this.worksheet, { header: 1 });
                return data.slice(1);
            } else {
                throw new Error('Worksheet is not loaded.');
            }

        } catch (error) {
            console.error('Error reading Excel file:', error)
            throw error
        }
    }

    public async writeIntoFile(data: ExcelData[]): Promise<void> {
        try {
            if(!fs.existsSync(this.filePath)) {
                await this.createNewWorkbook()
            }

            const existingData = await this.readExcelFile()

            const updatedData = [...existingData, ...data]

            const updatedWorksheet = XLSX.utils.json_to_sheet(updatedData, { skipHeader: false})

            if(this.workbook) {
                this.workbook.Sheets[this.sheetName] = updatedWorksheet;
            } else {
                throw new Error('Workbook is not loaded.');
            }

            XLSX.writeFile(this.workbook, this.filePath)

        } catch (error) {
            console.error('Error writing into the Excel file:', error)
        }
    }

    public async deleteFromFile(criteria: Partial<ExcelData>): Promise<void> {
        try{ 
            if(!fs.existsSync(this.filePath)) {
                console.log('File does not exist, nothing to delete.');
                return;
            }

            const existingData = await this.readExcelFile();

            const filteredData = existingData.filter((row) => {
                return !Object.entries(criteria).every(([key, value]) => row[key as keyof ExcelData] === value);
            });

            const updatedWorksheet = XLSX.utils.json_to_sheet(filteredData, {skipHeader: false});

            if(this.workbook){
                this.workbook.Sheets[this.sheetName] = updatedWorksheet;
            } else {
                throw new Error('Workbook is not loaded.');
            }

            XLSX.writeFile(this.workbook, this.filePath)
        } catch (error) {
            console.error('Error deleting data from the Excel file:', error)
        }
    }
}