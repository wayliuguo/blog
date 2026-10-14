import { u as useRoute, a as __nuxt_component_0 } from "../server.mjs";
import { defineComponent, withAsyncContext, unref, withCtx, createTextVNode, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrInterpolate, ssrRenderComponent } from "vue/server-renderer";
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
        _push(`<!--[--><h1>订单 ${ssrInterpolate(unref(order).id)}（SWR 10s）</h1><p>${ssrInterpolate(unref(order).title)} · ¥${ssrInterpolate(unref(order).amount)} · ${ssrInterpolate(unref(order).status)}</p><!--]-->`);
      } else if (unref(error)) {
        _push(`<!--[--><h1>404</h1><p>订单不存在</p><!--]-->`);
      } else {
        _push(`<!---->`);
      }
      _push(ssrRenderComponent(_component_NuxtLink, { to: "/orders" }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`返回列表`);
          } else {
            return [
              createTextVNode("返回列表")
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
export {
  _sfc_main as default
};
//# sourceMappingURL=_id_-D3usduDB.js.map
