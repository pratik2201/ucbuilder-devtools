import { SpecialExtType, ucUtil } from "ucbuilder/out/global/ucUtil.js";
import { IFileDeclarationTypesMap } from "ucbuilder/out/common/ipc/enumAndMore.js";
import { nodeFn } from "ucbuilder/out/renderer/nodeFn.js";
import { CommonRow } from "./buildRow.js";
import { TemplateMaker } from "ucbuilder/out/global/TemplateMaker.js";
import { buildTimeFn } from "./buildTimeFn.js";
import { ProjectManage } from "ucbuilder/out/renderer/ipc/ProjectManage.js";
 
import { CssBuildEngine } from "../main/resMng/CssBuildEngine.js";

interface CodeFilesNode {
    DESIGNER: string,
    CODE: string,
    STYLE: string,
}
interface TNode {
    HTML: string,
    STYLE: string,
}
interface BaseTypeNode {
    UC: CodeFilesNode,
    TPT: CodeFilesNode,
}

interface SourceTypeNode {
    JS: BaseTypeNode,
    TS: BaseTypeNode,
}
/*export const ASSETS = {
    "js.tpt.code": import('../../assets/ucbuilder/templates/js.tpt.code?raw'),
    "js.tpt.designer": import('../../assets/ucbuilder/templates/js.tpt.designer?raw'),
    "js.tpt.style": import('../../assets/ucbuilder/templates/js.tpt.style?raw'),
    "js.uc.code": import('../../assets/ucbuilder/templates/js.uc.code?raw'),
    "js.uc.designer": import('../../assets/ucbuilder/templates/js.uc.designer?raw'),
    "js.uc.style": import('../../assets/ucbuilder/templates/js.uc.style?raw'),
    "ts.tpt.code": import('../../assets/ucbuilder/templates/ts.tpt.code?raw'),
    "ts.tpt.designer": import('../../assets/ucbuilder/templates/ts.tpt.designer?raw'),
    "ts.tpt.style": import('../../assets/ucbuilder/templates/ts.tpt.style?raw'),
    "ts.uc.code": import('../../assets/ucbuilder/templates/ts.uc.code?raw'),
    "ts.uc.designer": import('../../assets/ucbuilder/templates/ts.uc.designer?raw'),
    "ts.uc.style": import('../../assets/ucbuilder/templates/ts.uc.style?raw'),
}*/
export class commonGenerator {
    rows: CommonRow[] = [];
    //DEFAULT_TEMPLEATES: SourceTypeNode;
    // getfile(pth: string) {
    //     return nodeFn.fs.readFileSync(nodeExp.path.resolveFilePath(import.meta.url, ucUtil.devEsc(pth)));
    // }
    //getFileX()
    /* private initTemplates() {
         this.DEFAULT_TEMPLEATES = {
             JS: {
                 TPT: {
                     CODE: this.getfile('{:../../../assets/buildTempates/js/tpt/codefile.php}'),
                     DESIGNER: this.getfile('{:../../../assets/buildTempates/js/tpt/designer.php}'),
                     STYLE: this.getfile('{:../../../assets/buildTempates/js/tpt/styles.css}'),
                 },
                 UC: {
                     CODE: this.getfile('{:../../../assets/buildTempates/js/uc/codefile.php}'),
                     DESIGNER: this.getfile('{:../../../assets/buildTempates/js/uc/designer.php}'),
                     STYLE: this.getfile('{:../../../assets/buildTempates/js/uc/styles.css}'),
                 },
             },
             TS: {
                 TPT: {
                     CODE: this.getfile('{:../../../assets/buildTempates/ts/tpt/codefile.php}'),
                     DESIGNER: this.getfile('{:../../../assets/buildTempates/ts/tpt/designer.php}'),
                     STYLE: this.getfile('{:../../../assets/buildTempates/ts/tpt/styles.css}'),
                 },
                 UC: {
                     CODE: this.getfile('{:../../../assets/buildTempates/ts/uc/codefile.php}'),
                     DESIGNER: this.getfile('{:../../../assets/buildTempates/ts/uc/designer.php}'),
                     STYLE: this.getfile('{:../../../assets/buildTempates/ts/uc/styles.css}'),
                 },
             }
         }
     }
     private _CodeFilesNode(type: 'js' | 'ts', extType: SpecialExtType): CodeFilesNode {
         switch (type) {
             case 'js': return _BaseTypeNode(this.DEFAULT_TEMPLEATES.JS, extType);
             case 'ts': return _BaseTypeNode(this.DEFAULT_TEMPLEATES.TS, extType);
         }
         function _BaseTypeNode(parent: BaseTypeNode, extType: SpecialExtType): CodeFilesNode {
             switch (extType) {
                 case '.tpt': return parent.TPT;
                 case '.uc': return parent.UC;
             }
             return undefined;
         }
         return undefined;
     }*/
    designerTMPLT: { [key: string]: string } = {};
    codefileTMPLT: { [key: string]: string } = {};
    styleTMPLT: { [key: string]: string } = {};
    tMaker = new TemplateMaker(import.meta.url);

