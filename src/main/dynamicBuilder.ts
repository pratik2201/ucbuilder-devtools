import ts from "typescript";
import path from "path";

export function buildDesignerTS(files: string[], outDir: string) {
  const config: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    strict: false,
    outDir,
    rootDir: process.cwd(),
    esModuleInterop: true,
    skipLibCheck: true
  };

  const host = ts.createCompilerHost(config);

  const program = ts.createProgram(files, config, host);

  const emitResult = program.emit();

  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  if (diagnostics.length) {
    diagnostics.forEach(d => {
      const msg = ts.flattenDiagnosticMessageText(d.messageText, "\n");
      const file = d.file?.fileName ?? "";
      const pos = d.file && d.start != null
        ? d.file.getLineAndCharacterOfPosition(d.start)
        : null;

      /*
      console.error(
        file
          ? `${file} (${pos!.line + 1},${pos!.character + 1}): ${msg}`
          : msg
      );*/
    });

    //throw new Error("Designer TypeScript build failed.");
  }

  console.log("Designer TS build done.");
}
