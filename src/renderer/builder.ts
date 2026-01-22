import { CommonEvent } from "ucbuilder/out/global/commonEvent.js";
import { CommonRow, dynamicDesignerElementTree } from "./buildRow.js";
import { buildTimeFn } from "./buildTimeFn.js";
import { codeFileInfo } from "ucbuilder/out/global/codeFileInfo.js";
import { DynamicToHtml,IHTMLxSource } from "ucbuilder/out/lib/WrapperHelper.js";
import { commonGenerator } from "./commonGenerator.js";
import { commonParser } from "./commonParser.js";
import { fileWatcher } from "./fileWatcher.js";
import { PathBridge } from "ucbuilder/out/global/pathBridge.js";
import { ProjectRowR } from "ucbuilder/out/common/ipc/enumAndMore.js";
import { ProjectManage } from "ucbuilder/out/renderer/ipc/ProjectManage.js"; 
import { nodeFn } from "ucbuilder/out/renderer/nodeFn.js";

export interface SourceCodeNode {
    designerCode?: string,
    jsFileCode?: string,
    htmlCode?: string,
}

export class builder {
    private ignoreDirs: string[] = [];
    project: ProjectRowR;
    ROOT_DIR = '';
    private static INSTANCE: builder;
    static GetInstance() {
        return this.INSTANCE ?? new builder();
    }
    constructor() {
        if (builder.INSTANCE != undefined) { throw new Error(`SINGLE INSTANCE ONLY use instead builder`); }
        this.ROOT_DIR = nodeFn.path.resolve('');
        this.project = ProjectManage.getInfoByProjectPath(this.ROOT_DIR);
        this.commonMng = new commonParser(this);
        this.filewatcher = new fileWatcher(this);
        this.filewatcher.init();
        const _this = this;
        this.project.config.preference.build.ignorePath.forEach(pth => {
            _this.addToIgnore(pth);
        });
    }
    projectDir: string = '';
    addToIgnore = (...pathlist: string[]) => {
        pathlist.forEach(p =>
            this.ignoreDirs.push(nodeFn.path.normalize(nodeFn.path.join(this.ROOT_DIR, p)))
        );
    }
    commonMng: commonParser;
    filewatcher: fileWatcher;
    Event = {
        onSelect_xName: new CommonEvent<(ele: HTMLElement, row: CommonRow) => void>()
    }
    async getAllDesignerXfiles() {
        const rtrn = {
            cinfo: [] as codeFileInfo[]
        };
        let results = [];
        const rootPath = nodeFn.path.resolve();
        const ign = [nodeFn.path.join(rootPath, 'node_modules')];
        const pref = this.project.config.preference;
        const srcDec = pref.dirDeclaration[pref.srcDir];
        const srcFileDec = srcDec?.fileDeclaration;
        const srcDynamicExt = srcFileDec?.dynamicDesign?.extension;
        const srcHtmlExt = srcFileDec?.html?.extension;
        if (srcDynamicExt == undefined) { console.log("!!! no dynamic design file (.html.js) "); }

        await this.recursive(nodeFn.path.join(this.project.projectPath, srcDec.dirPath),
            (pth) => false,
            async (fullpath) => {
                const extCode = codeFileInfo.getExtType(fullpath);
                if (extCode != 'none') {
                    const cInfo = new codeFileInfo();
                    const isDynamicFile = fullpath.endsWith(srcDynamicExt);
                    const isHtmlFile = fullpath.endsWith(srcHtmlExt);
                    if (isDynamicFile || isHtmlFile) {
                        cInfo.parseUrl(fullpath, pref.srcDir as any);
                        if (cInfo.pathOf == undefined /*|| !nodeFn.fs.existsSync(cInfo.pathOf.html)*/) return;
                        if (rtrn.cinfo.findIndex(s => (
                            (isHtmlFile && s.pathOf.html == cInfo.pathOf.html) ||
                            (isDynamicFile && s.pathOf.dynamicDesign == cInfo.pathOf.dynamicDesign)
                        )
                        ) == -1)
                            rtrn.cinfo.push(cInfo);
                    }
                }
            });
        return rtrn;
        /*const outExt = pref.dirDeclaration[pref.outDir]?.fileWisePath?.dynamicDesign?.extension;
        if (outExt == undefined) { throw new Error("!!!cant find output dynamic design file (.html.js) extension"); }
        await this.recursive(pref.outDir,
            (pth) => ign.findIndex(s => nodeExp.path.isSamePath(s, pth)) >= 0,
            async (fullpath) => {
                if (fullpath.endsWith(outExt))
                    results.push(fullpath);
            });
        return results;*/
    }
    nodex = {
        dynamicFiles: [] as string[],
        htmlFiles: [] as string[],
    }
    htmlToDynamic(htmlFilePath: string): string {
        if (htmlFilePath == undefined) return undefined;
        const htContent: string = nodeFn.fs.readFileSync(htmlFilePath);
        let rtrn = '';
        const source = new dynamicDesignerElementTree();
        function walk(node: HTMLElement, src: dynamicDesignerElementTree, depth = 0) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                src.nodeName = node.tagName;
                src.type = 'element';
                for (let attr of node.attributes)
                    src.props[attr.name] = attr.value;
                for (let child of node.childNodes) {
                    let childTree = new dynamicDesignerElementTree();
                    if (walk(child as HTMLElement, childTree, depth + 1) == true)
                        src.children.push(childTree);
                }
                return true;
            }
            else if (node.nodeType === Node.TEXT_NODE) {
                let text = node.nodeValue?.trim() ?? '';
                src.type = 'text';
                src.value = text;
                return text.length > 0;
            } else if (node.nodeType === Node.COMMENT_NODE) {
                let comment = node.nodeValue.trim();
                // console.log("Comment:", comment);
                src.type = 'text';
                if (comment.endsWith('?')) {
                    src.value = (comment.startsWith('? ') || comment.startsWith('?= ') || comment.startsWith("?php ")) ?
                        `<${comment}>` : `<!--${comment}-->`;
                } else src.value = `<!--${comment}-->`;
                return true;
            }

