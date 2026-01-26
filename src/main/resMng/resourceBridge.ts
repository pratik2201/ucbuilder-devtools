import fs from "fs";
import path from "path";
import { RM } from "./resourceManager"; 
import { minifyCss } from "./minify.js";
const CSS_IMPORT_RE =
  /@(use|import)\s+(?:url\()?["']([^"')]+)["']\)?\s*;/gi;

const CSS_URL_RE =
  /url\(\s*["']?([^"')]+)["']?\s*\)/gi;

function isRuntimeUrl(p: string) {
  return p.startsWith("data:") ||
    p.startsWith("blob:") ||
    p.startsWith("__RES::");
}
export function makeResKey(project: string) {
  return `__RES::${project}::${makeGuid()}__`;
}
export function makeGuid() {
  return crypto.randomUUID();
}

function newGuid() {
  return crypto.randomUUID();
}

function makeKey(guid: string) {
  return `__RES::${guid}__`;
}
export class ResourceBridge {

  private project: string;
  private cssCache = new Map<string, string>(); // absPath -> key

  constructor(projectName: string) {
    this.project = projectName;
  }

  // ENTRY
  buildCss(entryCss: string): string {
    const abs = path.resolve(entryCss);
    return this.processCss(abs);
  }

  // ------------------------------

  private processCss(absPath: string): string {

    if (this.cssCache.has(absPath)) {
      return this.cssCache.get(absPath)!;
    }

    let css = fs.readFileSync(absPath, "utf8");

    const myKey = makeResKey(this.project);
    this.cssCache.set(absPath, myKey);

    // 1. resolve @use / @import
    css = css.replace(CSS_IMPORT_RE, (_m, _t, relPath) => {

      if (isRuntimeUrl(relPath)) return _m;

      const childAbs = path.resolve(path.dirname(absPath), relPath);
      const childKey = this.processCss(childAbs);

      return `@use "${childKey}";`;
    });

    // 2. resolve url(...)
    css = css.replace(CSS_URL_RE, (_m, relPath) => {

      if (isRuntimeUrl(relPath)) return _m;

      const fileAbs = path.resolve(path.dirname(absPath), relPath);
      const key = makeResKey(this.project);

      // let ResourceManager decide type
     // RM.getResource(key);

      return `url("${key}")`;
    });

    // 3. minify
    css = minifyCss(css);

    // 4. store as pure string resource
    RM.setValue(myKey, css, "string");

    return myKey;
  }
}
