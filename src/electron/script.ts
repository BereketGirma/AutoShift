import https from 'https';
import fs from 'fs';
import path from'path';
import os from 'os';
import unzipper from 'unzipper';
import { Builder, By, until, WebDriver, WebElement } from 'selenium-webdriver';
import { Options, ServiceBuilder } from 'selenium-webdriver/chrome.js';
import { app, ipcMain } from 'electron';
import { exec, execSync } from 'child_process';
import { BrowserWindow } from 'electron'
import { ExcelData } from './util.js';
import dayjs from 'dayjs';

//Interface for what shift should contain
interface ShiftFormat {
    date: string;
    startTime: string;
    endTime: string;
}

interface Shift {
    jobTitle: string,
    date: string;
    startTime: string;
    endTime: string;
    comment: string;
}


const driverDir = path.join(os.homedir(), 'AutoShift', 'chrome-driver'); //Driver path
const platform = await getPlatform(); //Type of platform
//Chrome Driver Path for Mac and Windows dynamically adjusted
const chromedriverPath = path.join(driverDir, `chromedriver-${platform}/${platform === 'win32'? '/chromedriver.exe' : '/chromedriver'}`);

/**
 * Handles sending process updates to UI
 * @param window The Main Electron window
 * @param data is the message that is send to be displayed on UI
 * @param final if it is the final update set true, if not keep false
 */
function sendProgressUpdates(window: BrowserWindow, data: string, final: boolean): void {
    window.webContents.send('progress-update', { success:true, message: data, isFinal: final})
}

/**
 * Sends a confirmation window to UI.
 * Awaits a response from the user before proceeding
 * @param window the main electron window
 * @param shift shift that causes conflict or error
 * @returns boolean value that will decide whether to add shift or not
 */
function waitForConfirmation(window: BrowserWindow, shift: ShiftFormat): Promise<boolean> {
    return new Promise((resolve) => {
        window.webContents.send('confirm-or-cancel',shift)

        ipcMain.once('confirm-or-cancel', (_event, response: { confirmed: boolean}) => {
            resolve(response.confirmed);
        })
    })
}

function runScriptConfirmation(window: BrowserWindow): Promise<boolean> {
    return new Promise((resolve) => {
        window.webContents.send('confirm-run-script')

        ipcMain.once('confirm-run-script', (_event, response: {confirmed: boolean}) => {
            resolve(response.confirmed)
        })
    })
}

/**
 * Checks what platform the app is running on
 * @returns platform type
 */
async function getPlatform(): Promise<string> {
    const platform = process.platform;
    const arch = process.arch
    if(platform === "win32") {
        return "win32"
    } else if(platform === "darwin") {
        return arch === "arm64" ? "mac-arm64" : "mac-x64"
    } else if(platform === "linux") {
        return "linux64"
    }
    throw new Error("Unsupported platform. Only Windows, MacOS and Linux are supported.")
}

/**
 * Checks what chrome version the device has and returns the version.
 * The version is used to download appropriate chromedriver as well
 * @returns chrome version that the machine has currently installed
 */
async function getCurrentChromeVersion(): Promise<string> {
    const platform = await getPlatform();
    return new Promise((resolve, reject) => {
        let command = "";
        if(platform === "win32") {
            command = 'reg query "HKEY_CURRENT_USER\\Software\\Google\\Chrome\\BLBeacon" /v version'
        } else if(platform.startsWith("mac")) {
            command = '/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --version'
        } else {
            reject(new Error("Unsupported platform"));
            return;
        }
        
        exec(command, (error: any, stdout: string) => {
            if(error) {
                reject(new Error('Failed to get Chrome version'));
                return;
            }
            const versionMatch = stdout.match(/(\d+\.\d+\.\d+\.\d+)/)
            if(versionMatch) {
                resolve(versionMatch[1])
            } else {
                reject(new Error('Failed to parse Chrome version'))
            }
        })
    })
}

/**
 * Handles adjusting chrome version to download fallback chromedriver
 * @param version this is the chrome version on device
 * @returns the adjusted chrome version
 * Example:
 * ```
 * currentVersion = "131.300.134"
 * adjustedVersion = "131.300.133"
 * ```
 */
async function adjustVersion(version: string): Promise<string> {
    const versionParts = version.split(".");
    const versionChange = Number(versionParts[-1]) - 1
    versionParts[-1] = String(versionChange);
    return versionParts.join('.')
}

/**
 * Handles downloading and sorting chromedriver at the specified path
 * @param version the chrome version that the device has
 * @returns 
 */
