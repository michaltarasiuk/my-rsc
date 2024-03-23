import path from "node:path";
import * as ReactServerDom from "react-server-dom-webpack/server.browser";
import { Page } from "./app/page";
import { parse } from "es-module-lexer";
import { v4 as uuidv4 } from "uuid";

const cwd = process.cwd();

const notFound = () => {
  return new Response("404!", {
    status: 404,
  });
};

type Resolver = (request: Request) => Response | Promise<Response>;

const staticFileResolver: Resolver = async (request: Request) => {
  const requestURL = new URL(request.url);

  const filePath = path.join(cwd, requestURL.pathname);
  const file = Bun.file(filePath);

  if (await file.exists()) {
    return new Response(file);
  }
  return notFound();
};

const clientComponentMap: Record<
  string,
  {
    id: string;
    name: string;
    chunks: [];
    async: true;
  }
> = {};

const rscResolver: Resolver = async (_request: Request) => {
  const stream = ReactServerDom.renderToReadableStream(<Page />, {});
  return new Response(stream);
};

const routeResolvers = {
  "/public/(.*)": staticFileResolver,
  "/dist/(.*)": staticFileResolver,
  "/rsc": rscResolver,
} satisfies Record<string, (request: Request) => Response | Promise<Response>>;

const routeEntries = Object.entries(routeResolvers).map(
  ([path, resolver]) => [new RegExp(path), resolver] as const
);

function resolveRoute(request: Request) {
  const url = new URL(request.url);
  const routeEntry = routeEntries.find(([path]) => path.test(url.pathname));

  return routeEntry?.[1] ?? (() => notFound());
}

const server = Bun.serve({
  async fetch(request) {
    const route = resolveRoute(request);
    return await route(request);
  },
});

console.log(`Listening on ${server.hostname}:${server.port}`);

const appDir = new URL("./app/", import.meta.url);
const distDir = new URL("./dist/", import.meta.url);

function resolveApp(path = "") {
  return Bun.fileURLToPath(new URL(path, appDir));
}

function resolveDist(path = "") {
  return Bun.fileURLToPath(new URL(path, distDir));
}

async function bundlePage() {
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

  if (!clientComponentEntrypoints.size) return;

  const { outputs } = await Bun.build({
    entrypoints: Array.from(clientComponentEntrypoints),
    outdir: resolveDist(),
    external: ["react"],
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
}

async function bundle() {
  await Promise.all([
    Bun.build({
      entrypoints: [resolveApp("main.ts")],
      outdir: resolveDist(),
    }),
    bundlePage(),
  ]);
}

bundle();
