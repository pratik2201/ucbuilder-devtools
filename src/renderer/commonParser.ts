
import { ITemplatePathOptions } from "ucbuilder/out/common/enumAndMore.js";
import { IFileDeclaration, IUCConfigPreference, ProjectRowR, UserUCConfig } from "ucbuilder/out/common/ipc/enumAndMore.js";
import { codeFileInfo } from "ucbuilder/out/global/codeFileInfo.js";
import { ATTR_OF } from "ucbuilder/out/global/runtimeOpt.js";
import { TemplateMaker } from "ucbuilder/out/global/TemplateMaker.js";
import { ucUtil } from "ucbuilder/out/global/ucUtil.js";
import { FilterContent } from "ucbuilder/out/lib/StampGenerator.js";
import { HTMLx } from "ucbuilder/out/lib/WrapperHelper.js";
import { ProjectManage } from "ucbuilder/out/renderer/ipc/ProjectManage.js";
import { nodeFn } from "ucbuilder/out/renderer/nodeFn.js";
import { Template } from "ucbuilder/out/renderer/Template.js";
import { Usercontrol } from "ucbuilder/out/renderer/Usercontrol.js";
import { builder } from "./builder.js";
import { CommonRow, Control, DesignerOptionsBase, ImportClassNode, ScopeType, codeOptionsBase, dynamicDesignerElementTree } from "./buildRow.js";
import { commonGenerator } from "./commonGenerator.js";
import { dev$minifyCss } from "ucbuilder/out/renderer/StylerRegs.js";
import { buildTimeFn } from "./buildTimeFn.js";

export interface PathReplacementNode { findPath: string, replaceWith: string }

export class commonParser {
    generateNodes(htContent: string): string {
        let rtrn = '';
        const source = new dynamicDesignerElementTree();
        function walk(node: HTMLElement, src: dynamicDesignerElementTree, depth = 0) {
            // nodeType:
            // 1 = Element
            // 3 = Text
            // 8 = Comment
            if (node.nodeType === Node.ELEMENT_NODE) {
                src.nodeName = node.tagName;
                src.type = 'element';
                for (let attr of node.attributes) {
                    src.props[attr.name] = attr.value;
                }

                for (let child of node.childNodes) {
                    let childTree = new dynamicDesignerElementTree();
                    if (walk(child as HTMLElement, childTree, depth + 1) == true) {
                        src.children.push(childTree);
                    }
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
                    src.value = (comment.startsWith('?=') || comment.startsWith("?php")) ?
                        `<${comment}>` : `<!--${comment}-->`;
                } else src.value = `<!--${comment}-->`;
                return true;
            }

            return false;
        }
        let mainele = htContent["#$"]();
        walk(mainele, source);
        let c = this.gen.filex('ts.uc.dynamicByHtml')(source);
        return c;
    }
    reset() {
        this.rows.length = 0;
        this.pathReplacement.length = 0;
    }
    rows: CommonRow[] = [];
    pathReplacement: PathReplacementNode[] = [];
    pushReplacement({ findPath = '', replaceWith = "" }: PathReplacementNode) {
        let index = this.pathReplacement.findIndex(s => ucUtil.equalIgnoreCase(s.findPath, findPath));
        if (index == -1) this.pathReplacement.push({ findPath: findPath, replaceWith: replaceWith });
        else this.pathReplacement[index].replaceWith = replaceWith;
        //console.log(this.pathReplacement);

    }
    bldr: builder;
    gen: commonGenerator;
    SRC_DEC: Partial<{
        code: IFileDeclaration;
        designer: IFileDeclaration;
        html: IFileDeclaration;
        scss: IFileDeclaration;
    }> = {};
    OUT_DEC: Partial<{
        code: IFileDeclaration;
        designer: IFileDeclaration;
        html: IFileDeclaration;
        scss: IFileDeclaration;
    }> = {};
    SRC_CODE_EXT: string;
    OUT_CODE_EXT: string;
    dynamicTemplate: Function;
    constructor(bldr: builder) {
        this.bldr = bldr;
        this.gen = new commonGenerator();
        this.project = this.bldr.project;
        this.CONFIG = this.project?.config;
        this.PREFERENCE = this.CONFIG?.preference;
        this.SRC_DEC = this.PREFERENCE?.dirDeclaration[this.PREFERENCE?.srcDir]?.fileDeclaration as any;
        this.OUT_DEC = this.PREFERENCE?.dirDeclaration[this.PREFERENCE?.outDir]?.fileDeclaration as any;
        this.SRC_CODE_EXT = this.SRC_DEC.code.extension;
        this.OUT_CODE_EXT = this.OUT_DEC.code.extension;
        //this.UC_BUILDER_DIRECTORY = this.project.aliceToPath['ucbuilder/'];
        //this.UC_BUILDER_ALICE = this.project.pathToAlice[this.UC_BUILDER_DIRECTORY];
        this.PROJECT_PATH_LENGTH = this.project.projectPath.length;

        this.UC_CONFIG = ProjectManage.getInfoByProjectPath(nodeFn.path.join(nodeFn.path.resolve(), './node_modules/ucbuilder'))?.config;
    }
    /** for getting project type of ucbuilder project */
    UC_CONFIG: UserUCConfig;
    CONFIG: UserUCConfig;
    //UC_BUILDER_DIRECTORY = "";
    //UC_BUILDER_ALICE = "";
    PREFERENCE: IUCConfigPreference;
    project: ProjectRowR;
    PROJECT_PATH_LENGTH = 0;
    async init(cinfo: codeFileInfo, htmlContents: string | undefined = undefined) {
        let row = await this.fill(cinfo, htmlContents);
        if (row != undefined)
            this.rows.push(row);
    }