    //dTpt = '' as string;
    constructor() {

        //this.initTemplates();
        //this.rgxManage = new regsManage();
        //  this.dTpt = 
        //console.log(this.DEFAULT_TEMPLEATES);        
    }

    /*Events = {
        onDemandDesignerFile: (type: 'js' | 'ts', extType: SpecialExtType) => {
            return this._CodeFilesNode(type, extType).DESIGNER;
        },
        onDemandCodeFile: (type: 'js' | 'ts', extType: SpecialExtType) => {
            return this._CodeFilesNode(type, extType).CODE;
        },
        onDemandStyleFile: (type: 'js' | 'ts', extType: SpecialExtType) => {
            return this._CodeFilesNode(type, extType).STYLE;
        }
    }*/
    //rgxManage: regsManage;
    static ensureDirectoryExistence(filePath: string) {

        const dirname = nodeFn.path.dirname(filePath);
        if (!nodeFn.fs.existsSync(dirname)) {
            buildTimeFn.fs.mkdirSync(dirname, { recursive: true });
        }
        /*var dirname = nodeExp.path.dirname(filePath);
        if (nodeFn.fs.existsSync(dirname)) {
            return true;
        }
        this.ensureDirectoryExistence(dirname);
        nodeFn.fs.mkdirSync(dirname);*/
    }
    static readTemplate(tptFileName: string/*type: 'js' | 'ts' | string, extType: SpecialExtType, fileType: '.designer' | '.code' |
        '.dynamic' | '.dynamicByHtml' | '.style'*/) {
        //let tptFileName = `${type}${extType}${fileType}`;
        const tptDirpath = ucUtil.devEsc(`{:../../assets/ucbuilder/templates}`);
        ///let fpath = nodeFn.path.resolve(`assets/ucbuilder/templates/${tptFileName}`);
        let fpath = nodeFn.path.resolveFilePath(import.meta.url, nodeFn.path.join(tptDirpath, tptFileName));
        const data = nodeFn.fs.readFileSync(fpath, 'binary');
        return data;
    }
    static templateUnMapped = new Map<string, Function>();
    filex(tptFileName: string/*type: 'js' | 'ts' | string, extType: SpecialExtType, fileType: '.designer' | '.code' |
        '.dynamic' | '.dynamicByHtml' | '.style'*/) {
        //let tptFileName = `${type}${extType}${fileType}`;
        if (commonGenerator.templateUnMapped.has(tptFileName))
            return commonGenerator.templateUnMapped.get(tptFileName);
        else {
            const data = commonGenerator.readTemplate(tptFileName/*type, extType, fileType*/);
            const _fn = this.tMaker.compileTemplate(data);
            commonGenerator.templateUnMapped.set(tptFileName, _fn);
            return _fn;
        }
    }
    generateFiles(rows: CommonRow[] = []) {
        let _this = this;
        console.log(rows);
        if (rows == undefined || rows.length == 0) return;


        this.rows = rows;
        let _data = "";
        const pref = this.rows[0]?.src.callerProject.config.preference;
        let dirDeclaration = pref?.dirDeclaration;
        //  let fileWisePath = pref?.fileWisePath;
        /* if (pref != undefined) {
 
         }*/

        const declareEntries = Object.entries(dirDeclaration);
        for (let i = 0, len = this.rows.length; i < len; i++) {
            const row = this.rows[i];
            let uctype = row.src.extCode;
            let codeFileSrctype: keyof IFileDeclarationTypesMap = 'code',
                designerFileSrctype: keyof IFileDeclarationTypesMap = 'designer';
            for (const [decName, fTypeInfo] of declareEntries) {
                if (decName == 'out') continue;
                let srctype = 'ts';
                commonGenerator.ensureDirectoryExistence(row.src.pathOf[designerFileSrctype]);
                _data = this.filex(`${srctype}${uctype}.designer`)(row);
                buildTimeFn.fs.writeFileSync(row.src.pathOf[designerFileSrctype], _data);

                if (row.htmlFileContent != undefined)
                    buildTimeFn.fs.writeFileSync(`${row.src.pathOf.html}`, row.htmlFileContent);
                if (!nodeFn.fs.existsSync(row.src.pathOf[codeFileSrctype])) {
                    _data = this.filex(`${srctype}${uctype}.code`)(row);
                    buildTimeFn.fs.writeFileSync(row.src.pathOf[codeFileSrctype], _data);
                }
                if (!nodeFn.fs.existsSync(row.src.pathOf.scss)) {
                    _data = this.filex(`${srctype}${uctype}.style`)(row);
                    buildTimeFn.fs.writeFileSync(row.src.pathOf.scss, _data);
                }
            }



            /* _data = _this.tMaker.compileTemplate(this.filex(srctype, uctype, '.designer'))(row);
             nodeFn.fs.writeFileSync(row.src.pathOf[designerFileSrctype], _data);
 
             if (row.htmlFileContent != undefined)
                 nodeFn.fs.writeFileSync(`${row.src.pathOf.html}`, row.htmlFileContent);
 
             if (!nodeFn.fs.existsSync(row.src.pathOf[codeFileSrctype])) {
                 _data = _this.tMaker.compileTemplate(this.filex(srctype, uctype, '.code'))(row);
                 nodeFn.fs.writeFileSync(row.src.pathOf[codeFileSrctype], _data);
             }
             if (!nodeFn.fs.existsSync(row.src.pathOf.scss)) {
                 _data = _this.tMaker.compileTemplate(this.filex(srctype, uctype, '.style'))(row);
                 nodeFn.fs.writeFileSync(row.src.pathOf.scss, _data);
             }*/
        }

        this.generateResources();
    }

