import { SpecialExtType } from "ucbuilder/out/global/ucUtil.js";
import { codeFileInfo } from "ucbuilder/out/global/codeFileInfo.js";
import { ISourceOptions } from "ucbuilder/out/common/enumAndMore.js";
function devEsc(str: string): string {
    // debugger;
    return str?.replace(/(.{0,1}){:(.*?)}/gm, (m, fchar, url) => {
        let rtrn = (fchar == "\\") ? `{:${url}}` : (fchar ?? '') + "" + url;
        return rtrn;
    });
}


export class Control {
    private _name: string;
    public get name(): string {
        return this._name;
    }
    public set name(value: string) {
        this._name = value;
        if (value.match(/^(?!\d)\w+$/) != null) {
            this._nameQT = value;
            this._nameThis = `.${value}`;
        } else {
            this._nameQT = `"${value}"`;
            this._nameThis = `["${value}"]`;
        }

    }
    _nameQT: string = '';
    get nameQT() { return this._nameQT };
    _nameThis: string = '';
    get nameThis() { return this._nameThis };

    codeFilePath: string = "";
    type?: SpecialExtType = 'none';
    generic?: string = '';
    scope: ScopeType = "public";
    proto: string = "";
    importedClassName?: string = undefined;
    src?: codeFileInfo = undefined;
    nodeName: string = "";
    constructor() {

    }
};
export interface Template {
    name: string;
    scope: ScopeType;
    controls: Control[];
}
export const templete: Template = {
    name: "",
    scope: 'public',
    controls: [],
};
export interface ImportClassNameAlices {
    name: string;
    alias: string;
    asText?: string;
}
export interface ImportClassNode {
    //name: string;
    //alice: string;
    url: string;
    names?: ImportClassNameAlices[];
    //get importText(): string;
    //get objText(): string;
}
export class DesignerOptionsBase {
    importer = new importManage();
    htmlFilePath = '' as string;
    dynamicName = undefined as string;
    className = "";
    baseClassName = "";
    codeFilePath = "" as string;
    dynamicFilePath = "" as string;
    rootPath: string = "" as string;
     
    htmlGuid = "";
    cssGuid = "";
    material: ISourceOptions = {

    };
}
class ucDesigner extends DesignerOptionsBase {
    getterFunk = "";
    controls = [] as Control[];
}
class tptDesigner extends DesignerOptionsBase {
    templetes = [] as Template[];

}
export class dynamicDesignerElementTree {
    type: 'text' | 'element' = 'element';
    value: string;
    nodeName: string;
    props: { [prop: string]: string } = {};
    children: dynamicDesignerElementTree[] = [];
}
export class codeOptionsBase {
    className = "";
    designerClassName = "";
    designerFilePath = "";
}
class TsUcRow {
    //htmlFileContent?: string;
    //codeFilePath = ""; 

    code = new codeOptionsBase();
    designer = new ucDesigner();
}
class TsTptRow {
    code = new codeOptionsBase();
    designer = new tptDesigner();
}
export class CommonRow {
    src: codeFileInfo;
    dynamicFileContent?: string;
    dynamicFileContentx?: string;

    htmlFileContent?: string;
    sources = {
        'ts_uc': new TsUcRow(),
        'ts_tpt': new TsTptRow(),
    }
    /*codeFilePath = "";
    designerFilePath = "";
    htmlFilePath = '' as string;
    htmlFileContent?: string;
    baseClassName = "";
    designer = {
        extType: "",
        getterFunk: "",
        className: "",
        templetes: [] as Template[],
        controls: [] as Control[],
        importer:new importManage(),
    }
    codefile = {
        className: "",
    }*/

}
class importManage {
    classes = [] as ImportClassNode[];
    private _imprtMap = {} as { [name: string]: number };
    getNameNumber(name: string) {
        let impNames = this._imprtMap;
        let impName = impNames[name];
        if (impName == undefined) {
            impNames[name] = 0;
            return name;
        }
        else {
            impName++;
            impNames[name] = impName;
            return `${name}${impName}`;
        }
    }
    addImport = (names: string[], url: string/*, _importclasses: ImportClassNode[]*/) => {
        let _urlLowerCase = url.toLowerCase();
        // let _importclasses = this.designer.importClasses;
        let _this = this;
        let _import = this.classes.find(s => s.url.toLowerCase() == _urlLowerCase);
        let rtrn: string[] = [];


        if (_import != undefined) {
            names.forEach(name => {
                let fnd = _import.names.find(s => s.name == name);
                if (fnd == undefined) {
                    fnd = {
                        alias: _this.getNameNumber(name),
                        name: name
                    };
                    fnd.asText = fnd.alias === fnd.name ? fnd.alias : `${fnd.name} as ${fnd.alias}`
                    _import.names.push(fnd);
                }
                rtrn.push(fnd.alias);
            });
        } else {
            _import = {
                names: [],
                url: url,
            }
            this.classes.push(_import);
            names.forEach(name => {
                let fnd: ImportClassNameAlices = {
                    alias: _this.getNameNumber(name),
                    name: name
                };
                fnd.asText = fnd.alias === fnd.name ? fnd.alias : `${fnd.name} as ${fnd.alias}`;
                _import.names.push(fnd);
                rtrn.push(fnd.alias);
            });
        }
        return rtrn;
    }
}

export interface TempleteControl {
    name: string;
    nodeName: string;
    scope: ScopeType;
    proto: string;
}
export const templeteControl: TempleteControl = {
    name: "",
    nodeName: "",
    scope: "public",
    proto: "",
};

/*export enum ExtensionType {
    none = "none",
    Usercontrol = ".uc",
    template = ".tpt",
}*/


export type ScopeType = "private" | "protected" | "public";
