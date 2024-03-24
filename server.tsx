import path from "node:path";
import * as ReactServerDom from "react-server-dom-webpack/server.browser";
import { Page } from "./app/page";
import { clientComponentMap } from "./bundle";

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

const rscResolver: Resolver = async (_request: Request) => {
  const stream = ReactServerDom.renderToReadableStream(
    <Page />,
    clientComponentMap
  );
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
