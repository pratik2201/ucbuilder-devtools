import fs from "node:fs";
import { IpcMainGroup } from "ucbuilder/out/main/ipc/IpcMainHelper.js";
//import { I_WriteFileSyncPerameters } from "./buildTimeFn.js";

export default function () {

    const main = IpcMainGroup('ucbuilder-devtools/src/renderer/buildTimeFn');


    main.On('fs.rmSync', (event, path: fs.PathLike, options?: fs.RmOptions) => {
        event.returnValue = fs.rmSync(path, options);
    });
   

    main.On('fs.mkdirSync', (event, path: string, options: fs.MakeDirectoryOptions) => {
        event.returnValue = fs.mkdirSync(path, options);
    });
    main.On('fs.readdirSync', (event, path: string, encode: BufferEncoding) => {
        event.returnValue = fs.readdirSync(path, encode);
    });

    main.On('fs.writeFileSync', (event, argsPath, argsData, options?: fs.WriteFileOptions) => {  //args: I_WriteFileSyncPerameters
        event.returnValue = fs.writeFileSync(argsPath, argsData, options);
    });
}