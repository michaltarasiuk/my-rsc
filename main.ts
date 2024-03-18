import { renderToString } from "react-dom/server";
import { HelloWorld } from "./app/HelloWorld";
import { createElement } from "react";

Bun.serve({
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/") {
      const html = renderToString(createElement(HelloWorld));
      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    return new Response("404!");
  },
});
