import { ipcMain } from 'electron';

export function isDev(): boolean {
    return process.env.NODE_ENV === 'development';
}
export interface ExcelData {
    day: string;
    startTime: string;
    endTime: string;
}

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
            data?: ExcelData[];
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
            message: string
        }
    },

    'quit-and-install': {
        request: void,
        response: {
            success: boolean,
            message: string
        }
    }
    //Add more events here
}

//Type helper for handlers
type IpcHandler<T> = (event: Electron.IpcMainInvokeEvent, ...args: any[]) => Promise<T> | T;

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