async function downloadChromedriver(version: string): Promise<void> {
    const platformFile = await getPlatform();
    const chromedriverURL = `https://storage.googleapis.com/chrome-for-testing-public/${version}/${platformFile}/chromedriver-${platformFile}.zip`
    const zipPath = path.join(driverDir, "chromedriver.zip");

    return new Promise((resolve, reject) => {
        if(fs.existsSync(driverDir)){
            fs.rmSync(driverDir, { recursive: true, force: true })
        }

        //Check download was successful 
        if(!fs.existsSync(driverDir)) {
            fs.mkdirSync(driverDir, { recursive: true })
        }

        const file = fs.createWriteStream(zipPath)
        
        //Fetching the chromedriver
        https.get(chromedriverURL, async (response: any) => {
            //If the driver wasn't found, attempt fallback version
            if(response.statusCode !== 200) {
                reject(new Error(`Failed to download chromedriver. HTTP Status: ${response.statusCode}`));
                return;
            }

            response.pipe(file)

            file.on('finish', async () => {
                file.close();

                //Try to unzip chromedriver
                try{
                    await fs
                        .createReadStream(zipPath)
                        .pipe(unzipper.Extract({ path: driverDir }))
                        .promise()
                    fs.unlinkSync(zipPath);

                    if(fs.existsSync(chromedriverPath)){
                        //Set executable permissions for chromedriver
                        fs.chmodSync(chromedriverPath, 0o755);
                    }
                    
                    resolve();
                } catch (error) {
                    reject(new Error(`Failed to extract Chromedriver: ${error}`))
                }
            });
        }).on('error', (error: any) => {
            console.error(error)
            reject(new Error(`Failed to download Chromedriver: ${error}`))
        });
    });
}

/**
 * Handles checking if the chromedriver exists. 
 * Automatically downloads the chromedriver that is need based on current chrome version on device
 * @param window the main electron window
 */
async function ensureChromedriverExists(window: BrowserWindow): Promise<void> {
    if(fs.existsSync(chromedriverPath)) {
        const driverVersion = await getInstalledChromeDriverVersion();
        const chromeVersion = await getCurrentChromeVersion();

        if(driverVersion === chromeVersion){
            sendProgressUpdates(window, "Chromedriver already exists.", false)
            return;
        } else {
            sendProgressUpdates(window, "Chromedriver version mismatch! Updating to compatible version", false)
        }
    } 

    const latestVersion = await getCurrentChromeVersion();
    sendProgressUpdates(window, `Latest Chromedriver version: ${latestVersion}`, false);
    await downloadChromedriver(latestVersion);
    sendProgressUpdates(window, 'Chromedriver downloaded successfully', false);
}

async function getInstalledChromeDriverVersion(): Promise<string | null> {
    try{
        let chromedriverExecutable = chromedriverPath;

        const command = `${chromedriverExecutable} --version`;

        //Using correct shell for the OS
        const shell = platform === "win32" ? "cmd.exe" : "/bin/bash"

        const output = execSync(command, { shell }).toString()
        const match = output.match(/ChromeDriver (\d+\.\d+.\d+\.\d+)/);
        return match ? match[1] : null;
    } catch (error: any){
        console.error('Error while getting installed chromedriver version',error);
        return null
    }
}

/**
 * Handles converting the time into desired format for adding into webpage
 * @param time can be start or end time of shift
 * @returns a format of HHMMAM or HHMMPM
 * Example:
 * ```
 * time = "8:00 AM"
 * result = "0800AM"
 * ```
 */
async function formatTime(time: string): Promise<string> {
    let formattedTime = time.replace(/[:\s]/g, "");

    const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i)
    if(match) {
        let hour = match[1];
        const minute = match[2];
        const period = match[3];

        if(hour.length === 1){
            hour = "0" + hour;
        }

        formattedTime = `${hour}${minute}${period}`
    }
    return formattedTime;
}

/**
 * Handles generating a shifts based on the given week worth of shifts, start and end date
 * @param shifts the week worth of shift provided
 * @param startDate start date of when the schedule beings 
 * @param endDate end date of when the schedule ends
 * @returns an array filled with the shifts spanning between the given start and end date
 */