    cssBulder: CssBuildEngine;
    generateResources() {
        const resourcesSource = Array.from(this.cssBulder.resources.values());
        resourcesSource.forEach(s => {
            s.content = JSON.stringify(s.content);
            s.source = JSON.stringify(s.source);
            s.guid = JSON.stringify(s.guid);
        });
        let resContent = this.filex('resources')({
            resources: resourcesSource
        });
        // console.log(resourcesSource);
        // return;
        // // ProjectManage
        const proj = ProjectManage.MAIN_PROJECT;
        const pref = proj.config.preference;
        let srcPath = pref.dirDeclaration[pref.srcDir].dirPath;
        let resFile = nodeFn.path.resolve(proj.projectPath, srcPath, 'resources.ts');
        buildTimeFn.fs.writeFileSync(resFile, resContent, 'utf-8');
        return;
        // const resourcesSource = Resources.all();  
        // let resContent = this.filex('resources')({
        //     resources:resourcesSource
        // });
        // console.log(resourcesSource);
        // return;
        // // ProjectManage
        // const proj = ProjectManage.MAIN_PROJECT;
        // const pref = proj.config.preference;
        // let srcPath = pref.dirDeclaration[pref.srcDir].dirPath;
        // let resFile = nodeFn.path.resolve(proj.projectPath, srcPath, 'resources.ts');
        // buildTimeFn.fs.writeFileSync(resFile, resContent, 'utf-8');
    }

    /*getDesignerCode(rw: CommonRow) {
         return this.generateNew(rw, this.designerTMPLT[rw.src.extCode]);
     }
 
     getJsFileCode(rw: CommonRow) {
         return this.generateNew(rw, this.codefileTMPLT[rw.src.extCode]);
     }
 
     private generateNew(node: CommonRow, templateText: string) {
         let dta = templateText;
         dta = this.rgxManage.parse(node, dta);
         return dta;
     }*/
}
