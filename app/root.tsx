// @ts-expect-error -- not defined in declarations
import { use } from "react";
import { createRoot } from "react-dom/client";
import { createFromFetch } from "react-server-dom-webpack/client";

declare global {
  interface Window {
    __webpack_require__: (id: string) => Promise<unknown>;
  }
}

window.__webpack_require__ = async (id) => {
  return import(id);
};

const rootElement = document.getElementById("root");
if (!rootElement) throw Error("root element is not defined");

const root = createRoot(rootElement);
root.render(<Root />);

const cache = new Map<string, ReturnType<typeof createFromFetch>>();
const params = new URLSearchParams(document.location.search);

function Root() {
  const search = params.get("q") ?? "";
  if (!cache.has(search)) {
    cache.set(
      search,
      createFromFetch(fetch(`/rsc?q=${encodeURIComponent(search)}`))
    );
  }

  return use(cache.get(search));
}
