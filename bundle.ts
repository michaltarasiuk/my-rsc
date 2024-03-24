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

const clientComponentEntrypoints = new Set<string>();

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
            filter: /\.tsx$/,
          },
          async ({ path }) => {
            const filePath = resolveApp(path);
            const file = Bun.file(filePath);
            const fileText = await file.text();

            if (fileText.startsWith('"use client"')) {
              clientComponentEntrypoints.add(filePath);

              return {
                path: path.replace(/\.tsx$/, ".js"),
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
  entrypoints: [resolveApp("main.ts"), ...clientComponentEntrypoints],
  outdir: resolveDist(),
  splitting: true,
});

const outputFiles = await Promise.all(
  outputs.map(async ({ path }) => {
    const file = Bun.file(path);
    const fileText = await file.text();

    return [path, fileText] as const;
  })
);

for (const [path, fileText] of outputFiles) {
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
