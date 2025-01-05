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
const chromedriverPath = path.join(driverDir, 'chromedriver');


function getPlatform(): string {
    const platform = process.platform;
    if(platform === "win32") return "chromedriver_win32.zip"
    if(platform === "darwin") return "chromedriver_mac64.zip"
    if(platform === "linux") return "chromedriver_linux64.zip"
    throw new Error("Unsupported platform. Only Windows, MacOS and Linux are supported.")
}
async function fetchLatestChromedriverVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
        https.get('https://chromedriver.storage.googleapis.com/LATEST_RELEASE', (response: any) => {
            if(response.statusCode !== 200) {
                reject(new Error(`Failed to fetch Chromedriver version. HTTP Status: ${response.statusCode}`));
                return;
            }
            
            let version = '';
            response.on("data", (chunk: any) => {
                version += chunk
            });

            response.on("end", () => {
                resolve(version.trim());
            });
        }).on('error', (error: any) => {
            reject(`Error fetching Chromedriver version: ${error}`)
        });
    });
}


// async function getCurrentChromeVersion(): Promise<string> {
//     return new Promise((resolve, reject) => {
//         exec('/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --version', (error: any, stdout: string) => {
//             if(error) {
//                 reject(new Error('Failed to get Chrome version'));
//                 return;
//             }
//             const versionMatch = stdout.match(/(\d+\.\d+\.\d+\.\d+)/)
//             if(versionMatch) {
//                 resolve(versionMatch[1])
//             } else {
//                 reject(new Error('Failed to parse Chrome version'))
//             }
//         })
//     })
// }

async function downloadChromedriver(version: string): Promise<void> {
    const platformFile = getPlatform();
    const chromedriverURL = `https://storage.googleapis.com/chrome-for-testing-public/131.0.6778.204/mac-x64/chromedriver-mac-x64.zip`
    const zipPath = path.join(driverDir, "chromedriver.zip");

    return new Promise((resolve, reject) => {
        https.get(chromedriverURL, (response: any) => {
            if(response.statusCode !== 200) {
                reject(new Error(`Failed to download Chromedriver. HTTP Status: ${response.statusCode}`));
                return
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
        const latestVersion = await fetchLatestChromedriverVersion();
        console.log(`Latest Chromedriver version: ${latestVersion}`);
        await downloadChromedriver(latestVersion);
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