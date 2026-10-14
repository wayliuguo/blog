import { defineComponent, ref, unref, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrInterpolate } from 'vue/server-renderer';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "client-only",
  __ssrInlineRender: true,
  setup(__props) {
    const now = ref("");
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<main${ssrRenderAttrs(_attrs)}><h1>\u7EAF CSR \u9875\uFF08ssr: false\uFF09</h1><p>\u672C\u9875 HTML \u91CC\u6CA1\u6709\u8FD9\u6BB5\u5185\u5BB9\uFF0Ccurl \u770B\u4E0D\u5230\u300C\u5F53\u524D\u65F6\u95F4\u300D\u56DB\u4E2A\u5B57\u3002</p><p>\u5F53\u524D\u65F6\u95F4\uFF1A${ssrInterpolate(unref(now) || "\uFF08\u5BA2\u6237\u7AEF\u6302\u8F7D\u540E\u51FA\u73B0\uFF09")}</p></main>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/client-only.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=client-only-Cq2sdnQf.mjs.map
