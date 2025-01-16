import path from "path";
import { app } from "electron"
import { isDev } from "./util.js"

//Handles the path of the preload file in windows and mac directories
export function getPreloadPath() {
    return path.join(
        app.getAppPath(),
        isDev() ? '.' : '..',
        '/dist-electron/preload.cjs'
    )
}