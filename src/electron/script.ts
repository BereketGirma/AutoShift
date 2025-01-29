import https from 'https';
import fs from 'fs';
import path from'path';
import unzipper from 'unzipper';
import { Builder, By, until } from 'selenium-webdriver';
import { Options, ServiceBuilder } from 'selenium-webdriver/chrome.js';
import { app, ipcMain } from 'electron';
import { exec } from 'child_process';
import { BrowserWindow } from 'electron'
import { ExcelData } from './util.js';
import dayjs from 'dayjs';

//Interface for what shift should contain
interface ShiftFormat {
    date: string;
    startTime: string;
    endTime: string;
}


const driverDir = path.resolve(app.getPath('userData'), `chrome-driver`); //Driver path
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
        } else if(platform === "linux") {
            command = 'google-chrome --version || google-chrome-stable --version'
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
        //Fetching the chromedriver
        https.get(chromedriverURL, async (response: any) => {
            //If the driver wasn't found, attempt fallback version
            if(response.statusCode !== 200) {
                const fallbackVersion = await adjustVersion(version);
                const fallbackURL = `https://storage.googleapis.com/chrome-for-testing-public/${fallbackVersion}/${platformFile}/chromedriver-${platformFile}.zip`
                https.get(fallbackURL, (fallbackResponse: any) => {
                    //Return error if fallback didn't work as well
                    if(fallbackResponse.statusCode !== 200){
                        reject(new Error(`Failed to download chromedriver. HTTP Status: ${fallbackResponse.statusCode}`));
                        return;
                    }
                })
            }

            //Check download was successful 
            if(!fs.existsSync(driverDir)) {
                fs.mkdirSync(driverDir, { recursive: true })
            }

            const file = fs.createWriteStream(zipPath);
            response.pipe(file);

            file.on('finish', async () => {
                file.close();

                //Try to unzip chromedriver
                try{
                    await fs
                        .createReadStream(zipPath)
                        .pipe(unzipper.Extract({ path: driverDir }))
                        .promise()
                    fs.unlinkSync(zipPath);

                    //Set executable permissions for chromedriver
                    fs.chmodSync(chromedriverPath, 0o755);

                    resolve();
                } catch (error) {
                    reject(new Error(`Failed to extract Chromedriver: ${error}`))
                }
            });
        }).on('error', (error: any) => {
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
        sendProgressUpdates(window, "Chromedriver already exists.", false)
    } else {
        sendProgressUpdates(window, "Chromedriver not found. Fetching the latest version...", false);
        const driverVersion = await getCurrentChromeVersion();
        sendProgressUpdates(window, `Latest Chromedriver version: ${driverVersion}`, false);
        await downloadChromedriver(driverVersion);
        sendProgressUpdates(window, 'Chromedriver downloaded successfully', false);
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
async function generateSchedule(shifts: ExcelData[], startDate: string, endDate: string){
    const schedule: { date: string; startTime: string; endTime: string }[] = [];

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
        console.log('something aint right')
    }

    //Looping through the given window of start and end date
    let currentDate = start
    while (currentDate.isBefore(end) || currentDate.isSame(end)){

        const currentDayOfWeek = currentDate.day()
        //Looping through the given shifts to see which match the current date that is set
        //It will add into an array once if finds a match
        for(const shift of shifts){
            if(dayOfWeekMap[shift.day as keyof typeof dayOfWeekMap] === currentDayOfWeek){
                schedule.push({
                    date: currentDate.format('YYYYMMDD'),
                    startTime: await formatTime(shift.startTime),
                    endTime: await formatTime(shift.endTime)
                })
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
async function runSeleniumScript(window: any, data: ExcelData[], startDate: string, endDate: string): Promise<void> {
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
    //Initializing driver
    const options = new Options()
    const driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .setChromeService(new ServiceBuilder(chromedriverPath))
        .build();
        
    //Array to store any shifts skipped due to an error
    const shiftsSkipped: { date: string; startTime: string; endTime: string }[] = [];

    try{
        //Launch driver and open the link
        await driver.get("https://eservices.minnstate.edu/finance-student/timeWorked.do?campusid=071");

        //Wait 2 minutes for the Add Time button to show up
        //This is where the user has 2 minutes to login to website. it will terminate if not logged in with specified time 
        const elementToWaitFor = By.id('addTime')
        await driver.wait(until.elementLocated(elementToWaitFor), 120000)

        //Initilizing driver window to control if window should be hidden
        const driverWindow = driver.manage().window()
        // await driverWindow.minimize()
        
        //Loop through the shift queue provided
        while(shiftQueue.length > 0){
            //Dequeue the first shift
            const currentShift = shiftQueue.shift()
            if(!currentShift){
                break
            }

            //Find addTime element and click on it once found
            const addTimeButton = await driver.findElement(elementToWaitFor)
            addTimeButton.click()

            //Select the shift start date. Will wait 1second until element is loaded in
            const startDateSelector = await driver.wait(until.elementLocated(By.id("date")), 1000);
            const startDateElement = By.css(`option[value="${currentShift.date}"]`)

            //Checking of the start date exists in the list of options
            if(await elementExists(driver, startDateElement)){
                const startDateOption = await startDateSelector.findElement(By.css(`option[value="${currentShift.date}"]`))
                //Choose it if it exists
                await startDateOption.click()
            } else {
                //If it doesn't exists, cancel and change the time frame through pay period
                const cancelButton = await driver.wait(until.elementLocated(By.className("cancelButton")), 1000)
                await cancelButton.click()

                //Clear existing choice and enter the date option into the pay period to switch
                const dateInput = await driver.wait(until.elementLocated(By.id('payPeriodDate2')), 1000)
                await dateInput.clear()
                await dateInput.sendKeys(`${currentShift.date.slice(4,6)}/${currentShift.date.slice(-2)}/${currentShift.date.slice(0,4)}`)

                //Finds retrieve button and click it 
                const retrieveButton = await driver.wait(until.elementLocated(By.id('retrieveDateLink')), 1000);
                await retrieveButton.click()

                //Find add time button and click it
                const addTimeButton = await driver.findElement(elementToWaitFor)
                addTimeButton.click()
            }

            //Select the time where shift starts
            const startTimeSelector = await driver.wait(until.elementLocated(By.id("startTime")), 1000);
            const startTimeOption = await startTimeSelector.findElement(By.css(`option[value="${currentShift.startTime}"]`))
            await startTimeOption.click()

            //Select the time where shift ends
            const endTimeSelector = await driver.wait(until.elementLocated(By.id("endTime")), 1000);
            const endTimeOption = await endTimeSelector.findElement(By.css(`option[value="${currentShift.endTime}"]`))
            await endTimeOption.click()

            //Save the selected shift
            const saveTimeButton = await driver.findElement(By.id("timeSaveOrAddId"));
            await saveTimeButton.click()

            //When clicking save, if error pops up, add into shifts being skipped
            if(await elementExists(driver, By.id("errorMessageHolder"))) {
                shiftsSkipped.push({
                    date: currentShift.date,
                    startTime: currentShift.startTime,
                    endTime: currentShift.endTime
                })

                //Check if the error message was a class conflict
                if(await elementExists(driver, By.id("classReasonCode"))) {
                    //Wait until user confirms through UI
                    const userConfirmed = await waitForConfirmation(window, currentShift)
                    
                    //If confirmed, keep adding shift
                    if(userConfirmed){
                        const continueButton = await driver.findElement(By.id("continueId"))
                        await continueButton.click()
                        continue
                    } else {
                        //If not, then cancel adding shift
                        const goBackButton = await driver.findElement(By.className("cancelOnWarningButton"))
                        await goBackButton.click()
                    }
                }

                //Cancel again to go back to initial page
                const cancelButton = await driver.wait(until.elementLocated(By.className("cancelButton")))
                await cancelButton.click()
            }
        }

        //If no error occurs in the way, this will send a UI progress update
        sendProgressUpdates(window, "Shift's successfully added!", true);
        await driver.sleep(5000)
        
        return

    } catch(error){
        console.log(error)
        sendProgressUpdates(window, "Error occured while adding shifts.", true)
    } finally {
        //Quit driver after process is done
        console.log(shiftsSkipped)
        await driver.quit();
    }
}

/**
 * Checks if a certain element exists on the webpage
 * @param driver chromedriver that is initalized in script
 * @param element this is the element that is being searched for
 * @returns if the desired element exists returns true, if not then false
 */
async function elementExists(driver: any, element: any): Promise<boolean>{
    try{
        await driver.findElement(element)
        return true;
    } catch (error: any) {
        if(error.name === "NoSuchElementError") {
            return false;
        }
        throw error
    }
}

//Only exporting the selenium script since other functions are used by it already
export { runSeleniumScript };