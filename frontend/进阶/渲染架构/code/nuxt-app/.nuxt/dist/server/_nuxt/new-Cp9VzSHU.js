import { defineComponent, ref, unref, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrRenderAttr, ssrRenderStyle, ssrInterpolate } from "vue/server-renderer";
import "E:/working/blog/frontend/进阶/渲染架构/code/nuxt-app/node_modules/hookable/dist/index.mjs";
import "../server.mjs";
import "E:/working/blog/frontend/进阶/渲染架构/code/nuxt-app/node_modules/ofetch/dist/node.mjs";
import "#internal/nuxt/paths";
import "E:/working/blog/frontend/进阶/渲染架构/code/nuxt-app/node_modules/unctx/dist/index.mjs";
import "E:/working/blog/frontend/进阶/渲染架构/code/nuxt-app/node_modules/h3/dist/index.mjs";
import "vue-router";
import "E:/working/blog/frontend/进阶/渲染架构/code/nuxt-app/node_modules/defu/dist/defu.mjs";
import "E:/working/blog/frontend/进阶/渲染架构/code/nuxt-app/node_modules/ufo/dist/index.mjs";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "new",
  __ssrInlineRender: true,
  setup(__props) {
    const title = ref("");
    const amount = ref(null);
    const error = ref("");
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<main${ssrRenderAttrs(_attrs)}><h1>新建订单（Nitro API）</h1><form><p><input${ssrRenderAttr("value", unref(title))} placeholder="商品标题" required></p><p><input${ssrRenderAttr("value", unref(amount))} type="number" min="1" placeholder="金额" required></p><button type="submit">提交</button>`);
      if (unref(error)) {
        _push(`<p style="${ssrRenderStyle({ "color": "red" })}">${ssrInterpolate(unref(error))}</p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</form></main>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/orders/new.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  _sfc_main as default
};
//# sourceMappingURL=new-Cp9VzSHU.js.map
