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

createFromFetch(fetch("/rsc")).then((comp) => {
  root.render(comp);
});
