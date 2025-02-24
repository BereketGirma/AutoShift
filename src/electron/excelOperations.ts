import XLSX from 'sheetjs-style';
import fs from 'fs';
import { app } from 'electron';
import path from 'path';
import { ExcelData } from './util.js'

export class ExcelOperations {
    public filePath: string;
    private workbook: XLSX.WorkBook | null = null;
    private worksheet: XLSX.WorkSheet | null = null;
    private dayOrder: string[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sudnay"]


    constructor() {
        this.filePath = path.resolve(app.getPath('userData'), 'shift.xlsx')
        this.loadFile();
    }

    /**
     * Handles loading in the excel file based on the file path.
     * If the files doesn't exists, it will create a new workbook and save that to the file path.
     */
    public loadFile(): void {
        //Check if file already exists
        if(fs.existsSync(this.filePath)) {
            try{
                this.workbook = XLSX.readFile(this.filePath)
                const sheet = this.workbook.Sheets['Error Log']

                //Making sure that the required sheet exists
                if(!sheet){
                    this.createNewWorkbook();
                } else {
                    this.worksheet = this.workbook.Sheets['Error Log'];
                }
            } catch (error) {
                this.createNewWorkbook()
            }
            
        } else {
            this.createNewWorkbook()
        }
    }

    /**
     * Handles the creation of a new workbook. 
     * This by default adds day, startTime and endTime into columns.
     */
    private async createNewWorkbook(): Promise<void> {
        try{
            const headers = [['Timestamp', 'Function Name', 'Error Message']];
            this.worksheet = XLSX.utils.aoa_to_sheet(headers);
            this.workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(this.workbook, this.worksheet, 'Error Log');
            XLSX.writeFile(this.workbook, this.filePath)
        } catch (error:any) {
            throw error
        }
        
    }

    /**
     * Handles reading the excel file and returns an array that contains the shifts
     * @returns An array of type ExcelData
     */
    public async readExcelFile(): Promise<Record<string, ExcelData[]>> {
        try {
            if (!fs.existsSync(this.filePath)) {
                throw new Error('Excel file does not exist');
            }

            //Refreshing workbook to get most recent updates if any occured
            this.refreshWorkbook();
            
            if(!this.workbook){
                throw new Error('Workbook is not loaded.');
            } 
            
            const sheetDataDict: Record<string, ExcelData[]> = {};

            this.workbook.SheetNames.forEach(sheetName => {
                if(sheetName !== 'Error Log'){
                    const worksheet = this.workbook?.Sheets[sheetName];
                    if(worksheet) {
                        sheetDataDict[sheetName] = XLSX.utils.sheet_to_json<ExcelData>(worksheet);
                    }
                }
            })

            return sheetDataDict

        } catch (error) {
            throw error
        }
    }

    /**
     * Handles writing into file. 
     * It is essentially handles saving shifts into the excel file.
     * @param sheetName the sheet name needing to be written into
     * @param data contains an array of shifts of type ExcelData
     */
    public async writeIntoFile(sheetName: string, data: ExcelData[]): Promise<void> {
        try {
            if(!fs.existsSync(this.filePath)) {
                await this.createNewWorkbook()
            }
            
            const existingData = await this.readExcelFile()

            //Check for an collision with shifts before adding
            if(this.checkCollidingData(existingData[sheetName], data)){
                throw new Error('Collision')
            }

            //Sort the shifts before adding
            const existingSheetData = existingData[sheetName];
            const updatedData = [...existingSheetData, ...data];
            this.sortShifts(updatedData)

            const updatedWorksheet = XLSX.utils.json_to_sheet(updatedData)

            //If the workbook was not found, create one and add shifts
            if(this.workbook) {
                this.workbook.Sheets[sheetName] = updatedWorksheet;
                XLSX.writeFile(this.workbook, this.filePath)
            } else {
                throw new Error('Workbook is not loaded.');
            }    

        } catch (error) {
            throw error
        }
    }

    /**
     * Checks for collision between existing shifts and new ones being added
     * @param existingData contains the previous shifts from file
     * @param data it is the new shift that is about to be added
     * @returns true if collision does occur and false if not 
     */
    private checkCollidingData(existingData: ExcelData[], data: ExcelData[]): boolean {
        
        const nonCollidingData = data.filter((newShift) => {
            return !existingData.some((existingShift) => {
                return (
                    existingShift.day === newShift.day && 
                    !(
                        //Converting to 24 hour format for comparision
                        this.convertTo24HourFormat(newShift.endTime) <= this.convertTo24HourFormat(existingShift.startTime) ||
                        this.convertTo24HourFormat(newShift.startTime) >= this.convertTo24HourFormat(existingShift.endTime)
                    
                ));
            });
        })

        if(nonCollidingData.length === 0) {
            return true
        }

        return false
    }

    /**
     * Handles conversion to 24hour format.
     * @param time - string
     * @returns 24 hour format of the given time
     */
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

    /**
     * Gets the day index based on dayOrder
     * ```
     * dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
     * ```
     * @param day - string
     * @returns a number referring to the list of day order
     */
    private getDayIndex(day: string):number{
        return this.dayOrder.indexOf(day);
    }

    /**
     * Handles the sorting of shifts by ascending format
     * @param shifts - List of ExcelData
     * @returns returns sorted shift
     */
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

    /**
     * Handles removal of shifts from the excel file
     * @param shiftToDelete 
     * @returns 
     */
    public async deleteFromFile(shiftToDelete: ExcelData, sheetName: string): Promise<void> {
        try{ 
            //Checking if the file exists at the file path
            if(!fs.existsSync(this.filePath)) {
                return;
            }

            const existingData = await this.readExcelFile();

            // Filter by removing the shift to delete
            const filteredData = existingData[sheetName].filter((row) => {
                return !Object.entries(shiftToDelete).every(([key, value]) => row[key as keyof ExcelData] === value);
            });

            // Storing to prepare for updating file
            const updatedWorksheet = XLSX.utils.json_to_sheet(filteredData, {skipHeader: false});

            // Check if workbook exists before updating file
            if(this.workbook){
                this.workbook.Sheets[sheetName] = updatedWorksheet;
            } else {
                throw new Error('Workbook is not loaded.');
            }

            //Write into the file
            XLSX.writeFile(this.workbook, this.filePath)

        } catch (error) {
            throw error
        }
    }

    /**
     * Reloads the excel file by reading the file again
     */
    private refreshWorkbook() {
        if(fs.existsSync(this.filePath)) {
            this.workbook = XLSX.readFile(this.filePath);
            this.worksheet = this.workbook.Sheets['Error Log']
        } else {
            this.createNewWorkbook();
        }
    }

    /**
     * Creates and adds new sheet based on provided sheetName 
     * @param sheetName holds what the sheet will be called
     */
    public async createNewSheet(sheetName: string){
        try{
            const headers = [['day', 'startTime', 'endTime']];
            this.worksheet = XLSX.utils.aoa_to_sheet(headers)
            if (this.workbook) {
                XLSX.utils.book_append_sheet(this.workbook, this.worksheet, sheetName);
                XLSX.writeFile(this.workbook, this.filePath)
            } else {
                throw new Error('Workbook is not loaded.');
            }
        } catch (error: any){
            throw error
        }
    }

    public async deleteSheet(sheetName: string){
        try{
            if(!this.workbook || !this.workbook.SheetNames.includes(sheetName)) {
                throw new Error (`Sheet "${sheetName}" does not exist.`)
            }

            //Remove sheet from the workbook
            delete this.workbook.Sheets[sheetName]

            //Remove the sheet name from the list
            this.workbook.SheetNames = this.workbook.SheetNames.filter(name => name !== sheetName);

            //Save changes
            XLSX.writeFile(this.workbook, this.filePath);
        } catch (error: any){
            this.logError('delete sheet', error.message);
        }
    }

    private logError(errorMessage: string, functionName: string): void {
        try {
            // Ensure everything is updated before logging error
            this.refreshWorkbook() 

            if(!this.workbook || !this.workbook.Sheets['Error Log']) {
                console.error('Error Log sheet is missing.')
                return;
            }

            const worksheet = this.workbook.Sheets['Error Log'];
            const data: any[] = XLSX.utils.sheet_to_json(worksheet, { header:1 });

            const timestamp = new Date().toISOString();
            data.push([timestamp, functionName, errorMessage])

            this.workbook.Sheets['Error Log'] = XLSX.utils.aoa_to_sheet(data);

            XLSX.writeFile(this.workbook, this.filePath);
        } catch (error) {
            console.error('Failed to log error:', error)
        }
    }
}