            return false;
        }
        let mainele = htContent["#$"]();
        walk(mainele, source);
        let c = this.commonMng.gen.filex('ts', '.uc', '.dynamicByHtml')(source);
        return c;
    }
     
    counter = 0;
    async buildALL(onComplete = () => { }, _fillReplacerPath = true) {
        let _this = this;
        let prj = this.project;
        if (prj.config.env == 'release') return;
        const pref = this.project.config.preference;
        const srcdirDeclaration = pref.dirDeclaration[pref.srcDir];
        const fileWisePath = srcdirDeclaration.fileDeclaration;
        const srcDeclareKey = pref.srcDir;
        const outDeclareKey = pref.outDir;
        const designerFileDeclaration = fileWisePath.designer;
        let designerPath = nodeFn.path.join(prj.projectPath, srcdirDeclaration.dirPath ?? '', designerFileDeclaration?.subDirPath ?? '');
        //console.log(designerPath);
        let cInfos = ((await _this.getAllDesignerXfiles())).cinfo;
        console.log(cInfos);
        console.log(nodeFn.resource.all());
        
        const messages = {
            generateOutputAndRetry: false
        }
        
        
        for (let index = 0; index < cInfos.length; index++) {
            const cinfo = cInfos[index];
            //if (cinfo.pathOf.html.includes('ledger$form')) debugger;
            const srcDec = cinfo.allPathOf[pref.srcDir];
            const outDec = cinfo.allPathOf[pref.outDir];
            let dynamicOutputPath = outDec.dynamicDesign;
            let dynamicOutputData = undefined as string;
            let hasDynamicOutput = nodeFn.fs.existsSync(dynamicOutputPath);
            if (hasDynamicOutput) {
                const dtodata = (await DynamicToHtml(dynamicOutputPath));
                dynamicOutputData = dtodata?.htmlSource();
                dynamicOutputData = dynamicOutputData?.trim() ?? '';
                if (dynamicOutputData.length > 0) {
                    const htnode = dynamicOutputData["#$"]();
                    if (htnode?.nodeName != undefined && htnode?.nodeType != undefined) {
                        commonGenerator.ensureDirectoryExistence(cinfo.pathOf.html);
                        try {
                            buildTimeFn.fs.writeFileSync(cinfo.pathOf.html, dynamicOutputData);
                        } catch (eee) {
                            console.warn(eee);
                        }
                    }
                } else {
                    if (nodeFn.fs.existsSync(srcDec.dynamicDesign)) {
                        const dynamicContent = nodeFn.fs.readFileSync(srcDec.dynamicDesign);
                        if (dynamicContent?.trim().length == 0) {
                            buildTimeFn.fs.writeFileSync(srcDec.dynamicDesign,
                                this.commonMng.gen.filex('ts', '.uc', '.dynamic')({}), 'utf-8');
                            console.log('GENERATE `output` AND REBUILD DESINGER..');
                        }
                    }
                }

                await this.commonMng.init(cinfo);
            } else {
                
                if (nodeFn.fs.existsSync(cinfo.pathOf.dynamicDesign)) {
                    console.log('GENERATE `output` AND REBUILD DESINGER..');
                }

                if (nodeFn.fs.existsSync(cinfo.pathOf.html))
                    await this.commonMng.init(cinfo);
            }
        }
        if (nodeFn.fs.existsSync(designerPath)) {
            let codeExt = fileWisePath.code.extension;
            let designerExt = fileWisePath.designer.extension;

            await this.recursive(designerPath, undefined, async (pth) => {
                if (pth.endsWith(designerExt)) {
                    let _pthObj = PathBridge.Convert(pth, pref.srcDir as any, 'designer')[pref.srcDir];
                    let bothExist = /*nodeFn.fs.existsSync(_pthObj.code) &&*/ (nodeFn.fs.existsSync(_pthObj.html) || nodeFn.fs.existsSync(_pthObj.dynamicDesign));
                    if (!bothExist) {
                        console.log(`${_pthObj.designer} file deleted...`);
                        buildTimeFn.fs.rmSync(_pthObj.designer)
                    }
                }
            });
        }
        this.commonMng.gen.generateFiles(this.commonMng.rows);
        onComplete();
        /*if (nodeFn.fs.existsSync(designerPath)) {
            let codeExt = fileWisePath.code.extension;
            let designerExt = fileWisePath.designer.extension;
 
            await this.recursive(designerPath, undefined, async (pth) => {
                if (pth.endsWith(designerExt)) {
                    let _pthObj = PathBridge.Convert(pth, pref.srcDir as any, 'designer')[pref.srcDir];
                    let bothExist = nodeFn.fs.existsSync(_pthObj.code) && (nodeFn.fs.existsSync(_pthObj.html) || nodeFn.fs.existsSync(_pthObj.dynamicDesign));
                    if (!bothExist) {
                        console.log(`${_pthObj.designer} file deleted...`);
                        nodeFn.fs.rmSync(_pthObj.designer)
                    }
                }
            });
        }
 
 
 
 
        const outCodeExt = pref.dirDeclaration[pref.outDir].fileWisePath.dynamicDesign.extension;
        let demandFiles = await _this.getAllDesignerXfiles();
        for (let i = 0; i < demandFiles.length; i++) {
            let dfile = demandFiles[i];
            let outDynamicDesignFile = nodeExp.path.resolve(dfile);
            if (nodeFn.fs.existsSync(outDynamicDesignFile)) {
                try {
                    let content = await DynamiccToHtml(outDynamicDesignFile);// new WrapperHelper(importUrl)
                    if (content != undefined) {
                        let cinfo = PathBridge.Convert(outDynamicDesignFile, outDeclareKey as any, 'dynamicDesign', srcDeclareKey as any)[srcDeclareKey];
                        commonGenerator.ensureDirectoryExistence(cinfo["html"]);
                        nodeFn.fs.writeFileSync(cinfo["html"], content, 'binary');
                    }
                } catch (e) {
                    console.log(e);
                }
            } else {
 
            }
        }
 
 
 
        let bpath = nodeExp.path.join(this.project.projectPath, this.project.config.developer.build.buildPath);
        await this.recursive(bpath, undefined, async (pth) => {
            await _this.checkFileState(pth);
        });
        this.commonMng.gen.generateFiles(this.commonMng.rows);
        onComplete();*/
        //if (this.filewatcher != undefined) this.filewatcher.startWatch();
    }
    _ignoreThis = (pth: string) => {
        return this.ignoreDirs.findIndex(s => {
            return nodeFn.path.isSamePath(s, pth)
        }) != -1;
    }
    /** @private */
    recursive = async (parentDir: string, /*ignoreDir = this.ignoreDirs,*/
        ignoreThis = this._ignoreThis,
        callback: (path: string) => Promise<void>) => {
        const _this = this;
        let DirectoryContents = buildTimeFn.fs.readdirSync(parentDir + '/');
        for (let i = 0, ilen = DirectoryContents.length; i < ilen; i++) {
            const file = DirectoryContents[i];
            let _path = nodeFn.path.join(parentDir, file);//["#toFilePath"]();
            if (nodeFn.fs.isDirectory(_path)) {
                if (ignoreThis(_path) == false)
                    await this.recursive(_path, ignoreThis, callback);
            } else {
                await callback(_path);
            }
        }
    }

    /** @param {codeFileInfo} fInfo */
    async buildFiles(fInfos: codeFileInfo[], onComplete = () => { }) {

        if (this.project.config.env == 'release') return;
        setTimeout(async () => {
            this.commonMng.reset();
            for (let i = 0, ilen = fInfos.length; i < ilen; i++) {
                const fInfo = fInfos[i];
                if (nodeFn.fs.existsSync(fInfo.pathOf.html)) {
                    await this.checkFileState(fInfo.pathOf.html);
                    this.commonMng.gen.generateFiles(this.commonMng.rows);
                }
            }
            onComplete();
        }, 1);
    }

    // async getOutputCode(fInfo: codeFileInfo, htmlContents: string): Promise<SourceCodeNode> {
    //     await this.checkFileState(fInfo.pathOf.html, htmlContents);
    //     let row = this.commonMng.rows[0];
    //     return {
    //         designerCode: this.commonMng.gen.getDesignerCode(row),
    //         jsFileCode: this.commonMng.gen.getJsFileCode(row)
    //     };
    // }

    async checkFileState(filePath: string, htmlContents?: string) {
        // if (filePath.endsWith('uc.html')) { //  IF USER CONTROL
        //     await this.commonMng.init(filePath, htmlContents);
        // } else if (filePath.endsWith('tpt.html')) { //  IF TEMPLATE
        //     await this.commonMng.init(filePath, htmlContents);
        // }
    }
}

