import { u as useRoute, a as __nuxt_component_0 } from './server.mjs';
import { defineComponent, withAsyncContext, unref, withCtx, createTextVNode, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrInterpolate, ssrRenderComponent } from 'vue/server-renderer';
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

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "[id]",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const route = useRoute();
    const id = route.params.id;
    const { data: order, error } = ([__temp, __restore] = withAsyncContext(() => useFetch(
      `/api/orders/${id}`,
      "$BKe_rxcURa"
      /* nuxt-injected */
    )), __temp = await __temp, __restore(), __temp);
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0;
      _push(`<main${ssrRenderAttrs(_attrs)}>`);
      if (unref(order)) {
        _push(`<!--[--><h1>\u8BA2\u5355 ${ssrInterpolate(unref(order).id)}\uFF08SWR 10s\uFF09</h1><p>${ssrInterpolate(unref(order).title)} \xB7 \xA5${ssrInterpolate(unref(order).amount)} \xB7 ${ssrInterpolate(unref(order).status)}</p><!--]-->`);
      } else if (unref(error)) {
        _push(`<!--[--><h1>404</h1><p>\u8BA2\u5355\u4E0D\u5B58\u5728</p><!--]-->`);
      } else {
        _push(`<!---->`);
      }
      _push(ssrRenderComponent(_component_NuxtLink, { to: "/orders" }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`\u8FD4\u56DE\u5217\u8868`);
          } else {
            return [
              createTextVNode("\u8FD4\u56DE\u5217\u8868")
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/orders/[id].vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=_id_-D3usduDB.mjs.map
