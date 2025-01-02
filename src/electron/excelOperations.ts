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
    private dayOrder: string[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sudnay"]


    constructor() {
        this.filePath = path.resolve(app.getPath('userData'), 'shift.xlsx')
        this.loadFile();
    }

    public loadFile(): void {
        if(fs.existsSync(this.filePath)) {
            try{
                this.workbook = XLSX.readFile(this.filePath)
                const sheet = this.workbook.Sheets[this.sheetName]

                if(!sheet){
                    this.createNewWorkbook();
                } else {
                    this.worksheet = this.workbook.Sheets[this.sheetName];
                }
            } catch (error) {
                this.createNewWorkbook()
            }
            
        } else {
            this.createNewWorkbook()
        }
    }

    private async createNewWorkbook(): Promise<void> {
        try{
            const headers = [['day', 'startTime', 'endTime']];
            this.worksheet = XLSX.utils.aoa_to_sheet(headers);
            this.workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(this.workbook, this.worksheet, 'Shifts sheet');
            XLSX.writeFile(this.workbook, this.filePath)
        } catch (error:any) {
            throw error
        }
        
    }

    public async readExcelFile(): Promise<ExcelData[]> {
        try {
            if (!fs.existsSync(this.filePath)) {
                throw new Error('Excel file does not exist');
            }
            this.refreshWorkbook();
            
            if(this.workbook && this.worksheet){
                const data = XLSX.utils.sheet_to_json<ExcelData>(this.worksheet);
                return data
            } else {
                throw new Error('Worksheet is not loaded.');
            }

        } catch (error) {
            throw error
        }
    }

    public async writeIntoFile(data: ExcelData[]): Promise<void> {
        try {
            if(!fs.existsSync(this.filePath)) {
                await this.createNewWorkbook()
            }
            
            const existingData = await this.readExcelFile()
            if(this.checkCollidingData(existingData, data)){
                throw new Error('Collision')
            }
            const updatedData = [...existingData, ...data]
            this.sortShifts(updatedData)

            const updatedWorksheet = XLSX.utils.json_to_sheet(updatedData)

            if(this.workbook) {
                this.workbook.Sheets[this.sheetName] = updatedWorksheet;
                XLSX.writeFile(this.workbook, this.filePath)
            } else {
                throw new Error('Workbook is not loaded.');
            }    

        } catch (error) {
            throw error
        }
    }

    private checkCollidingData(existingData: ExcelData[], data: ExcelData[]): boolean {
        
        const nonCollidingData = data.filter((newShift) => {
            return !existingData.some((existingShift) => {
                return (
                    existingShift.day === newShift.day && 
                    !(
                        this.convertTo24HourFormat(newShift.endTime) <= this.convertTo24HourFormat(existingShift.startTime) ||
                        this.convertTo24HourFormat(newShift.startTime) >= this.convertTo24HourFormat(existingShift.endTime)
                    )
                );
            });
        })

        if(nonCollidingData.length === 0) {
            return true
        }

        return false
    }

    private convertTo24HourFormat(time: string): number {
        const [timePart, meridian] = time.split(" ");
        const [hourStr, minuteStr] = timePart.split(":")

        let hours = parseInt(hourStr, 10);
        const minutes = parseInt(minuteStr, 10);

        if(isNaN(hours) || isNaN(minutes) || (meridian !== 'AM' && meridian !== 'PM')){
            throw new Error(`Invalid time format`)
        }

        if(meridian === 'PM' && hours !== 12) {
            hours += 12
        } else if (meridian === 'AM' && hours === 12) {
            hours = 0;
        }

        return hours * 60 + minutes
    }

    private getDayIndex(day: string):number{
        return this.dayOrder.indexOf(day);
    }

    private sortShifts(shifts: ExcelData[]): ExcelData[] {
        return shifts.sort((a, b) => {
            const dayComparison = this.getDayIndex(a.day) - this.getDayIndex(b.day);
            if(dayComparison !== 0){
                return dayComparison; //Sorting by day
            }

            const timeA = this.convertTo24HourFormat(a.startTime);
            const timeB = this.convertTo24HourFormat(b.startTime);
            return timeA - timeB; //Earlier times fisrt
        })
    }

    public async deleteFromFile(shiftToDelete: ExcelData): Promise<void> {
        try{ 
            if(!fs.existsSync(this.filePath)) {
                return;
            }

            const existingData = await this.readExcelFile();

            const filteredData = existingData.filter((row) => {
                return !Object.entries(shiftToDelete).every(([key, value]) => row[key as keyof ExcelData] === value);
            });

            const updatedWorksheet = XLSX.utils.json_to_sheet(filteredData, {skipHeader: false});

            if(this.workbook){
                this.workbook.Sheets[this.sheetName] = updatedWorksheet;
            } else {
                throw new Error('Workbook is not loaded.');
            }

            XLSX.writeFile(this.workbook, this.filePath)

        } catch (error) {
            throw error
        }
    }

    private refreshWorkbook() {
        if(fs.existsSync(this.filePath)) {
            this.workbook = XLSX.readFile(this.filePath);
            this.worksheet = this.workbook.Sheets[this.sheetName]
        } else {
            this.createNewWorkbook();
        }
    }
}