async function generateSchedule(data: Record<string, ExcelData[]>, startDate: string, endDate: string){
    const schedule: { jobTitle: string, date: string; startTime: string; endTime: string, comment: string }[] = [];

    //Sorting days for easier comparison with dayjs type
    const dayOfWeekMap = {
        Sunday: 0,
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6
    }

    //Converting start and end date into dayjs objects
    const start = dayjs(startDate)
    const end = dayjs(endDate)

    if(!start.isValid() || !end.isValid()){
        return []
    }

    //Looping through the given window of start and end date
    let currentDate = start
    while (currentDate.isBefore(end) || currentDate.isSame(end)){

        const currentDayOfWeek = currentDate.day()
        //Looping through the given shifts to see which match the current date that is set
        //It will add into an array once if finds a match
        for(const sheetName in data) {
            if(data.hasOwnProperty(sheetName) && Array.isArray(data[sheetName]) && data[sheetName].length > 0){
                for(const shift of data[sheetName]){
                    if(dayOfWeekMap[shift.day as keyof typeof dayOfWeekMap] === currentDayOfWeek){
                        schedule.push({
                            jobTitle: sheetName,
                            date: currentDate.format('YYYYMMDD'),
                            startTime: await formatTime(shift.startTime),
                            endTime: await formatTime(shift.endTime),
                            comment: shift.comment ? shift.comment : ''
                        })
                    }
                }
            }
        }
        
        //Incrementing day
        currentDate = currentDate.add(1,'day')
    }

    return schedule
}

/**
 * Handles running the selenium script and automating the process of adding shifts
 * @param window main electron window
 * @param data this is the week worth of shift provided
 * @param startDate start date of when the shifts begin
 * @param endDate end date of when the shifts end
 * @returns 
 */

async function runSeleniumScript(window: any, data: Record<string, ExcelData[]>, startDate: string, endDate: string): Promise<void> {
    await runScriptConfirmation(window)

    sendProgressUpdates(window, 'Checking for chromedriver...', false)

    //Check if chrome driver exists
    await ensureChromedriverExists(window);

    //Prepare the shifts once driver is confirmed
    const shiftQueue = await generateSchedule(data, startDate, endDate)

    //If there is no shifts to add, terminate running script
    if(shiftQueue.length === 0){
        sendProgressUpdates(window, "Time frame window given is too small to run automation.", true)
        return
    }

    sendProgressUpdates(window, 'Starting script', false)

    const driver = await initializeDriver();
    const shiftsSkipped: typeof shiftQueue = [];

    try {
        await waitForUserLogin(driver);

        await proccessShifts(driver, shiftQueue, shiftsSkipped, window)

        sendProgressUpdates(window, "Shift's successfully added!", true)
        await driver.sleep(500);
    } catch (error) {
        console.error(error);
        sendProgressUpdates(window, "Error occured while adding shifts.", true);
    } finally {
        await driver.quit();
    }

}

// Initializes web driver
async function initializeDriver(): Promise<WebDriver>{
    const options = new Options()
    return  await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .setChromeService(new ServiceBuilder(chromedriverPath))
        .build();
}

/**
 * Opens the driver window and waits until user is logged in
 * @param driver Web driver that selenium is running on
 */
async function waitForUserLogin(driver: WebDriver): Promise<void>{
    //Launch driver and open the link
    await driver.get("https://eservices.minnstate.edu/finance-student/timeWorked.do?campusid=071");
    await driver.wait(until.elementLocated(By.id('addTime')), 120000);
}

async function proccessShifts(driver: WebDriver, shiftQueue: Shift[], shiftsSkipped: Shift[], window:any) {
    while (shiftQueue.length > 0) {
        const currentShift = shiftQueue.shift()
        if(!currentShift) break;

        const jobFound = await handleJobSelection(driver, currentShift);

        if(!jobFound) {
            shiftsSkipped.push(currentShift);
            continue;
        }

        await handleShiftEntry(driver, currentShift)

        const errorOccurred = await handleErrors(driver, currentShift, window);
        if(errorOccurred) {
            shiftsSkipped.push(currentShift);
        }
        
    }
}

async function handleJobSelection(driver: WebDriver, shift: Shift): Promise<boolean> {
    // Wait until job title renders
    await driver.wait(until.elementsLocated(By.css(".well.table-responsive")), 1000);

    // Job web containers
    const containers: WebElement[] = await driver.findElements(By.css(".well.table-responsive"));

    //Loop through job containers to find job title
    for (const container of containers){
        const headingText = (await container.findElement(By.css("h4.sectionHeading"))).getText();
        
        // Removing characters that cause errors
        const cleaned = (await headingText).replace(/[\/\\?\*\[\]]/g, '')

        //When job title found, hit add button
        if(cleaned.includes(shift.jobTitle)) {
            const addTimeButton = await container.findElement(By.css("a#addTime"));
            await driver.wait(until.elementIsVisible(addTimeButton), 500);
            await addTimeButton.click();
            return true;
        }
    }
    return false;
}

