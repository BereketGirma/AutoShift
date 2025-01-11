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


interface ShiftFormat {
    date: string;
    startTime: string;
    endTime: string;
}

const driverDir = path.resolve(app.getPath('userData'), `chrome-driver`);
const platform = await getPlatform();
const chromedriverPath = path.join(driverDir, `chromedriver-${platform}/${platform === 'win32'? '/chromedriver.exe' : '/chromedriver'}`);

function sendProgressUpdates(window: BrowserWindow, data: string, final: boolean): void {
    window.webContents.send('progress-update', { success:true, message: data, isFinal: final})
}

function waitForConfirmation(window: BrowserWindow, shift: ShiftFormat): Promise<boolean> {
    return new Promise((resolve) => {
        window.webContents.send('confirm-or-cancel',shift)

        ipcMain.once('confirm-or-cancel', (_event, response: { confirmed: boolean}) => {
            resolve(response.confirmed);
        })
    })
}

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

async function adjustVersion(version: string): Promise<string> {
    const versionParts = version.split(".");
    const versionChange = Number(versionParts[-1]) - 1
    versionParts[-1] = String(versionChange);
    return versionParts.join('.')
}

async function downloadChromedriver(version: string): Promise<void> {
    const platformFile = await getPlatform();
    const chromedriverURL = `https://storage.googleapis.com/chrome-for-testing-public/${version}/${platformFile}/chromedriver-${platformFile}.zip`
    const zipPath = path.join(driverDir, "chromedriver.zip");

    return new Promise((resolve, reject) => {
        https.get(chromedriverURL, async (response: any) => {
            if(response.statusCode !== 200) {
                const fallbackVersion = await adjustVersion(version);
                const fallbackURL = `https://storage.googleapis.com/chrome-for-testing-public/${fallbackVersion}/${platformFile}/chromedriver-${platformFile}.zip`
                https.get(fallbackURL, (fallbackResponse: any) => {
                    if(fallbackResponse.statusCode !== 200){
                        reject(new Error(`Failed to download chromedriver. HTTP Status: ${fallbackResponse.statusCode}`));
                        return;
                    }
                })
            }

            if(!fs.existsSync(driverDir)) {
                fs.mkdirSync(driverDir, { recursive: true })
            }

            const file = fs.createWriteStream(zipPath);
            response.pipe(file);

            file.on('finish', async () => {
                file.close();

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

async function generateSchedule(shifts: ExcelData[], startDate: string, endDate: string){
    const schedule: { date: string; startTime: string; endTime: string }[] = [];

    const dayOfWeekMap = {
        Sunday: 0,
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6
    }

    const start = dayjs(startDate)
    const end = dayjs(endDate)

    if(!start.isValid() || !end.isValid()){
        console.log('something aint right')
    }
    let currentDate = start
    while (currentDate.isBefore(end) || currentDate.isSame(end)){

        const currentDayOfWeek = currentDate.day()
        for(const shift of shifts){
            if(dayOfWeekMap[shift.day as keyof typeof dayOfWeekMap] === currentDayOfWeek){
                schedule.push({
                    date: currentDate.format('YYYYMMDD'),
                    startTime: await formatTime(shift.startTime),
                    endTime: await formatTime(shift.endTime)
                })
            }
        }
           
        currentDate = currentDate.add(1,'day')
    }

    return schedule
}

async function runSeleniumScript(window: any, data: ExcelData[], startDate: string, endDate: string): Promise<void> {
    sendProgressUpdates(window, 'Checking for chromedriver...', false)

    await ensureChromedriverExists(window);
    const shiftQueue = await generateSchedule(data, startDate, endDate)

    if(shiftQueue.length === 0){
        sendProgressUpdates(window, "Time frame window given is too small to run automation.", true)
        return
    }

    sendProgressUpdates(window, 'Starting script', false)

    const options = new Options()
    const driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .setChromeService(new ServiceBuilder(chromedriverPath))
        .build();
        

    const shiftsSkipped: { date: string; startTime: string; endTime: string }[] = [];

    try{
        await driver.get("https://eservices.minnstate.edu/finance-student/timeWorked.do?campusid=071");

        const elementToWaitFor = By.id('addTime')
        await driver.wait(until.elementLocated(elementToWaitFor), 120000)

        const driverWindow = driver.manage().window()
        // await driverWindow.minimize()
        
        while(shiftQueue.length > 0){
            //Dequeue the first shift
            const currentShift = shiftQueue.shift()
            if(!currentShift){
                break
            }

            const addTimeButton = await driver.findElement(elementToWaitFor)
            addTimeButton.click()

            const startDateSelector = await driver.wait(until.elementLocated(By.id("date")), 1000);
            const startDateElement = By.css(`option[value="${currentShift.date}"]`)

            if(await elementExists(driver, startDateElement)){
                const startDateOption = await startDateSelector.findElement(By.css(`option[value="${currentShift.date}"]`))
                await startDateOption.click()
            } else {
                const cancelButton = await driver.wait(until.elementLocated(By.className("cancelButton")), 1000)
                await cancelButton.click()

                const dateInput = await driver.wait(until.elementLocated(By.id('payPeriodDate2')), 1000)
                await dateInput.clear()
                await dateInput.sendKeys(`${currentShift.date.slice(4,6)}/${currentShift.date.slice(-2)}/${currentShift.date.slice(0,4)}`)

                const retrieveButton = await driver.wait(until.elementLocated(By.id('retrieveDateLink')), 1000);
                await retrieveButton.click()

                const addTimeButton = await driver.findElement(elementToWaitFor)
                addTimeButton.click()
            }


            const startTimeSelector = await driver.wait(until.elementLocated(By.id("startTime")), 1000);
            const startTimeOption = await startTimeSelector.findElement(By.css(`option[value="${currentShift.startTime}"]`))
            await startTimeOption.click()

            const endTimeSelector = await driver.wait(until.elementLocated(By.id("endTime")), 1000);
            const endTimeOption = await endTimeSelector.findElement(By.css(`option[value="${currentShift.endTime}"]`))
            await endTimeOption.click()

            const saveTimeButton = await driver.findElement(By.id("timeSaveOrAddId"));
            await saveTimeButton.click()

            
            if(await elementExists(driver, By.id("errorMessageHolder"))) {
                shiftsSkipped.push({
                    date: currentShift.date,
                    startTime: currentShift.startTime,
                    endTime: currentShift.endTime
                })

                if(await elementExists(driver, By.id("classReasonCode"))) {
                    const userConfirmed = await waitForConfirmation(window, currentShift)

                    if(userConfirmed){
                        const continueButton = await driver.findElement(By.id("continueId"))
                        await continueButton.click()
                        continue
                    } else {
                        const goBackButton = await driver.findElement(By.className("cancelOnWarningButton"))
                        await goBackButton.click()
                    }
                }

                const cancelButton = await driver.wait(until.elementLocated(By.className("cancelButton")))
                await cancelButton.click()
            }
        }

        sendProgressUpdates(window, "Shift's successfully added!", true);
        await driver.sleep(5000)
        
        return

    } catch(error){
        console.log(error)
        sendProgressUpdates(window, "Error occured while adding shifts.", true)
    } finally {
        console.log(shiftsSkipped)
        await driver.quit();
    }
}


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

export { runSeleniumScript };