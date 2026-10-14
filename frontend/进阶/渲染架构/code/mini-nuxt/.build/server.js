var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/server-entry.ts
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";

// pages/index.vue
var pages_exports = {};
__export(pages_exports, {
  default: () => pages_default
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

// pages/index.vue
import { ssrRenderAttr as _ssrRenderAttr, ssrRenderAttrs as _ssrRenderAttrs, ssrInterpolate as _ssrInterpolate, ssrRenderList as _ssrRenderList } from "vue/server-renderer";
var __default__ = {
  props: ["orders"],
  asyncData() {
    return { orders };
  }
};
function ssrRender(_ctx, _push, _parent, _attrs) {
  _push(`<main${_ssrRenderAttrs(_attrs)}><h1>\u8BA2\u5355\u4E2D\u5FC3\uFF08Vue SSR\uFF09</h1><p>\u5171 ${_ssrInterpolate(_ctx.orders.length)} \u7B14\u8BA2\u5355</p><ul><!--[-->`);
  _ssrRenderList(_ctx.orders, (o) => {
    _push(`<li><a${_ssrRenderAttr("href", "/order/" + o.id)}>#${_ssrInterpolate(o.id)} ${_ssrInterpolate(o.title)}</a></li>`);
  });
  _push(`<!--]--></ul></main>`);
}
var pages_default = Object.assign(__default__, { ssrRender });

// pages/order/[id].vue
var id_exports = {};
__export(id_exports, {
  default: () => id_default
});
import { ssrRenderAttrs as _ssrRenderAttrs2, ssrInterpolate as _ssrInterpolate2 } from "vue/server-renderer";
var __default__2 = {
  props: ["order"],
  asyncData({ params }) {
    return { order: findOrder(params.id) ?? null };
  }
};
function ssrRender2(_ctx, _push, _parent, _attrs) {
  _push(`<main${_ssrRenderAttrs2(_attrs)}>`);
  if (_ctx.order) {
    _push(`<!--[--><h1>\u8BA2\u5355 ${_ssrInterpolate2(_ctx.order.id)}</h1><p>${_ssrInterpolate2(_ctx.order.title)} \xB7 \xA5${_ssrInterpolate2(_ctx.order.amount)} \xB7 ${_ssrInterpolate2(_ctx.order.status)}</p><!--]-->`);
  } else {
    _push(`<!--[--><h1>404</h1><p>\u8BA2\u5355\u4E0D\u5B58\u5728</p><!--]-->`);
  }
  _push(`<a href="/">\u8FD4\u56DE\u5217\u8868</a></main>`);
}
var id_default = Object.assign(__default__2, { ssrRender: ssrRender2 });

// src/generated/routes.gen.ts
var routes = [
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
  const comp = matched.page.default;
  const props = comp.asyncData ? await comp.asyncData({ params: matched.params }) : {};
  const app = createSSRApp({ render: () => h(comp, props) });
  const html = await renderToString(app);
  return { html, props };
}
export {
  matchRoute,
  renderHtml,
  renderPage,
  routes
};
