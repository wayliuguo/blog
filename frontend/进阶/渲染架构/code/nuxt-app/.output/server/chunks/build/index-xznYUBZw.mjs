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

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const { data: summary } = ([__temp, __restore] = withAsyncContext(() => useFetch(
      "/api/orders/summary",
      "$zFsHaBJmT_"
      /* nuxt-injected */
    )), __temp = await __temp, __restore(), __temp);
    return (_ctx, _push, _parent, _attrs) => {
      var _a, _b, _c;
      const _component_NuxtLink = __nuxt_component_0;
      _push(`<main${ssrRenderAttrs(_attrs)}><h1>\u8BA2\u5355\u4E2D\u5FC3\uFF08Nuxt\uFF09</h1><p>\u5171 ${ssrInterpolate((_a = unref(summary)) == null ? void 0 : _a.total)} \u7B14\u8BA2\u5355\uFF0C\u7D2F\u8BA1 \xA5${ssrInterpolate((_b = unref(summary)) == null ? void 0 : _b.amount)}</p><ul><!--[-->`);
      ssrRenderList((_c = unref(summary)) == null ? void 0 : _c.orders, (o) => {
        _push(`<li>`);
        _push(ssrRenderComponent(_component_NuxtLink, {
          to: `/orders/${o.id}`
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`#${ssrInterpolate(o.id)} ${ssrInterpolate(o.title)}`);
            } else {
              return [
                createTextVNode("#" + toDisplayString(o.id) + " " + toDisplayString(o.title), 1)
              ];
            }
          }),
          _: 2
        }, _parent));
        _push(`</li>`);
      });
      _push(`<!--]--></ul></main>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=index-xznYUBZw.mjs.map
