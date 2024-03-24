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

await Bun.build({
  entrypoints: [resolveApp("page.tsx")],
  outdir: resolveDist(),
  external: ["react"],
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

            if (fileText.startsWith('"use client"')) {
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

const { outputs } = await Bun.build({
  entrypoints: [resolveApp("main.ts"), ...clientComponentEntrypoints.values()],
  outdir: resolveDist(),
  splitting: true,
});

const clientOutputs = outputs.filter((output) =>
  clientComponentEntrypoints.has(output.path)
);

const clientOutputEntries = await Promise.all(
  clientOutputs.map(async ({ path }) => {
    const file = Bun.file(path);
    const fileText = await file.text();

    return [path, fileText] as const;
  })
);

for (const [path, fileText] of clientOutputEntries) {
  const [, exports] = parse(fileText);

  let newText = fileText;
  for (const exp of exports) {
    const key = uuidv4();

    clientComponentMap[key] = {
      id: resolveDist(path),
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
}
