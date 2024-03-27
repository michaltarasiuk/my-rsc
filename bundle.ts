import { relative } from "node:path";
import * as esbuild from "esbuild";
import { parse } from "es-module-lexer";
import { v4 as uuidv4 } from "uuid";

export const clientComponentMap: Record<
  string,
  {
    id: string;
    name: string;
    chunks: [];
    async: true;
  }
> = {};

const appDir = new URL("./app/", import.meta.url);
const distDir = new URL("./dist/", import.meta.url);

function resolveApp(path = "") {
  return Bun.fileURLToPath(new URL(path, appDir));
}

function resolveDist(path = "") {
  return Bun.fileURLToPath(new URL(path, distDir));
}

const reactComponentExtension = /\.tsx$/;
function toJSExtension(filePath: string) {
  return filePath.replace(reactComponentExtension, ".js");
}

const clientComponentEntrypoints = new Map<string, string>();

await esbuild.build({
  entryPoints: [resolveApp("page.tsx")],
  outdir: resolveDist(),
  format: "esm",
  packages: "external",
  bundle: true,
  plugins: [
    {
      name: "resolve-client-imports",
      setup(build) {
        build.onResolve(
          {
            filter: reactComponentExtension,
          },
          async ({ path }) => {
            const filePath = resolveApp(path);
            const file = Bun.file(filePath);
            const fileText = await file.text();

            if (/^(["'])use client\1/.test(fileText)) {
              const outputPath = toJSExtension(path);

              const outputFilePath = resolveDist(outputPath);
              clientComponentEntrypoints.set(outputFilePath, filePath);

              return {
                path: outputPath,
                external: true,
              };
            }
          }
        );
      },
    },
  ],
});

const build = await esbuild.build({
  entryPoints: [resolveApp("root.tsx"), ...clientComponentEntrypoints.values()],
  outdir: resolveDist(),
  format: "esm",
  splitting: true,
  bundle: true,
  write: false,
});

type OutputFiles = esbuild.OutputFile[];

const [outputFiles, outputClientFiles] = build.outputFiles.reduce<
  [OutputFiles, OutputFiles]
>(
  (acc, outputFile) => {
    const index = clientComponentEntrypoints.has(outputFile.path) ? 1 : 0;
    acc[index].push(outputFile);
    return acc;
  },
  [[], []]
);

const writeOutputFiles = outputFiles.map(
  async ({ path, text }) => await Bun.write(path, text)
);

const writeOutputClientFiles = outputClientFiles.map(async ({ path, text }) => {
  const [, exports] = parse(text);

  let newText = text;
  for (const exp of exports) {
    const key = uuidv4();

    clientComponentMap[key] = {
      id: `/dist/${relative(resolveDist(), path)}`,
      name: exp.n,
      chunks: [],
      async: true,
    };

    newText += `
${exp.ln}.$$id = ${JSON.stringify(key)};
${exp.ln}.$$typeof = Symbol.for("react.client.reference");
    `;
  }
  await Bun.write(path, newText);
});

await Promise.all([...writeOutputFiles, ...writeOutputClientFiles]);
