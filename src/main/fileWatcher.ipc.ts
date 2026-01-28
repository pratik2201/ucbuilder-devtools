import chokidar, { ChokidarOptions, FSWatcher } from "chokidar";
import fs from "fs";
import path from "path";
import { IpcMainGroup } from "ucbuilder/out/main/ipc/IpcMainHelper.js";
import { configManage } from "ucbuilder/out/main/ipc/configManage.js";
import { FILE_WARCHER_FILE_ROW, ucUtil } from "ucbuilder/out/global/ucUtil.js";
import url from "url";
import { GetProject, isSamePath } from "ucbuilder/out/common/ipc/enumAndMore.js";
export default async function () {
    const main = IpcMainGroup('ucbuilder-devtools/src/renderer/fileWatcher');

    const projectRoot = configManage.filler.MAIN_PROJECT_PATH;//path.resolve(); 
    const srcPath = projectRoot; //path.join(projectRoot, "src");
    const pathMapFile = path.join(projectRoot, "path-map.json");
    const ignoredList = [
        path.join(projectRoot, 'node_modules'),
        path.join(projectRoot, '.git'),
        path.join(projectRoot, 'out'),
        path.join(projectRoot, 'dist'),
    ];
    let rendererIgnorance: string[] = [];

    const watcherOptions: ChokidarOptions = {
        ignoreInitial: true,
        ignored: (file) => ignoredList.findIndex(s => isSamePath(s, file, path)) >= 0 &&
            rendererIgnorance.findIndex(s => isSamePath(s, file, path)) >= 0,
        //  [
        //     '**/node_modules/**',
        //     '**/.git/**',
        //    // '**/out/**',
        //    // '**/assets/**',
        //    // '**/dist/**',
        //     path.join(srcPath, 'out'),
        //     path.join(srcPath, 'dist'),
        // ],
        persistent: true,
        depth: undefined,     // watch all subfolders
        usePolling: true,     // more stable across OS types
        interval: 200,        // poll every 200ms
    };

    let eleEvent: Electron.IpcMainEvent;
    let IS_ON = false;
    main.On("startWatch", (e, _path) => {
        eleEvent = e;
        IS_ON = true;
        startWatch();
    });
    main.On("writeContents", (e, changedFiles: Record<string, string>) => {
        let __KEYS = Object.keys(changedFiles);
        rendererIgnorance.push(...__KEYS);
        rendererIgnorance = ucUtil.distinct(rendererIgnorance);
        for (const [_path, contents] of Object.entries(changedFiles)) {
            // console.log([_path, contents]);

            fs.writeFileSync(_path, contents, 'binary');
        }
        setTimeout(() => {
            rendererIgnorance = rendererIgnorance.filter(s => !__KEYS.includes(s));
        }, 1000);
        e.returnValue = true;
    });
    main.Handle("stopWatch", async (evt, _path) => {
        //watcher?.unwatch(srcPath);
        if (watcher != undefined)
            await watcher.close();//.then(() => console.log("Chokidar watcher stopped"));
        IS_ON = false;
        clearInterval(interval);
        return true;
    });
    // ---- STATE ----
    let pathMap = fs.existsSync(pathMapFile)
        ? JSON.parse(fs.readFileSync(pathMapFile, "utf-8"))
        : {};

    let unlinkCache = [];  // store recently removed files (for rename detection)
    const MOVE_TIME_DIFFERENCE = 3200;
    const WATCH_LIST: FILE_WARCHER_FILE_ROW = {
        unlink: {},
        modified: {},
        add: {},
        renamed: [],
        moved: [],
    };
    let watcher: FSWatcher;
    let interval = null;

    function startWatch() {
        // ---- WATCHER ----
        watcher = chokidar.watch(srcPath, watcherOptions);
        console.log(`[path-watcher] Watching ${srcPath}`);
        watcher
            .on("add", newPath => {
                WATCH_LIST.add[newPath] = Date.now();
                doProcess();
            })
            .on("unlink", removedPath => {
                WATCH_LIST.unlink[removedPath] = Date.now();
                doProcess();
            });
    }

    const { PathBridge } = await import("ucbuilder/out/global/pathBridge.js");
console.log(PathBridge.source);

    const project = GetProject(path.resolve(), PathBridge.source, url);
    const mainProjectUcConfig = project?.config;
    const preference = mainProjectUcConfig?.preference;
    const dirDeclaration = mainProjectUcConfig?.preference?.dirDeclaration;
    const srcDirDec = dirDeclaration[preference.srcDir];
    const srcFileWisePath = srcDirDec.fileDeclaration;
    const codeExtension = srcFileWisePath.code.extension;
    const outDirDec = dirDeclaration[preference.outDir];
    const outFileWisePath = outDirDec.fileDeclaration;
    const outcodeExtension = outFileWisePath.code.extension;
    // const outFileWisePath = outDirDec.fileWisePath;
    // const dirDecEntries = Object.entries(dirDeclaration);
    let isProcessing = false;
    function doProcess() {
        if (isProcessing) return;
        isProcessing = true;
        function analysis() {
            const newAr = ucUtil.JsonCopy(WATCH_LIST);
            mainProjectUcConfig.preference.dirDeclaration
            isProcessing = false;
            WATCH_LIST.add = {}; WATCH_LIST.modified = {}; WATCH_LIST.unlink = {};
            for (let [addedPath, addedTime] of Object.entries(newAr.add)) {
                for (let [unlinkPath, unlinkTime] of Object.entries(newAr.unlink)) {
                    if ((addedTime - unlinkTime) < MOVE_TIME_DIFFERENCE) {
                        const addedBaseName = path.basename(addedPath);
                        const unlinkBaseName = path.basename(unlinkPath);
                        if (addedBaseName === unlinkBaseName) {
                            delete newAr.add[addedPath];
                            delete newAr.unlink[unlinkPath];

                            if (unlinkPath.endsWith(codeExtension)) {
                                if (unlinkPath.endsWith(`.uc${codeExtension}`) ||
                                    unlinkPath.endsWith(`.tpt${codeExtension}`)) {
                                    let fromResult = PathBridge.Convert(unlinkPath, preference.srcDir as any, 'code').paths;
                                    let toResult = PathBridge.Convert(addedPath, preference.srcDir as any, 'code').paths;
                                    for (const [k, fromfile] of Object.entries(fromResult)) {
                                        if (fromfile.code != undefined)
                                            newAr.moved.push({ from: fromfile.code, to: toResult[k]?.code });

                                        if (fromfile.designer != undefined)
                                            newAr.moved.push({ from: fromfile.designer, to: toResult[k]?.designer });

                                    }
                                } else {
                                    newAr.moved.push({
                                        from: ucUtil.changeExtension(unlinkPath, codeExtension, outcodeExtension),
                                        to: ucUtil.changeExtension(addedPath, codeExtension, outcodeExtension),
                                    });
                                }
                            } else {
                                newAr.moved.push({ from: unlinkPath, to: addedPath });
                            }
                            break;
                        }
                    }
                }
            }
            main.Reply("updates", eleEvent, JSON.stringify(newAr));
        }
        let to = setTimeout(analysis, 3000);
    }
}
/*function detectRename(newFile) {
    const now = Date.now();
    const matchIndex = unlinkCache.findIndex(
        e => {
            return now - e.time < MOVE_TIME_DIFFERENCE && path.basename(e.path) === path.basename(newFile);
        }
    );
    if (matchIndex !== -1) {
        const oldFile = unlinkCache[matchIndex].path;
        unlinkCache.splice(matchIndex, 1);
        main.Reply("watch_moved", eleEvent, oldFile, newFile);
        const key = Object.keys(pathMap).find(k => pathMap[k] === oldFile);
        if (key) {
            pathMap[key] = newFile;
            savePathMap();
        }
        return true;
    }

    return false;
}
function startWatch() {
    // ---- WATCHER ----
    console.log(watcherOptions);

    watcher = chokidar.watch(srcPath, watcherOptions);
    console.log(`[path-watcher] Watching ${srcPath}`);

    watcher
        .on("add", newPath => {
            if (!detectRename(newPath)) {
                // console.log("🟢 File added:", newPath);
                pathMap[newPath] = newPath;
                //savePathMap();
            }
        })
        .on("unlink", removedPath => {
            //console.log("🔴 File removed:", removedPath);

            unlinkCache.push({ path: removedPath, time: Date.now() });
            const entry = Object.keys(pathMap).find(k => pathMap[k] === removedPath);
            if (entry) delete pathMap[entry];
            //savePathMap();
            main.Reply("watch_removed", eleEvent, removedPath);
        })
    // ---- PERIODIC SYNC ----
    interval = setInterval(() => {
        console.log("🧩 Background sync running...");
        const now = Date.now();
        unlinkCache = unlinkCache.filter(e => now - e.time < MOVE_TIME_DIFFERENCE);
    }, 5000);
}
*/