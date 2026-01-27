import { BuildResource, BuildResourceType, ResourceKeyBridge } from "ucbuilder/out/common/enumAndMore.js";
import { ucUtil } from "ucbuilder/out/global/ucUtil.js";
import { nodeFn } from "ucbuilder/out/renderer/nodeFn.js";  
import { ResourceManage } from "ucbuilder/out/renderer/ResourceManage.js";  
import { minifyCss } from "./minify.js";
import { buildTimeFn } from "../../renderer/buildTimeFn.js";

/* ------------------ types ------------------ */


/* ------------------ helpers ------------------ */

const SCSS_IMPORT_RE =
  /@(use|import)\s+(?:url\()?["']([^"')]+)["']\)?\s*;/gi;

const CSS_URL_RE =
  /url\(\s*["']?([^"')]+)["']?\s*\)/gi;

const INSIDE_ATTR_RE =
  /\[inside=(["'`])((?:\\.|(?!\1)[^\\])*)\1\]([^{]*)/gi;

function isDataOrBlob(p: string) {
  return p.startsWith("data:") || p.startsWith("blob:");
}

function detectUnit(p: string): string | null {
  if (p.endsWith(".uc.scss") || p.endsWith(".uc.html"))
    return p.replace(/\.uc\.(scss|html)$/i, ".uc");

  if (p.endsWith(".tpt.scss") || p.endsWith(".tpt.html"))
    return p.replace(/\.tpt\.(scss|html)$/i, ".tpt");

  return null;
}

/* ------------------ guid resolver ------------------ */

class GuidResolver {

  private unitMap = new Map<string, string>(); // fixedWindow.uc -> guid
  private fileMap = new Map<string, string>(); // everything else

  constructor(private projectName: string) { }

  private newGuid() {
    return this.projectName + ":" + buildTimeFn.crypto.guid();
  }

  getGuidForBuild(absPath: string): string {

    const unit = detectUnit(absPath);
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
}

/* ------------------ engine ------------------ */

export class ResourceBuildEngine {

  private resourceMap = new Map<string, BuildResource>();
  private guidResolver: GuidResolver;

  constructor(public projectName: string) {
    this.guidResolver = new GuidResolver(projectName);
  }

  get resources() {
    return this.resourceMap;
  }

  /* ========== PUBLIC ENTRY ========== */

  build(path: string, guid?: string): string {
    const absPath = nodeFn.path.resolve(path);

    if (this.resourceMap.has(absPath)) {
      return ResourceKeyBridge.makeKey(this.resourceMap.get(absPath)!.guid);
    }

    if (!nodeFn.fs.existsSync(absPath)) {
      console.log("Missing resource:", absPath);
      return undefined;
    }

    const ext = nodeFn.path.extname(absPath).toLowerCase();

    if (ext === ".scss" || ext === ".css") return this.buildCss(absPath, guid);
    if (ext === ".html" || ext === ".htm") return this.buildHtml(absPath, guid);

    return this.buildAsset(absPath);
  }

  /* ========== CSS HANDLER ========== */

  private buildCss(absPath: string, _guid?: string): string {

    const guid = _guid ?? this.guidResolver.getGuidForBuild(absPath);

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

    // ---- inside selector ----
    css = css.replace(INSIDE_ATTR_RE, (_m, _q, rel, rest) => {
      const targetAbs = nodeFn.path.resolve(nodeFn.path.dirname(absPath), rel);
      const key = this.build(targetAbs);
      return key ? `[inside="${key}"]${rest}` : _m;
    });

    // ---- @use / @import ----
    css = css.replace(SCSS_IMPORT_RE, (_m, _t, rel) => {
      if (isDataOrBlob(rel)) return _m;
      const childAbs = nodeFn.path.resolve(nodeFn.path.dirname(absPath), rel);
      const key = this.build(childAbs);
      return key ? `@use "${key}";` : _m;
    });

    // ---- url(...) ----
    css = css.replace(CSS_URL_RE, (_m, rel) => {
      return `url("${this.resolveAsset(rel, absPath)}")`;
    });

    res.content = ResourceManage.x1(minifyCss(css));
    return ResourceKeyBridge.makeKey(guid);
  }

  /* ========== HTML PLACEHOLDER (future) ========== */

  private buildHtml(absPath: string, _guid?: string): string {

    const guid = _guid ?? this.guidResolver.getGuidForBuild(absPath);

    const html = nodeFn.fs.readFileSync(absPath, "utf8");

    this.resourceMap.set(absPath, {
      guid,
      type: "html",
      content: ResourceManage.x1(html),
      source: absPath
    });

    return ResourceKeyBridge.makeKey(guid);
  }

  /* ========== ASSET HANDLER ========== */

  private buildAsset(absPath: string): string {

    const guid = this.guidResolver.getGuidForBuild(absPath);

    const buf = nodeFn.fs.readFileBufferSync(absPath);
    const ext = nodeFn.path.extname(absPath).slice(1).toLowerCase();

    let type: BuildResourceType = "raw";
    let content = "";

    if (["png", "jpg", "jpeg", "gif", "webp", "svg", "ico"].includes(ext)) {
      type = "image";
      content = `data:image/${ext};base64,${ucUtil.bufferToString(buf, "base64")}`;
    } else {
      type = "text";
      content = ResourceManage.x1(ucUtil.bufferToString(buf, "utf8"));
    }

    this.resourceMap.set(absPath, {
      guid,
      type,
      content,
      source: absPath
    });

    return ResourceKeyBridge.makeKey(guid);
  }

  /* ========== url()/data handler ========== */

  private resolveAsset(rel: string, owner: string): string {

    if (isDataOrBlob(rel)) {

      if (this.resourceMap.has(rel))
        return ResourceKeyBridge.makeKey(this.resourceMap.get(rel)!.guid);

      const guid = this.guidResolver.getGuidForBuild(rel);

      this.resourceMap.set(rel, {
        guid,
        type: "data",
        content: ResourceManage.x1(rel)
      });

      return ResourceKeyBridge.makeKey(guid);
    }

    const abs = nodeFn.path.resolve(nodeFn.path.dirname(owner), rel);

    if (!nodeFn.fs.existsSync(abs)) return rel;

    return this.build(abs);
  }
}

/* ------------------ comment stripper ------------------ */

function stripCssComments(input: string): string {

  let out = "";
  let i = 0;
  let inStr: string | null = null;

  while (i < input.length) {

    const c = input[i];
    const n = input[i + 1];

    if (inStr) {
      out += c;
      if (c === inStr && input[i - 1] !== "\\") inStr = null;
      i++; continue;
    }

    if (c === '"' || c === "'") {
      inStr = c; out += c; i++; continue;
    }

    if (c === "/" && n === "*") {
      i += 2;
      while (i < input.length && !(input[i] === "*" && input[i + 1] === "/")) i++;
      i += 2; continue;
    }

    if (c === "/" && n === "/") {
      i += 2;
      while (i < input.length && input[i] !== "\n") i++;
      continue;
    }

    out += c; i++;
  }

  return out;
}
