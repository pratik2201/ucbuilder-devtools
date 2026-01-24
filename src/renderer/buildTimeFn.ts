import crypto from "crypto";
import fs from 'fs';
import { IpcRendererHelper } from "ucbuilder/out/renderer/ipc/IpcRendererHelper.js";

export class buildTimeFn {
    static renderer = IpcRendererHelper.Group('ucbuilder-devtools/src/renderer/buildTimeFn');
    static onReady(callback: () => void) {
        this.renderer.loaded(callback);
    }
    static crypto = {
        guid: () => { return this.renderer.sendSync('crypto.guid',[]); }
    }
    static fs = {

        rmSync: (path: fs.PathLike, options?: fs.RmOptions) => {
            return this.renderer.sendSync('fs.rmSync', [path, options]);
        },

        mkdirSync: (path: string, options: fs.MakeDirectoryOptions): string => {
            return this.renderer.sendSync('fs.mkdirSync', [path, options]);
        },
        readdirSync: (path: string, encode: BufferEncoding | null = 'utf-8'): string[] => {
            return this.renderer.sendSync('fs.readdirSync', [path, encode]);
        },
        writeFileSync: (path: string, data: string, encode: fs.WriteFileOptions = 'utf-8') => {
            return this.renderer.sendSync('fs.writeFileSync', [path, data, encode]);  //  [{ path: path, data: data, encode: encode } as I_WriteFileSyncPerameters]
        },
    }
}