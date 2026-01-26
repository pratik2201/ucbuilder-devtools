// tools/build-resources.ts

import fs from "fs/promises";
import path from "path";
//import { getRegistry } from "./resource.dev.js";
import { FileTypes } from "./resourceManager.js";

const out: string[] = [];

out.push(`import { RM } from "./resourceManager";\n`);

// for (const [key, r] of getRegistry()) {
//   const rw = r;
//   if ("filePath" in r) {
//     const buf = await fs.readFile(r.filePath);
//     let value: string;
//     if (r.type === "image") {
//       const ext = path.extname(r.filePath).slice(1);
//       value = `data:image/${ext};base64,${buf.toString("base64")}`;
//     } else {
//       value = buf.toString("utf8").replace(/`/g, "\\`");
//     }
//     out.push(  `RM.set(${JSON.stringify(key)}, \`${value}\`, ${JSON.stringify(r.type)});` );
//   } else {
//     out.push(
//       `RM.set(${JSON.stringify(key)}, ${JSON.stringify(rw.value)}, ${JSON.stringify(rw.type)});`
//     );
//   }
// }
// await fs.writeFile(
//   "src/resources/resources.bundle.ts",
//   out.join("\n"),
//   "utf8"
// );
console.log("✔ resources.bundle.ts generated");
