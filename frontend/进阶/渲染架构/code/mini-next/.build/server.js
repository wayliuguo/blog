var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/server-entry.ts
import { renderToString } from "react-dom/server";
import { createElement } from "react";

// pages/about.tsx
var about_exports = {};
__export(about_exports, {
  default: () => About
});
import { jsx, jsxs } from "react/jsx-runtime";
function About() {
  return /* @__PURE__ */ jsxs("main", { children: [
    /* @__PURE__ */ jsx("h1", { children: "\u5173\u4E8E\u672C\u7AD9" }),
    /* @__PURE__ */ jsx("p", { children: "\u8FD9\u662F\u4E00\u4E2A\u624B\u5199 mini-next \u6F14\u793A\u7AD9\uFF1A\u6587\u4EF6\u8DEF\u7531 + SSR + hydration\u3002" }),
    /* @__PURE__ */ jsx("a", { href: "/", children: "\u8FD4\u56DE\u5217\u8868" })
  ] });
}

// pages/index.tsx
var pages_exports = {};
__export(pages_exports, {
  default: () => Home,
  load: () => load
});

// src/data.ts
var orders = [
  { id: "1001", title: "\u673A\u68B0\u952E\u76D8", amount: 399, status: "paid" },
  { id: "1002", title: "\u663E\u793A\u5668\u652F\u67B6", amount: 259, status: "pending" },
  { id: "1003", title: "USB-C \u6269\u5C55\u575E", amount: 189, status: "paid" },
  { id: "1004", title: "\u4EBA\u4F53\u5DE5\u5B66\u6905", amount: 1299, status: "refunded" },
  { id: "1005", title: "\u964D\u566A\u8033\u673A", amount: 899, status: "paid" }
];
function findOrder(id) {
  return orders.find((o) => o.id === id);
}

// pages/index.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
async function load() {
  return { total: orders.length, first: orders[0].title, orders };
}
function Home({ total, orders: orders2 }) {
  return /* @__PURE__ */ jsxs2("main", { children: [
    /* @__PURE__ */ jsx2("h1", { children: "\u8BA2\u5355\u4E2D\u5FC3" }),
    /* @__PURE__ */ jsxs2("p", { children: [
      "\u5171 ",
      total,
      " \u7B14\u8BA2\u5355"
    ] }),
    /* @__PURE__ */ jsx2("ul", { children: orders2.map((o) => /* @__PURE__ */ jsx2("li", { children: /* @__PURE__ */ jsxs2("a", { href: `/order/${o.id}`, children: [
      "#",
      o.id,
      " ",
      o.title
    ] }) }, o.id)) })
  ] });
}

// pages/order/[id].tsx
var id_exports = {};
__export(id_exports, {
  default: () => OrderDetail,
  load: () => load2
});
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
async function load2(params) {
  return { order: findOrder(params.id) ?? null };
}
function OrderDetail({ order }) {
  if (!order) {
    return /* @__PURE__ */ jsxs3("main", { children: [
      /* @__PURE__ */ jsx3("h1", { children: "404" }),
      /* @__PURE__ */ jsx3("p", { children: "\u8BA2\u5355\u4E0D\u5B58\u5728" }),
      /* @__PURE__ */ jsx3("a", { href: "/", children: "\u8FD4\u56DE\u5217\u8868" })
    ] });
  }
  return /* @__PURE__ */ jsxs3("main", { children: [
    /* @__PURE__ */ jsxs3("h1", { children: [
      "\u8BA2\u5355 ",
      order.id
    ] }),
    /* @__PURE__ */ jsxs3("p", { children: [
      order.title,
      " \xB7 \xA5",
      order.amount,
      " \xB7 ",
      order.status
    ] }),
    /* @__PURE__ */ jsx3("a", { href: "/", children: "\u8FD4\u56DE\u5217\u8868" })
  ] });
}

// src/generated/routes.gen.ts
var routes = [
  { pattern: "/about", page: about_exports },
  { pattern: "", page: pages_exports },
  { pattern: "/order/:id", page: id_exports }
];

// src/match.ts
function matchRoute(routes2, pathname) {
  const segs = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  for (const r of routes2) {
    const parts = r.pattern.split("/").filter(Boolean);
    if (parts.length !== segs.length) continue;
    const params = {};
    const ok = parts.every((p, i) => {
      if (p.startsWith(":")) {
        params[p.slice(1)] = segs[i];
        return true;
      }
      return p === segs[i];
    });
    if (ok) return { page: r.page, params };
  }
  return null;
}

// src/html.ts
function renderHtml(root, props, entry) {
  const payload = JSON.stringify(props).replace(/</g, "\\u003c");
  return `<!doctype html>
<html><body><div id="root">${root}</div>
<script>window.__PROPS__=${payload}</script>
<script src="${entry}"></script></body></html>`;
}

// src/server-entry.ts
async function renderPage(pathname) {
  const matched = matchRoute(routes, pathname);
  if (!matched) return null;
  const props = matched.page.load ? await matched.page.load(matched.params) : {};
  const html = renderToString(createElement(matched.page.default, props));
  return { html, props };
}
export {
  matchRoute,
  renderHtml,
  renderPage,
  routes
};
