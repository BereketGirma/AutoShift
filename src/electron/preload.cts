const electron = require("electron");
import type { EventPayloadMapping } from "./util.js" assert { "resolution-mode": "import" };

const electronAPI = {
    invoke<K extends keyof EventPayloadMapping>(
        channel: K,
        ...args: EventPayloadMapping[K]['request'] extends undefined
            ? []
            : [EventPayloadMapping[K]['request']]
    ): Promise<EventPayloadMapping[K]['response']> {
        return electron.ipcRenderer.invoke(channel, ...args)
    }
};

electron.contextBridge.exposeInMainWorld('electron', electronAPI)
