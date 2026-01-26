// // src/resources/ResourceManager.ts

// export type RuntimeResourceType =
//   | "css"
//   | "html"
//   | "image"
//   | "text"
//   | "raw"
//   | "data";

// export interface RuntimeResource {
//   key: string;                // sharepnl:css:GUID
//   guid: string;               // GUID only
//   type: RuntimeResourceType;
//   content: string;            // always string (already built)
//   source?: string;            // optional, debug only
// }

// export class ResourceManager {

//   private static resources = new Map<string, RuntimeResource>();
//   // key = sharepnl:type:guid

//   // ---------- register (build output / preload) ----------

//   static register(res: RuntimeResource) {
//     this.resources.set(res.key, res);
//   }

//   static bulkRegister(list: RuntimeResource[]) {
//     for (const r of list) this.register(r);
//   }

//   // ---------- getters ----------

//   static has(key: string): boolean {
//     return this.resources.has(key);
//   }

//   static get(key: string): RuntimeResource | null {
//     return this.resources.get(key) ?? null;
//   }

//   static getContent(key: string): string | null {
//     return this.resources.get(key)?.content ?? null;
//   }

//   static getByGuid(guid: string): RuntimeResource[] {
//     return [...this.resources.values()].filter(r => r.guid === guid);
//   }

//   static keys(): string[] {
//     return [...this.resources.keys()];
//   }

//   static values(): RuntimeResource[] {
//     return [...this.resources.values()];
//   }

//   // ---------- helpers ----------

//   static resolveCss(key: string): string {
//     const r = this.resources.get(key);
//     if (!r || r.type !== "css") throw new Error("CSS resource not found: " + key);
//     return r.content;
//   }

//   static resolveHtml(key: string): string {
//     const r = this.resources.get(key);
//     if (!r || r.type !== "html") throw new Error("HTML resource not found: " + key);
//     return r.content;
//   }

//   static resolveImage(key: string): string {
//     const r = this.resources.get(key);
//     if (!r || r.type !== "image" && r.type !== "data")
//       throw new Error("Image/data resource not found: " + key);
//     return r.content;
//   }

//   // ---------- debug ----------

//   static dump() {
//     return [...this.resources.entries()];
//   }

//   static clear() {
//     this.resources.clear();
//   }
// }
// export const RM = ResourceManager;

//src/resources/resourceManager.ts

import fs from "fs";
import path from "path";

export type FileTypes =
  | "cssFile"
  | "htmlFile"
  | "imageFile"
  | "textFile"
  | "rawFile"
  | "string"
  | "integer"
  | "float"
  | "boolean";
export type ValueType =
  | "string"
  | "number"
  | "float";

export interface valueEntry {
  type: ValueType;
  value: string;
}
export class FileEntry {
  type: FileTypes = 'textFile';
  value = ''; 
  filePath: string; 
}

export class ResourceManager {
   
  private static valueMap = new Map<string, valueEntry>();
  static setValue(key: string, value, type: ValueType = "string") {
    this.valueMap.set(key, {
      type,
      value: '' + value
    });
  }
  static getValue(key: string): string | null {
    return this.valueMap.get(key)?.value ?? null;
  }
  static hasValue(key: string): boolean {
    return this.valueMap.has(key);
  }
  static getAllKeysOfValue(): string[] {
    return [...this.valueMap.keys()];
  }
  static getEntriesOfValue() {
    return Array.from(this.valueMap.entries());
  }

  static setResource(resourceKey: string, fentry: FileEntry) {
    this.fileSource.delete(resourceKey);
    const fe = new FileEntry();
    Object.assign(fe, fentry);
    this.fileSource.set(resourceKey, fe);
  }

  static fileSource = new Map<string, FileEntry>();
  static getResource(resourceKey: string, type: FileTypes, valOrPath?: string) {
    let finfo = this.fileSource.get(resourceKey);
    if (finfo == undefined) {
      let buf: NonSharedBuffer;
      finfo = new FileEntry();
      switch (type) {
        case 'cssFile':
        case 'htmlFile':
        case 'rawFile':
        case 'textFile':
        case 'imageFile':
          valOrPath = path.normalize(valOrPath);
          if (!fs.existsSync(valOrPath)) return undefined;
          buf = fs.readFileSync(valOrPath);
          finfo.filePath = valOrPath;
          break;
      }
      switch (type) {
        case 'cssFile':
        case 'htmlFile':
        case 'rawFile':
        case 'textFile':
          finfo.value = buf.toString("utf8");
          break;
        case 'imageFile':
          const ext = path.extname(valOrPath).slice(1);
          finfo.value = `data:image/${ext};base64,${buf.toString("base64")}`;
          break;
        case 'string':
        case 'boolean':
        case 'float':
        case 'integer': finfo.value = valOrPath; break;
      }
      finfo.type = type;
      this.fileSource.set(resourceKey, finfo);
      return finfo;
    } else return finfo;
  }
  static hasFiles(resourceKey: string): boolean {
    return this.fileSource.has(resourceKey);
  }
  static getEntriesOfFile() {
    return Array.from(this.fileSource.entries());
  }

}
function isSamePath(path1: string, path2: string) {
  const absA = path.resolve(path1);
  const absB = path.resolve(path2);
  return (path.normalize(absA) === path.normalize(absB));
}
export const RM = ResourceManager;
