import { a as __nuxt_component_0 } from './server.mjs';
import { defineComponent, withAsyncContext, unref, withCtx, createTextVNode, toDisplayString, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrInterpolate, ssrRenderList, ssrRenderComponent } from 'vue/server-renderer';
import { u as useFetch } from './fetch-BNUCDLmg.mjs';
import '../_/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'unhead/server';
import 'devalue';
import 'unhead/utils';
import 'unhead/plugins';
import 'vue-router';
import '@vue/shared';

function useOrders() {
  return useFetch(
    "/api/orders",
    "$Tt-bHod3sL"
    /* nuxt-injected */
  );
}
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const { data, error } = ([__temp, __restore] = withAsyncContext(() => useOrders()), __temp = await __temp, __restore(), __temp);
    return (_ctx, _push, _parent, _attrs) => {
      var _a;
      const _component_NuxtLink = __nuxt_component_0;
      _push(`<main${ssrRenderAttrs(_attrs)}><h1>\u8BA2\u5355\u5217\u8868\uFF08SWR 10s\uFF09</h1>`);
      if (unref(error)) {
        _push(`<p>\u52A0\u8F7D\u5931\u8D25\uFF1A${ssrInterpolate(unref(error).message)}</p>`);
      } else {
        _push(`<ul><!--[-->`);
        ssrRenderList((_a = unref(data)) == null ? void 0 : _a.orders, (o) => {
          _push(`<li>`);
          _push(ssrRenderComponent(_component_NuxtLink, {
            to: `/orders/${o.id}`
          }, {
            default: withCtx((_, _push2, _parent2, _scopeId) => {
              if (_push2) {
                _push2(`#${ssrInterpolate(o.id)} ${ssrInterpolate(o.title)} \xB7 \xA5${ssrInterpolate(o.amount)} \xB7 ${ssrInterpolate(o.status)}`);
              } else {
                return [
                  createTextVNode("#" + toDisplayString(o.id) + " " + toDisplayString(o.title) + " \xB7 \xA5" + toDisplayString(o.amount) + " \xB7 " + toDisplayString(o.status), 1)
                ];
              }
            }),
            _: 2
          }, _parent));
          _push(`</li>`);
        });
        _push(`<!--]--></ul>`);
      }
      _push(ssrRenderComponent(_component_NuxtLink, { to: "/orders/new" }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`\u65B0\u5EFA\u8BA2\u5355 \u2192`);
          } else {
            return [
              createTextVNode("\u65B0\u5EFA\u8BA2\u5355 \u2192")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</main>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/orders/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=index-C5l0E0kk.mjs.map
