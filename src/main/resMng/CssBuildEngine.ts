
import { ResourceKeyBridge } from "ucbuilder/out/common/enumAndMore.js";
import { ucUtil } from "ucbuilder/out/global/ucUtil.js";
import { nodeFn } from "ucbuilder/out/renderer/nodeFn.js";
import { buildTimeFn } from "../../renderer/buildTimeFn.js";
import { minifyCss } from "./minify.js";

const resourceMap = new Map<string, BuildResource>();
// key = absPath OR data/blob string
const SCSS_IMPORT_RE =
  /@(use|import)\s+(?:url\()?["']([^"')]+)["']\)?\s*;/gi;

const CSS_URL_RE =
  /url\(\s*["']?([^"')]+)["']?\s*\)/gi;

function isDataOrBlob(p: string) {
  return p.startsWith("data:") || p.startsWith("blob:");
}

type BuildResourceType = "css" | "html" | "image" | "text" | "raw" | "data";

interface BuildResource {
  guid: string;
  type: BuildResourceType;
  content: string;
  source?: string;
} 

const INSIDE_ATTR_RE = /\[inside=["']([^"']+)["']\]/g;
// function makeeKeey(guid: string) {
//   return `__RES::${guid}__`;
// }
// src/resources/ResourceKeyBridge.ts

 
class GuidResolver {
  private unitMap = new Map<string, string>(); // fixedWindow.uc -> guid
  private fileMap = new Map<string, string>(); // any other file

  constructor(private projectName: string) {}

  private newGuid() { return this.projectName + ':' + buildTimeFn.crypto.guid(); }

  /*private newGuid() {
    return crypto.randomUUID();
  }*/

  getGuidForScss(absPath: string): string {
    const unit = detectUnit(absPath); // *.uc.scss | *.tpt.scss

    if (unit) {
      if (!this.unitMap.has(unit)) {
        this.unitMap.set(unit, this.newGuid());
      }
      return this.unitMap.get(unit)!;
    }

    if (!this.fileMap.has(absPath)) {
      this.fileMap.set(absPath, this.newGuid());
    }

    return this.fileMap.get(absPath)!;
  }

  getGuidForFile(absPath: string): string {
    if (!this.fileMap.has(absPath)) {
      this.fileMap.set(absPath, this.newGuid());
    }
    return this.fileMap.get(absPath)!;
  }
}
function detectUnit(p: string): string | null {
  if (p.endsWith(".uc.scss") || p.endsWith(".uc.html"))
    return p.replace(/\.uc\.(scss|html)$/i, ".uc");

  if (p.endsWith(".tpt.scss") || p.endsWith(".tpt.html"))
    return p.replace(/\.tpt\.(scss|html)$/i, ".tpt");

  return null;
}

export class CssBuildEngine {

  private resourceMap = new Map<string, BuildResource>();
  private guidResolver: GuidResolver;
  projectName = "";

  constructor(projectName: string) {
    this.projectName = projectName;
    this.guidResolver = new GuidResolver(projectName);
  }

  get resources() {
    return this.resourceMap;
  }

  // ENTRY
  buildScss(absPath: string): string {
    absPath = nodeFn.path.resolve(absPath);

    if (this.resourceMap.has(absPath)) {
      return ResourceKeyBridge.makeKey(this.resourceMap.get(absPath)!.guid);
    }

    if (!nodeFn.fs.existsSync(absPath)) {
      console.log("CSS file missing:", absPath);
      return undefined;
    }

    const guid = this.guidResolver.getGuidForScss(absPath);

    const res: BuildResource = {
      guid,
      type: "css",
      content: "",
      source: absPath
    };

    // allocate first (circular safe)
    this.resourceMap.set(absPath, res);

    let css = nodeFn.fs.readFileSync(absPath, "utf8");

    css = stripCssComments(css);
    css = ucUtil.devEsc(css);

    // -------- inside="{:...}" --------
    css = css.replace(INSIDE_ATTR_RE, (_m, relPath) => {
      const targetAbs = nodeFn.path.resolve(nodeFn.path.dirname(absPath), relPath);
      const key = this.buildScss(targetAbs);
      return key ? `[inside="${key}"]` : _m;
    });

    // -------- @use / @import --------
    css = css.replace(SCSS_IMPORT_RE, (_m, _t, rel) => {
      if (isDataOrBlob(rel)) return _m;

      const childAbs = nodeFn.path.resolve(nodeFn.path.dirname(absPath), rel);
      const key = this.buildScss(childAbs);
      return key ? `@use "${key}";` : _m;
    });

    // -------- url(...) --------
    css = css.replace(CSS_URL_RE, (_m, rel) => {
      return `url("${this.resolveAsset(rel, absPath)}")`;
    });

    res.content = minifyCss(css);
    return ResourceKeyBridge.makeKey(guid);
  }

  // ----------------------------------

  private resolveAsset(rel: string, owner: string): string {

    if (isDataOrBlob(rel)) {
      if (this.resourceMap.has(rel)) {
        return ResourceKeyBridge.makeKey(this.resourceMap.get(rel)!.guid);
      }

      const guid = this.guidResolver.getGuidForFile(rel);

      this.resourceMap.set(rel, {
        guid,
        type: "data",
        content: rel
      });

      return ResourceKeyBridge.makeKey(guid);
    }

    const abs = nodeFn.path.resolve(nodeFn.path.dirname(owner), rel);

    if (!nodeFn.fs.existsSync(abs)) return rel;

    if (this.resourceMap.has(abs)) {
      return ResourceKeyBridge.makeKey(this.resourceMap.get(abs)!.guid);
    }

    const buf = nodeFn.fs.readFileBufferSync(abs);
    const ext = nodeFn.path.extname(abs).slice(1).toLowerCase();

    let type: BuildResourceType = "raw";
    let content = "";

    if (["png", "jpg", "jpeg", "gif", "webp", "svg", "ico"].includes(ext)) {
      type = "image";
      content = `data:image/${ext};base64,${ucUtil.bufferToString(buf, "base64")}`;
    } else {
      type = "text";
      content = ucUtil.bufferToString(buf, "utf8");
    }

    const guid = this.guidResolver.getGuidForFile(abs);

    this.resourceMap.set(abs, {
      guid,
      type,
      content,
      source: abs
    });

    return ResourceKeyBridge.makeKey(guid);
  }
}
function stripCssComments(input: string): string {
  let out = "";
  let i = 0;
  let inStr: string | null = null;

  while (i < input.length) {
    const c = input[i];
    const n = input[i + 1];

    // inside string
    if (inStr) {
      out += c;
      if (c === inStr && input[i - 1] !== "\\") inStr = null;
      i++;
      continue;
    }

    // start string
    if (c === '"' || c === "'") {
      inStr = c;
      out += c;
      i++;
      continue;
    }

    // block comment
    if (c === "/" && n === "*") {
      i += 2;
      while (i < input.length && !(input[i] === "*" && input[i + 1] === "/")) i++;
      i += 2;
      continue;
    }

    // line comment
    if (c === "/" && n === "/") {
      i += 2;
      while (i < input.length && input[i] !== "\n") i++;
      continue;
    }

    out += c;
    i++;
  }

  return out;
}