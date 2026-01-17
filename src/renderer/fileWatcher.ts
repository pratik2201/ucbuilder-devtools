import { FILE_WARCHER_FILE_ROW, ucUtil } from "ucbuilder/out/global/ucUtil.js";
import { IpcRendererHelper } from "ucbuilder/out/renderer/ipc/IpcRendererHelper.js";
import { nodeFn } from "ucbuilder/out/renderer/nodeFn.js"; 
import { builder } from "./builder.js";
export class fileWatcher {
    constructor(main: builder) { this.main = main; }
    main: builder;
    static renderer = IpcRendererHelper.Group('ucbuilder-devtools/src/renderer/fileWatcher');
    WATCH_LIST = {
        removed: [] as string[],
        modified: [] as string[],
        moved: [] as { oldFile: string, newFile: string }[],
    }
    clear() {
        this.WATCH_LIST.modified.length =
            this.WATCH_LIST.removed.length =
            this.WATCH_LIST.moved.length = 0;
    }
    init() {
        const _this = this;

        fileWatcher.renderer.on("updates", (e, update: string) => {
            this.doRecursion(update);
        });
    }

   // depScanner = new UcDependencyScanner(nodeExp.path as any, nodeFn.fs as any);
    static getImportTypeRelativePath = (pth: string) => {
        if (pth.startsWith('./') || pth.startsWith('../')) return pth;
        else return `./${pth}`;
    }
    GET_REL_PATH = (update: FILE_WARCHER_FILE_ROW, InIndex: number, findable_filepath: string, _path: string) => {
        const rtrn = {
            isChanged: false as boolean,
            path: undefined as string,
        }
        if (InIndex == -1) {
            let fpath = nodeFn.path.resolveFilePath(findable_filepath, _path);
            let findex = update.moved.findIndex(s => {
                return nodeFn.path.isSamePath(s.from, fpath);
            });
            let REL_PATH = '';
            if (findex != -1) {
                REL_PATH = nodeFn.path.relativeFilePath(findable_filepath, update.moved[findex].to);
                rtrn.isChanged = true;
                rtrn.path = fileWatcher.getImportTypeRelativePath(REL_PATH);
            }
        } else {
            let isJsfile = _path.endsWith('.js');
            //if (isJsfile && !_path.startsWith('./') && !_path.startsWith('../')) return rtrn;

            let oldFullPath = nodeFn.path.resolveFilePath(findable_filepath, _path);
            let OutIndex = update.moved.findIndex(s => {
                return nodeFn.path.isSamePath(s.from, oldFullPath);
            });
            let IS_ALSO_IMPORT_POINT_TO_OLD_FILE = OutIndex != -1;
            let REL_PATH = IS_ALSO_IMPORT_POINT_TO_OLD_FILE ?
                nodeFn.path.relativeFilePath(update.moved[InIndex].to, update.moved[OutIndex].to)
                :
                nodeFn.path.relativeFilePath(update.moved[InIndex].to, oldFullPath);

            rtrn.isChanged = true;
            rtrn.path = isJsfile ? fileWatcher.getImportTypeRelativePath(REL_PATH) : REL_PATH;
        }
        return rtrn;
    }
    static PATTERN: RegExp = /import\s+(.*?)\s+from\s+["'](\.{1,2}\/[^"']+\.js)["']|import\s*\(\s*["'](\.{1,2}\/[^"']+\.js)["']\s*\)|\s+x-from\s*=\s*"([^"]+\.html)"\s*|@import\s+["']([^"']+(?:\.css|\.scss))["']\s*;|@use\s+["']([^"']+(?:\.css|\.scss))["']\s*;|\{:\s*([^}]+)\}/g;
    ///(x-from)\s*=\s*"(.*?)"|(import\s+.*?)\s+from\s+["'](.*?)["'];|(@use|@import)\s["'](.*?)["'];|({:)(.*?)}/gi;
    doRecursion = (updateStr: string) => {
        const _builder = this.main;
        const update: FILE_WARCHER_FILE_ROW = JSON.parse(updateStr);

        const _this = this;
        const changedFiles = new Map<string, string>();

        const pref = this.main.project.config.preference;
        let bpath = nodeFn.path.join(_this.main.project.projectPath, pref.dirDeclaration[pref.srcDir].dirPath as any);
        //console.log(update);
        _builder.recursive(bpath, undefined, async (recursive_filepath) => {
            if (fileWatcher.isValidFileForPathReplacer(recursive_filepath)) {
                let ext = recursive_filepath.slice(recursive_filepath.lastIndexOf('.'));
                if (!nodeFn.fs.existsSync(recursive_filepath)) { console.log(recursive_filepath); return; }
                let data = nodeFn.fs.readFileSync(recursive_filepath, 'binary');
                let isChanged = false;
                recursive_filepath = ucUtil.changeExtension(recursive_filepath, '.ts', '.js');
                let InIndex = update.moved.findIndex(s => {
                    return nodeFn.path.isSamePath(s.to, recursive_filepath);
                });
                let IS_CURRENT_FILE_MOVED = InIndex != -1;
                let findable_filepath = IS_CURRENT_FILE_MOVED ? update.moved[InIndex].from : recursive_filepath;
                data = data.replace(fileWatcher.PATTERN, (
                    fullMatch,
                    tsfromModule,
                    tsImport,            // group 1
                    tsAsyncImport,            // group 1
                    htmlXFrom,           // group 2
                    scssImport,          // group 3
                    scssUse,             // group 4
                    customPath           // group 5
                ) => {
                    if (tsImport !== undefined) {
                        let stts = this.GET_REL_PATH(update, InIndex, findable_filepath, tsImport);
                        if (stts.isChanged) {
                            isChanged = true;
                            return `import ${tsfromModule} from "${stts.path}"`;
                        }
                    }
                    if (tsAsyncImport !== undefined) {
                        let stts = this.GET_REL_PATH(update, InIndex, findable_filepath, tsAsyncImport);
                        if (stts.isChanged) {
                            isChanged = true;
                            return `import ("${stts.path}")`;
                        }
                    }
                    if (htmlXFrom !== undefined) {
                        let stts = this.GET_REL_PATH(update, InIndex, findable_filepath, htmlXFrom);
                        if (stts.isChanged) {
                            isChanged = true;
                            return ` x-from="${stts.path}" `;
                        }
                    }
                    if (scssImport !== undefined) {
                        let stts = this.GET_REL_PATH(update, InIndex, findable_filepath, scssImport);
                        if (stts.isChanged) {
                            isChanged = true;
                            return `@import "${stts.path}"; `;
                        }
                    }
                    if (scssUse !== undefined) {
                        let stts = this.GET_REL_PATH(update, InIndex, findable_filepath, scssUse);
                        if (stts.isChanged) {
                            isChanged = true;
                            return `@use "${stts.path}"; `;
                        }
                    }
                    if (customPath !== undefined) {
                        let stts = this.GET_REL_PATH(update, InIndex, findable_filepath, customPath);
                        if (stts.isChanged) {
                            isChanged = true;
                            return `{:${stts.path}}`;
                        }
                    }
                    return fullMatch;
                });
                recursive_filepath = ucUtil.changeExtension(recursive_filepath, '.js', '.ts');
                if (isChanged) changedFiles.set(recursive_filepath, data);

            }
        });
        console.log(Array.from(changedFiles.keys()).join('\n') + '\nFiles Modified');

        fileWatcher.renderer.sendSync('writeContents', [Object.fromEntries(changedFiles.entries())]);
        _builder.buildALL();
    }
    isGenerating = false;
    isCollectiong = false;
    static isTSFile(filePath: string) { return filePath.match(/\.ts$/i) != null; }
    static isHTMLFile(filePath: string) { return filePath.match(/\.uc\.html$|\.tpt\.html$/i) != null; }
    static isUcHTMLFile(filePath: string) { return filePath.match(/\.uc\.html$/i) != null; }
    static isSCSSFile(filePath: string) { return filePath.match(/\.scss$/i) != null; }
    static isValidFileForPathReplacer(filePath: string) { return filePath.match(/\.ts$|\.scss$|\.html$/i) != null; }
    startWatch() {
        const pref = this.main.project.config.preference;
        let bpath = nodeFn.path.join(this.main.project.projectPath, pref.dirDeclaration[pref.srcDir].dirPath as any);
        fileWatcher.renderer.send("startWatch", [bpath]);
    }
    async stopWatch() {
        return await fileWatcher.renderer.Invoke("stopWatch", []);
    }

}