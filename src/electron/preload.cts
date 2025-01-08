import electron from "electron";
import type { EventPayloadMapping } from "./util.js" assert { "resolution-mode": "import" };

const electronAPI = {
    invoke<K extends keyof EventPayloadMapping>(
        channel: K,
        ...args: EventPayloadMapping[K]['request'] extends undefined
            ? []
            : [EventPayloadMapping[K]['request']]
    ): Promise<EventPayloadMapping[K]['response']> {
        return electron.ipcRenderer.invoke(channel, ...args)
    },

    on<K extends keyof EventPayloadMapping>(
        channel: K,
        listener: (event: Electron.IpcRendererEvent, ...args: EventPayloadMapping[K]['request'][]) => void
    ) : void {
        electron.ipcRenderer.on(channel, listener)
    },

    once<K extends keyof EventPayloadMapping>(
        channel: K,
        listener: (event: Electron.IpcRendererEvent, ...args: EventPayloadMapping[K]['request'][]) => void
    ) : void {
        electron.ipcRenderer.once(channel, listener)
    },

    removeListener<K extends keyof EventPayloadMapping>(
        channel: K,
        listener: (event: Electron.IpcRendererEvent, ...args: EventPayloadMapping[K]['request'][]) => void
    ) : void {
        electron.ipcRenderer.removeListener(channel, listener)
    },

    removeAllListener<K extends keyof EventPayloadMapping>(channel: K): void{
        electron.ipcRenderer.removeAllListeners(channel)
    }
    
};

electron.contextBridge.exposeInMainWorld('electron', electronAPI)
