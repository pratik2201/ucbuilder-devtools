# ucbuilder
:Shree Ganeshay Namah:<br />
**App Builder** – A modular UI framework for Electron-based applications.

---
# 🚀 BASIC INFO
this module is used for manage sources and structure of electron project <br>
this is **SINGLE BROWSER WINDOW** App system.

what kind of project it work for ?

    - it work for electron project 
    - package type =  es module
    

what it do in project ?
    
    - it generate designer files for you so you can easily access the control in ui.
    - template is used for generate htmlnode as ui of perticular piece of code.
    - all ui (usercontrols) will renderer in same browser window 
    - each ui will have their seperated styles in scss file
    - you can also import usercontrol from other projects.


# 🚀 INSTALLATION
how to install and setup in project ?
    
    npm i ucbuilder
---
`main.ts` (starting point of app).<br>
  3 required changes.
```ts
import { app, BrowserWindow, ipcMain, screen } from "electron";
import { IpcMainHelper } from "uucbuilder/out/main/ipc/IpcMainHelper.js"; // <-- import the library
let win: Electron.BrowserWindow;
app.on('ready', async () => {
    ...   
    // initelize main helper before `BrowserWindow` created
    await IpcMainHelper.init(ipcMain);  //  (mandetory)
    win = new BrowserWindow({
        ...
    });    
    ...
    //   loading file in browser (mandetory)
    IpcMainHelper.loadURL(pathToFileURL(join(__dirname, '../../index.html')).href, win, {
            baseURLForDataURL: pathToFileURL(join(__dirname, '../../')).href
        });
    
});
```
---
`preload.ts` 
```ts
import { contextBridge, ipcRenderer } from "electron";
import { IpcPreload } from "ucbuilder/out/main/ipc/IpcPreload.js";
IpcPreload.init(contextBridge, ipcRenderer);   // mandetory
```
---
Third one is `ucconfig.js`  (configuration)
```js
import UcDefaultConfig from "ucbuilder/out/ipc/userConfigManage.js";
export default UcDefaultConfig({    
    preference: {                
        dirDeclaration: {  //  add declaration of directory
            src: {
                dirPath: 'src',
                fileDeclaration: {  //  add declaration of files
                    code: { extension: '.ts' },
                    designer: { extension: '.designer.ts' },
                    dynamicDesign: { extension: '.html.ts' },
                }
            },
            out: {
                dirPath: 'out',
                fileDeclaration: {
                    code: { extension: '.js' },
                    designer: { extension: '.designer.js' },
                    dynamicDesign: { extension: '.html.js' },
                }
            }
        },
        fileCommonDeclaration: { //  set declaration of files
            designer: { subDirPath: 'designerFiles' },
            scss: { extension: '.scss' },
            html: { subDirPath: 'htmlFiles', extension: '.html' }
        },
        outDir: "out",  //(set dirDeclaration key as value)
        srcDir: "src",  //(set dirDeclaration key as value)
        build: {           
            RuntimeResources: [
                {
                    includeExtensions: [".html", ".scss", ".mjs", ".css", ".svg", ".png", ".jpg", ".ico"],
                    fromDeclare: "src",
                    toDeclares: ["out"]
                }
            ]
        },
    },
});
```

full explained about config in youtube video.

Links
---
github : [https://github.com/pratik2201/ucbuilder.git](https://github.com/pratik2201/ucbuilder.git)

 ## 📺 Video Tutorial

A complete step-by-step video guide 

🔔 Subscribe to get notified when it’s live:<br>
youtube : [https://youtu.be/GzXJulsTS8A?si=qhwbj0o9QTLnEwjk](https://youtu.be/GzXJulsTS8A?si=qhwbj0o9QTLnEwjk)


