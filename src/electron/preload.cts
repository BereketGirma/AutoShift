const electron = require("electron");

electron.contextBridge.exposeInMainWorld("electron", {
    checkAndCreateFile: async () => {
        return electron.ipcRenderer.invoke('check-and-create-file')
    }
})
