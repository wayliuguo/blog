import { defineComponent, ref, unref, useSSRContext } from "vue";
import { ssrRenderAttrs, ssrInterpolate } from "vue/server-renderer";
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "client-only",
  __ssrInlineRender: true,
  setup(__props) {
    const now = ref("");
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<main${ssrRenderAttrs(_attrs)}><h1>纯 CSR 页（ssr: false）</h1><p>本页 HTML 里没有这段内容，curl 看不到「当前时间」四个字。</p><p>当前时间：${ssrInterpolate(unref(now) || "（客户端挂载后出现）")}</p></main>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/client-only.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  _sfc_main as default
};
//# sourceMappingURL=client-only-Cq2sdnQf.js.map
