import { defineComponent, ref, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderAttr, ssrRenderStyle, ssrInterpolate } from 'vue/server-renderer';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "new",
  __ssrInlineRender: true,
  setup(__props) {
    const title = ref("");
    const amount = ref(null);
    const error = ref("");
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<main${ssrRenderAttrs(_attrs)}><h1>\u65B0\u5EFA\u8BA2\u5355\uFF08Nitro API\uFF09</h1><form><p><input${ssrRenderAttr("value", unref(title))} placeholder="\u5546\u54C1\u6807\u9898" required></p><p><input${ssrRenderAttr("value", unref(amount))} type="number" min="1" placeholder="\u91D1\u989D" required></p><button type="submit">\u63D0\u4EA4</button>`);
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

export { _sfc_main as default };
//# sourceMappingURL=new-Cp9VzSHU.mjs.map
