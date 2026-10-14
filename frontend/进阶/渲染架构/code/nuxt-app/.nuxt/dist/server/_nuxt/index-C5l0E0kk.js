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
      const _component_NuxtLink = __nuxt_component_0;
      _push(`<main${ssrRenderAttrs(_attrs)}><h1>订单列表（SWR 10s）</h1>`);
      if (unref(error)) {
        _push(`<p>加载失败：${ssrInterpolate(unref(error).message)}</p>`);
      } else {
        _push(`<ul><!--[-->`);
        ssrRenderList(unref(data)?.orders, (o) => {
          _push(`<li>`);
          _push(ssrRenderComponent(_component_NuxtLink, {
            to: `/orders/${o.id}`
          }, {
            default: withCtx((_, _push2, _parent2, _scopeId) => {
              if (_push2) {
                _push2(`#${ssrInterpolate(o.id)} ${ssrInterpolate(o.title)} · ¥${ssrInterpolate(o.amount)} · ${ssrInterpolate(o.status)}`);
              } else {
                return [
                  createTextVNode("#" + toDisplayString(o.id) + " " + toDisplayString(o.title) + " · ¥" + toDisplayString(o.amount) + " · " + toDisplayString(o.status), 1)
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
            _push2(`新建订单 →`);
          } else {
            return [
              createTextVNode("新建订单 →")
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
export {
  _sfc_main as default
};
//# sourceMappingURL=index-C5l0E0kk.js.map