    tmaker = new TemplateMaker('');
    //aliceMng = new AliceManager();
    _filterText = new FilterContent();
    codeHT: HTMLElement;

    async fill(cinfo: codeFileInfo, htmlContents: string | undefined = undefined): Promise<CommonRow> {
        let _row = new CommonRow();
        let _this = this;

        switch (cinfo.extCode) {
            case '.uc': return (await this.fillUc(cinfo, htmlContents, _row)) != undefined ? _row : undefined;
            case '.tpt': return (await this.fillTpt(cinfo, htmlContents, _row)) != undefined ? _row : undefined;
            default: return undefined;
        }
    }
    common0 = async (htmlContents: string, _row: CommonRow, designer: DesignerOptionsBase) => {
        let code: string;
        const finfo = _row.src;
        const pathOf = finfo.pathOf;
        const filePref = finfo?.projectInfo?.config?.preference;
        const srcDec = filePref.srcDir;
        code = htmlContents ??
            nodeFn.fs.readFileSync(finfo.allPathOf[srcDec].html) /*??
            nodeFn.fs.readFileSync(finfo.allPathOf[filePref.outDir].html)*/;
        if (nodeFn.fs.existsSync(finfo.allPathOf[srcDec].dynamicDesign)) {
            designer.dynamicName = designer.importer.getNameNumber(`${finfo.name}$dynamicHtmlCode`);
        }
        // if (nodeFn.fs.existsSync(pathOf.dynamicDesign + 'c') == true) {
        //     nodeFn.fs.rmSync(pathOf.dynamicDesign);
        //     //nodeFn.fs.rmSync(pathOf.dynamicDesign + 'c'); 
        //     return undefined;
        // }

        /*const filePref = finfo?.projectInfo?.config?.preference;
        if (htmlContents == undefined && pathOf.dynamicDesign != undefined) {
            if (nodeFn.fs.existsSync(pathOf.dynamicDesign)) {
                designer.dynamicName = designer.importer.getNameNumber(`${finfo.name}$dynamicHtmlCode`);
                try {
                    code = await DbynamicToHtml(finfo.allPathOf[filePref.outDir].dynamicDesign);
                } catch (ex) {
                    code = undefined;
                    console.error(ex);
                }
            } else {
                if (nodeFn.fs.existsSync(pathOf.html)) {
                    let htcontent = nodeFn.fs.readFileSync(pathOf.html);
                    const dynamicCode = this.generateNodes(htcontent);
                    if (dynamicCode != undefined && dynamicCode.length > 0) {
                        code = htcontent;
                        _row.dynamicFileContent = dynamicCode;
                        if (_row.dynamicFileContent != undefined)
                            nodeFn.fs.writeFileSync(`${_row.src.pathOf.dynamicDesign}`, _row.dynamicFileContent);
                        // if (_row.dynamicFileContentx != undefined)
                        //     nodeFn.fs.writeFileSync(`${_row.src.pathOf.dynamicDesign}c`, _row.dynamicFileContentx);
                    }
                }
            }
        } else {
            console.warn('DYNAMIC DESIGN NOT LOADED :' + finfo.allPathOf[filePref.outDir].dynamicDesign);
        }
        code = htmlContents ?? code ??
            (nodeFn.fs.existsSync(pathOf.html) ?
                nodeFn.fs.readFileSync(pathOf.html) : undefined);*/
        return code;
    }
    fillUc = async (finfo: codeFileInfo, htmlContents: string, _row: CommonRow) => {
        let row = _row.sources['ts_uc'];
        let _this = this;
        _row.src = finfo;
        // if (finfo.pathOf['html'].includes('ledger$form.uc')) debugger;
        let onSelect_xName = _this.bldr.Event.onSelect_xName;


        const pref = _row.src?.projectInfo.config.preference;
        const srcPathOf = _row.src.allPathOf[pref.srcDir];
        const outPathOf = _row.src.allPathOf[pref.outDir];

        let code: string;
        const pathOf = finfo.pathOf;

        code = await this.common0(htmlContents, _row, row.designer);



        if (code == undefined) return undefined;
        code = ucUtil.devEsc(code);

        this.tmaker.mainImportMeta = nodeFn.url.pathToFileURL(srcPathOf.html);
        let compileedCode = code;
        try {

            if (compileedCode.trim() != '') {
                let cccodeCallback = this.tmaker.compileTemplate(compileedCode);
                compileedCode = ucUtil.PHP_REMOVE(cccodeCallback({}));
                this.codeHT = compileedCode["#$"]();
                _row.htmlFileContent = code;
                row.designer.material.htmlContents = JSON.stringify(code);
            } else {
                code = HTMLx.Wrapper({ "x-caption": 'Form' });
                this.codeHT = code["#$"]() as HTMLElement;
                _row.dynamicFileContent = commonGenerator.readTemplate('ts.uc.dynamic');
            }
        } catch (ex) {
            console.log(ex);
            return undefined;
        }

        row.designer.guid = `${finfo.projectInfo.projectName}-${buildTimeFn.crypto.guid()}`;
        row.designer.rootPath = JSON.stringify(nodeFn.path.normalize(nodeFn.path.relativeFilePath(finfo.projectInfo.projectPath, outPathOf.scss)));
        row.designer.material.cssContents = JSON.stringify(dev$minifyCss(nodeFn.fs.readFileSync(srcPathOf.scss, 'utf-8')));
        row.designer.baseClassName = Usercontrol.name;
        this.common1(row.designer, row.code, _row.src);
        //let outHT = ucUtil.PHP_REMOVE(ucUtil.devEsc(code) )["#$"]() as HTMLElement;

        const elements = Array.from(this.codeHT.querySelectorAll(`[${ATTR_OF.X_NAME}]`));
        const elementsXfrom = Array.from(this.codeHT.querySelectorAll(`[${ATTR_OF.X_FROM}]`))
            .filter(s => !elements.includes(s));
        let accessKeys = `"` + ucUtil.distinct(Array.from(this.codeHT.querySelectorAll(`[${ATTR_OF.ACCESSIBLE_KEY}]`))
            .map(s => s.getAttribute(ATTR_OF.ACCESSIBLE_KEY))).join(`" | "`) + `"`;

        row.designer.getterFunk = accessKeys;
        //let im = row.designer.importClasses;
        const _importer = row.designer.importer;
        switch (this.UC_CONFIG?.exports ?? this.CONFIG.exports) {
            case "import":
                const prePath = (this.project.projectName == 'ucbuilder') ? `.` : `./node_modules/ucbuilder`;
                _importer.addImport(['Usercontrol'], this.nc(`${prePath}/out/renderer/Usercontrol.js`, outPathOf.designer));
                _importer.addImport(['intenseGenerator'], this.nc(`${prePath}/out/renderer/intenseGenerator.js`, outPathOf.designer));
                _importer.addImport(['IUcOptions'], this.nc(`${prePath}/out/common/enumAndMore.js`, outPathOf.designer));
                _importer.addImport(['VariableList'], this.nc(`${prePath}/out/renderer/StylerRegs.js`, outPathOf.designer));
                break;
            case "types":
                _importer.addImport(['Usercontrol'], 'ucbuilder/Usercontrol');
                _importer.addImport(['intenseGenerator'], 'ucbuilder/intenseGenerator');
                _importer.addImport(['IUcOptions'], 'ucbuilder/enumAndMore');
                _importer.addImport(['VariableList'], 'ucbuilder/StylerRegs');
                break;
        }
        const _exists = nodeFn.fs.existsSync;
        for (let i = 0, iObj = elements, len = iObj.length; i < len; i++) {
            const element = iObj[i];
            onSelect_xName.fire([element as HTMLElement, _row]);
            const ctr = new Control();
            ctr.name = element.getAttribute(ATTR_OF.X_NAME);
            ctr.nodeName = element.nodeName;
            ctr.scope = element.getAttribute(ATTR_OF.SCOPE_KEY) ?? 'public' as any;
            ctr.proto = Object.getPrototypeOf(element).constructor.name;
            ctr.generic = element.getAttribute('x-generic');
            ctr.generic = ctr.generic == null ? undefined : `<${ctr.generic}>`;
            ctr.type = 'none';
            if (element.hasAttribute("x-from")) {
                // debugger;
                let _sspath = ucUtil.devEsc(element.getAttribute("x-from"));
                let _subpath = nodeFn.path.resolveFilePath(srcPathOf.html, _sspath);//["#toFilePath"]();
                let uFInf = new codeFileInfo();
                uFInf.parseUrl(_subpath, pref.outDir as any, outPathOf.html);
                if (uFInf.pathOf == undefined) debugger;
                if (_exists(uFInf.pathOf.code) || _exists(uFInf.pathOf.dynamicDesign) ||
                    _exists(uFInf.pathOf.scss) || _exists(uFInf.pathOf.html)) {
                    ctr.type = uFInf.extCode;
                    ctr.nodeName = uFInf.name;
                    ctr.src = uFInf;
                    const uFpref = uFInf.projectInfo.config.preference;
                    let fullcodePath = uFInf.allPathOf[uFpref.outDir].code;
                    let nws = ucUtil.changeExtension(nodeFn.path.relativeFilePath(outPathOf.designer, fullcodePath), '.ts', '.js');
                    ctr.codeFilePath = nws; //   oldone;
                    ctr.importedClassName = row.designer.importer.addImport([uFInf.name], ctr.codeFilePath)[0];
                    row.designer.controls.push(ctr);
                }
            } else row.designer.controls.push(ctr);

        }

        row.designer.importer.addImport([finfo.name], row.designer.codeFilePath);
        return _row;
    }

