import { ipcMain } from 'electron';
import { UpdateCheckResult } from 'electron-updater';

export function isDev(): boolean {
    return process.env.NODE_ENV === 'development';
}

//Definds how shifts are sorted in Excel file
export interface ExcelData {
    day: string;
    startTime: string;
    endTime: string;
}

//This is where all ipc handlers format are defined
export interface EventPayloadMapping {
    'check-and-create-file' : {
        response: {
            status: 'created' | 'exists';
            filePath: string;
        };
        request: void;
    };

    'read-excel-file': {
        request: void,
        response: {
            success: boolean;
            data?: Record<string, ExcelData[]>;
            error?: string;
        };
    };

    'write-into-file': {
        request: void,
        response: {
            success: boolean;
            error?: string;
        }
    },

    'delete-from-file': {
        request: void,
        response: {
            success: boolean;
            error?: string;
        }
    },

    'run-script': {
        request: void,
        response: {
            success: boolean;
            error?: string;
        }
    },

    'progress-update': {
        request: void,
        response: {
            success: boolean;
            message: string;
            isFinal: boolean;
        }
    },

    'confirm-or-cancel': {
        request: void,
        response: {
            confirmed: boolean
        }
    },
    
    'check-for-updates': {
        request: void,
        response: {
            success: boolean,
            message: string,
            check: UpdateCheckResult | null
        }
    },

    'quit-and-install': {
        request: void,
        response: {
            success: boolean,
            message: string
        }
    },

    'start-download': {
        request: void,
        response: {
            succcess: boolean,
            message: string
        }
    },

    'open-external': {
        request: { url: string },
        response: void
    },

    'get-platform': {
        request: void,
        response: { platform: string }
    },

    'confirm-run-script': {
        request: void,
        response: { 
            confirmed: boolean 
        }
    },

    'create-new-sheet': {
        request: { sheetName: string },
        response: {
            success: boolean,
            error?: string
        }
    }
    //Add more events here
}

//Type helper for handlers
type IpcHandler<T> = (event: Electron.IpcMainInvokeEvent, ...args: any[]) => Promise<T> | T;

//Create an ipc main to handle ipc connections
export function createIpcMain() {
    return {
        handle<K extends keyof EventPayloadMapping>(
            channel: K,
            handler: IpcHandler<EventPayloadMapping[K]['response']>
        ) {
            return ipcMain.handle(channel, handler);
        }
    }
}

//Provides information about the platform application is running on
export async function getPlatform(): Promise<string> {
    const platform = process.platform;
    const arch = process.arch
    if(platform === "win32") {
        return "win32"
    } else if(platform === "darwin") {
        return arch === "arm64" ? "mac-arm64" : "mac-x64"
    }
    
    throw new Error("Unsupported platform. Only Windows or MacOS are supported.")
}