async function handleShiftEntry(driver: WebDriver, shift: Shift): Promise<void> {
    // Date selection logic (with pay period fallback)
    const dateSelector = await driver.wait(until.elementLocated(By.id("date")), 1000);
    const dateOption = By.css(`option[value="${shift.date}"]`);

    if(await elementIsVisible(driver, dateOption)) {
        await (await dateSelector.findElement(dateOption)).click()
    } else {
        const cancel = await driver.findElement(By.className("cancelButton"));
        await cancel.click()

        const dateInput = await driver.findElement(By.id('payPeriodDate2'));
        await dateInput.clear();
        await dateInput.sendKeys(formatDateToMMDDYYYY(shift.date));

        await driver.findElement(By.id('retrieveDateLink')).click()
        await driver.findElement(By.id("addTime")).click()
    }

    // Time and comment
    await driver.findElement(By.css(`select#startTime option[value="${shift.startTime}"]`)).click()
    await driver.findElement(By.css(`select#endTime option[value="${shift.endTime}"]`)).click()
    await driver.findElement(By.id("comments")).sendKeys(shift.comment);
    await driver.findElement(By.id("timeSaveOrAddId")).click();
}

/**
 * Handles formatting given string from `MMDDYYYY --> MM/DD/YYYY`
 * @param date format must be in `MMDDYYYY`
 * @returns string format of date `MM/DD/YYYY`
 */
function formatDateToMMDDYYYY(date: string): string {
    return `${date.slice(4,6)}/${date.slice(-2)}/${date.slice(0,4)}`
}

async function handleErrors(driver: WebDriver, shift: Shift, window: any): Promise<boolean> {
    if (await elementIsVisible(driver, By.id("errorMessageHolder"))) {
        if (await elementIsVisible(driver, By.id("classReasonCode"))) {
            const confirmed = await waitForConfirmation(window, shift);

            if(confirmed) {
                await driver.findElement(By.id("continueId")).click();
                return false;
            } else {
                await driver.findElement(By.className("cancelOnWarningButton")).click();
            }
        }

        if (await elementIsVisible(driver, By.className("cancelButton"))) {
            await driver.findElement(By.className("cancelButton")).click();
        }

        return true;
    }

    return false;
}

/**
 * Checks if a certain element exists on the webpage
 * @param driver chromedriver that is initalized in script
 * @param element this is the element that is being searched for
 * @returns if the desired element exists returns true, if not then false
 */
async function elementIsVisible(driver: any, locator: any): Promise<boolean>{
    try{
        const elemenet = await driver.wait(until.elementLocated(locator), 3000);
        await driver.wait(until.elementIsVisible(elemenet), 3000);
        return true;
    } catch (error: any) {
        return false;
    }
}

async function collectJobTitles(window: any): Promise<string[]> {
    //Check if chrome driver exists
    await ensureChromedriverExists(window);

    //Initializing driver
    const driver = await initializeDriver();

    const titlesList: string[] = [];

    try{
        //Launch driver and open the link
        await driver.get("https://eservices.minnstate.edu/finance-student/timeWorked.do?campusid=071");

        //Wait 2 minutes for the Add Time button to show up
        //This is where the user has 2 minutes to login to website. it will terminate if not logged in with specified time 
        const elementToWaitFor = By.id('addTime')
        await driver.wait(until.elementLocated(elementToWaitFor), 120000)

        //Initilizing driver window to control if window should be hidden
        const driverWindow = driver.manage().window()
        await driverWindow.minimize()
        
        const jobTitles = await driver.findElements(By.css('.well.table-responsive'))

        for(let job of jobTitles){
            try{
                await driver.executeScript("arguments[0].scrollIntoView();", job);
                let heading = await job.findElement(By.css('.sectionHeading'))
                let text = await heading.getText()
                let cleanedText = text.replace(/[\/\\?\*\[\]]/g, '')
                titlesList.push(cleanedText)
            } catch (error:any){
                console.warn('Failed to read sectionHeading for a job:', error.message)
            }
        }

        return titlesList

    } catch(error){
        console.error(error)
    } finally {
        //Quit driver after process is done
        await driver.quit();
    }

    return titlesList
}

//Only exporting the selenium script since other functions are used by it already
export { runSeleniumScript, collectJobTitles };