    fillTpt = async (finfo: codeFileInfo, htmlContents: string, _row: CommonRow) => {
        let row = _row.sources['ts_tpt'];
        let _this = this;
        _row.src = finfo;
        const pref = _row.src?.projectInfo.config.preference;
        const srcPathof = _row.src.allPathOf[pref.srcDir];
        const outPathof = _row.src.allPathOf[pref.outDir];
        /*const finfo = _row.src;
        if (!finfo.parseUrl(filePath, _this.PREFERENCE.srcDir, this.project.importMetaURL)) return undefined;
        */
        // const filePref = finfo?.projectInfo?.config?.preference;
        let onSelect_xName = _this.bldr.Event.onSelect_xName;
        let projectPath = nodeFn.path.resolve();

        let code: string;
        const pathOf = finfo.pathOf;
        // // if (htmlContents == undefined && pathOf.dynamicDesign != undefined && nodeFn.fs.existsSync(pathOf.dynamicDesign)) {
        // //     row.designer.dynamicName = row.designer.importer.getNameNumber(`${finfo.name}$dynamicHtmlCode`);
        // //     code = await importHTMLts(finfo.allPathOf[filePref.outDir].dynamicDesign);
        // // } else {
        // //     console.warn('DYNAMIC DESIGN NOT LOADED :' + finfo.allPathOf[filePref.outDir].dynamicDesign);
        // // }

        // /*if (nodeFn.fs.existsSync(pathOf.dynamicDesign + 'c') == true) {
        //     nodeFn.fs.rmSync(pathOf.dynamicDesign);
        //     //nodeFn.fs.rmSync(pathOf.dynamicDesign + 'c'); 
        //     return undefined;
        // }*/
        // // if (htmlContents == undefined && pathOf.dynamicDesign != undefined) {
        // //     if (nodeFn.fs.existsSync(pathOf.dynamicDesign)) {
        // //         row.designer.dynamicName = row.designer.importer.getNameNumber(`${finfo.name}$dynamicHtmlCode`);
        // //         code = await importHTMLts(finfo.allPathOf[filePref.outDir].dynamicDesign);
        // //     } else {
        // //         if (nodeFn.fs.existsSync(pathOf.html)) {
        // //             let htcontent = nodeFn.fs.readFileSync(pathOf.html);
        // //             const dynamicCode = this.generateNodes(htcontent);
        // //             if (dynamicCode != undefined && dynamicCode.length > 0) {
        // //                 code = htcontent;
        // //                 _row.dynamicFileContent = dynamicCode;
        // //             }

        // //         }
        // //     }
        // // } else {
        // //     console.warn('DYNAMIC DESIGN NOT LOADED :' + finfo.allPathOf[filePref.outDir].dynamicDesign);
        // // }

        // // code = htmlContents ?? code ??
        // //     nodeFn.fs.existsSync(pathOf.html) ?
        // //     nodeFn.fs.readFileSync(pathOf.html) : undefined;
        code = await this.common0(htmlContents, _row, row.designer);

        if (code == undefined) return undefined;
        code = ucUtil.devEsc(code);
        this.tmaker.mainImportMeta = nodeFn.url.pathToFileURL(srcPathof.html);
        let compileedCode = code;
        let rootpath = nodeFn.path.relative(projectPath, srcPathof.html);
        try {
            if (compileedCode.trim() != '') {
                compileedCode = ucUtil.PHP_REMOVE(code);
                this.codeHT = compileedCode["#$"]();
                _row.htmlFileContent = code;
                row.designer.material.htmlContents = JSON.stringify(code);
            } else {
                code = HTMLx.Template({
                    primary: {},
                    header: {},
                    footer: {},
                });
                this.codeHT = code["#$"]() as HTMLElement;
                _row.dynamicFileContent = commonGenerator.readTemplate('ts.tpt.dynamic');
                _row.htmlFileContent = code;
            }
        } catch (ex) {
            console.log(ex);
            return undefined;
        }
        this.common1(row.designer, row.code, _row.src);
        row.designer.baseClassName = Template.name;
        row.designer.guid = `${finfo.projectInfo.projectName}-${buildTimeFn.crypto.guid()}`;
        row.designer.rootPath = JSON.stringify(nodeFn.path.normalize(nodeFn.path.relativeFilePath(finfo.projectInfo.projectPath, outPathof.scss)));

        row.designer.material.cssContents = JSON.stringify(dev$minifyCss(nodeFn.fs.readFileSync(srcPathof.scss, 'utf-8')));
        switch (this.UC_CONFIG?.exports ?? this.CONFIG.exports) {
            case "import":
                const prePath = (this.project.projectName == 'ucbuilder') ? `.` : `./node_modules/ucbuilder`;

                row.designer.importer.addImport(['Template', 'TemplateNode'], this.nc(`${prePath}/out/renderer/Template.js`, outPathof.designer));
                row.designer.importer.addImport(['intenseGenerator'], this.nc(`${prePath}/out/renderer/intenseGenerator.js`, outPathof.designer));
                row.designer.importer.addImport(['ITptOptions'], this.nc(`${prePath}/out/common/enumAndMore.js`, outPathof.designer));
                row.designer.importer.addImport(['VariableList'], this.nc(`${prePath}/out/renderer/StylerRegs.js`, outPathof.designer));
                break;
            case "types":
                row.designer.importer.addImport(['Template', 'TemplateNode'], 'ucbuilder/Template');
                row.designer.importer.addImport(['intenseGenerator'], 'ucbuilder/intenseGenerator');
                row.designer.importer.addImport(['ITptOptions'], 'ucbuilder/enumAndMore');
                row.designer.importer.addImport(['VariableList'], 'ucbuilder/StylerRegs');
                break;
        }

        row.designer.baseClassName = Template.name;

        let subTemplates: ITemplatePathOptions[];
        if (_row.htmlFileContent == undefined)
            subTemplates = Template.GetArrayOfTemplate(finfo, row.designer.material.htmlContents, row.designer.material.cssContents);
        else {
            let tob = Template.GetOptionsByContent(_row.htmlFileContent,
                commonGenerator.readTemplate('ts.tpt.style'),/*,
                undefined, nodeFn.url.pathToFileURL(pathOf.scss)*/);
            subTemplates = Object.values(tob.tptObj);
        }
        let tpts = row.designer.templetes;
        subTemplates.forEach(template => {
            let rolelwr = template.accessKey;
            if (tpts.findIndex(s => ucUtil.equalIgnoreCase(s.name, rolelwr)) != -1) return;
            let controls: Control[] = [];
            if (template.htmlContents == '' || template.htmlContents == undefined) {
                //debugger;
                template.htmlContents = `
                <wrapper   x-at="${rootpath}"  >
                    <!-- DONT MODIFY "x-at" ATTRIBUTE FROM PRIMARY FILE -->
                </wrapper>
                    `;
            }
            let cntHT = ucUtil.PHP_REMOVE(template.htmlContents)["#$"]() as HTMLElement;
            if (cntHT['length'] != undefined) cntHT = cntHT[0];
            const elements = Array.from(cntHT.querySelectorAll(`[${ATTR_OF.X_NAME}]`));
            for (let i = 0, iObj = elements, len = iObj.length; i < len; i++) {
                const element = iObj[i];
                onSelect_xName.fire([element as HTMLElement, _row]);
                let scope = element.getAttribute(ATTR_OF.SCOPE_KEY) as ScopeType;
                if (scope == undefined)
                    scope = 'public';
                let _generic = element.getAttribute('x-generic');
                _generic = _generic == null ? '' : '<' + _generic + '>';
                let ctr = Object.assign(new Control(), {
                    name: element.getAttribute("x-name"),
                    nodeName: element.nodeName,
                    generic: _generic,
                    proto: ucUtil.GetType(element),
                    scope: scope,
                });
            }
            tpts.push({
                name: template.accessKey,
                scope: "public",
                controls: controls
            });
        });
        //}
        row.designer.importer.addImport([finfo.name], row.designer.codeFilePath);
        return _row;
    }
    common1 = (des: DesignerOptionsBase, code: codeOptionsBase, finfo: codeFileInfo) => {
        const pathOf = finfo.pathOf;

        code.className = finfo.name;
        des.className =
            code.designerClassName = `${finfo.name}$Designer`;



        if (pathOf.dynamicDesign != undefined) {
            let dsTodyn = ucUtil.resolveSubNode(nodeFn.path.relativeFilePath(pathOf.designer, pathOf.dynamicDesign));
            des.dynamicFilePath = ucUtil.changeExtension(dsTodyn, this.SRC_CODE_EXT, this.OUT_CODE_EXT);
        }
        if (pathOf.html != undefined) {
            let dsToht = ucUtil.resolveSubNode(nodeFn.path.relativeFilePath(pathOf.designer, pathOf.html));
            des.htmlFilePath = dsToht;
        }
        if (pathOf.code != undefined) {
            let dsTocd = ucUtil.resolveSubNode(nodeFn.path.relativeFilePath(pathOf.designer, pathOf.code));
            des.codeFilePath = ucUtil.changeExtension(dsTocd, this.SRC_CODE_EXT, this.OUT_CODE_EXT);
            let tsToDes = ucUtil.resolveSubNode(nodeFn.path.relativeFilePath(pathOf.code, pathOf.designer));
            code.designerFilePath = ucUtil.changeExtension(tsToDes, this.SRC_CODE_EXT, this.OUT_CODE_EXT);
        }

    }
    nc(_path: string, fromFilePath: string) {
        let fpath = nodeFn.path.join(nodeFn.path.resolve(), _path);
        return ucUtil.resolveSubNode(nodeFn.path.relativeFilePath(fromFilePath, fpath))["#toFilePath"]();
    }
    fillDefImports(name: string, url: string, classList: ImportClassNode[], ctrlNode?: Control)/*: number */ {
        let _urlLowerCase = url.toLowerCase();
        let _import = classList.find(s => s.url.toLowerCase() == _urlLowerCase);
        if (ctrlNode != undefined) ctrlNode.importedClassName = name;
    }

}
