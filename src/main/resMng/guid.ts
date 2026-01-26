import crypto from "crypto";
import path from "path";
import fs from "fs";
 

function newGuid() {
  return crypto.randomUUID();
}

function makeKey(guid: string) {
  return `__RES::${guid}__`;
}

// export function makeGuid() {
//   return crypto.randomUUID();
// }

// export function makeResKey(project: string) {
//   return `__RES::${project}::${makeGuid()}__`;
// }
