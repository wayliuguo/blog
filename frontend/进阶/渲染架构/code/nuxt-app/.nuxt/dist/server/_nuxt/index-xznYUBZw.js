import { a as __nuxt_component_0 } from "../server.mjs";
import { defineComponent, withAsyncContext, unref, withCtx, createTextVNode, toDisplayString, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrInterpolate, ssrRenderList, ssrRenderComponent } from "vue/server-renderer";
import { u as useFetch } from "./fetch-BNUCDLmg.js";
import "E:/working/blog/frontend/进阶/渲染架构/code/nuxt-app/node_modules/ofetch/dist/node.mjs";
import "#internal/nuxt/paths";
import "E:/working/blog/frontend/进阶/渲染架构/code/nuxt-app/node_modules/hookable/dist/index.mjs";
import "E:/working/blog/frontend/进阶/渲染架构/code/nuxt-app/node_modules/unctx/dist/index.mjs";
import "E:/working/blog/frontend/进阶/渲染架构/code/nuxt-app/node_modules/h3/dist/index.mjs";
import "vue-router";
import "E:/working/blog/frontend/进阶/渲染架构/code/nuxt-app/node_modules/defu/dist/defu.mjs";
import "E:/working/blog/frontend/进阶/渲染架构/code/nuxt-app/node_modules/ufo/dist/index.mjs";
import "E:/working/blog/frontend/进阶/渲染架构/code/nuxt-app/node_modules/ohash/dist/index.mjs";
import "@vue/shared";
import "E:/working/blog/frontend/进阶/渲染架构/code/nuxt-app/node_modules/perfect-debounce/dist/index.mjs";
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
      const _component_NuxtLink = __nuxt_component_0;
      _push(`<main${ssrRenderAttrs(_attrs)}><h1>订单中心（Nuxt）</h1><p>共 ${ssrInterpolate(unref(summary)?.total)} 笔订单，累计 ¥${ssrInterpolate(unref(summary)?.amount)}</p><ul><!--[-->`);
      ssrRenderList(unref(summary)?.orders, (o) => {
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
export {
  _sfc_main as default
};
//# sourceMappingURL=index-xznYUBZw.js.map
