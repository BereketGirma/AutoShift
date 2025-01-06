import https from 'https';
import fs from 'fs';
import path from'path';
import unzipper from 'unzipper';
import { Builder } from 'selenium-webdriver';
import { ServiceBuilder } from 'selenium-webdriver/chrome.js';
import { app } from 'electron';
import { exec } from 'child_process';

// const userDataDir = app.getPath('userData');
const driverDir = path.resolve(app.getPath('userData'), `chrome-driver`);
const chromedriverPath = path.join(driverDir, `chromedriver-${await getPlatform()}/chromedriver`);


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
    return new Promise((resolve, reject) => {
        exec('/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --version', (error: any, stdout: string) => {
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
                // reject(new Error(`Failed to download Chromedriver. HTTP Status: ${response.statusCode}`));
                // return
                console.log(`Version ${version} not found, attempting fallback version...`)

                const fallbackVersion = await adjustVersion(version);
                const fallbackURL = `https://storage.googleapis.com/chrome-for-testing-public/${fallbackVersion}/${platformFile}/chromedriver-${platformFile}.zip`
                https.get(fallbackURL, (fallbackResponse: any) => {
                    if(fallbackResponse.statusCode !== 200){
                        console.log(`Fallback version ${fallbackVersion} failed!`)
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

async function ensureChromedriverExists(): Promise<void> {
    if(fs.existsSync(chromedriverPath)) {
        console.log("Chromedriver already exists.");
    } else {
        console.log("Chromedriver not found. Fetching the latest version...");
        const driverVersion = await getCurrentChromeVersion();
        console.log(`Latest Chromedriver version: ${driverVersion}`);
        await downloadChromedriver(driverVersion);
        console.log('Chromedriver downloaded successfully');
    }
}

async function runSeleniumScript(): Promise<void> {
    await ensureChromedriverExists();

    const driver = await new Builder()
        .forBrowser('chrome')
        .setChromeService(new ServiceBuilder(chromedriverPath))
        .build();

    try{
        await driver.get("https://example.com");
        console.log("Page loaded!");
    } finally {
        await driver.quit();
    }
}

export { runSeleniumScript };