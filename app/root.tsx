// @ts-expect-error -- no declarations
import { use, cache } from "react";
import { createRoot } from "react-dom/client";
import { createFromFetch } from "react-server-dom-webpack/client";

declare global {
  interface Window {
    __webpack_require__: (id: string) => Promise<unknown>;
  }
}

window.__webpack_require__ = (id) => import(id);

const rootElement = document.getElementById("root");
if (!rootElement) throw Error("root element is not defined");

const root = createRoot(rootElement);
root.render(<Root />);

const rsc = cache((search: string) => {
  return createFromFetch(fetch(`/rsc` + search));
});

const search = window.location.search;

function Root() {
  return use(rsc(search));
}
