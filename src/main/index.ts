import { app } from "electron"; 
export async function initDevTools() {
    if (app.isPackaged) {
        throw new Error("ucbuilder-devtools cannot be used in packaged apps.");
    }
    (await import('./buildTimeFn.ipc.js')).default();

    console.log('UcDevTools');
    await (await import('./fileWatcher.ipc.js')).default();
}