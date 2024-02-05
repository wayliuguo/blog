import{_ as s,o as a,c as n,U as l}from"./chunks/framework.9adb0f96.js";const e="/blog/assets/introduce.bc2c2816.afc26ba0.png",p="/blog/assets/image-20230629200302816.811d5f79.png",f=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"article/vue3/vue3stage.md","filePath":"article/vue3/vue3stage.md","lastUpdated":1697555835000}'),t={name:"article/vue3/vue3stage.md"},o=l('<h2 id="vue3整体架构" tabindex="-1">vue3整体架构 <a class="header-anchor" href="#vue3整体架构" aria-label="Permalink to &quot;vue3整体架构&quot;">​</a></h2><p><img src="'+e+`" alt="introduce.bc2c2816"></p><h2 id="环境搭建" tabindex="-1">环境搭建 <a class="header-anchor" href="#环境搭建" aria-label="Permalink to &quot;环境搭建&quot;">​</a></h2><h3 id="安装依赖" tabindex="-1">安装依赖 <a class="header-anchor" href="#安装依赖" aria-label="Permalink to &quot;安装依赖&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">yarn add typescript rollup rollup-plugin-typescript2 @rollup/plugin-node-resolve @rollup/plugin-json @rollup/plugin-commonjs minimist execa@4 --ignore-workspace-root-check</span></span></code></pre></div><table><thead><tr><th style="text-align:center;">依赖</th><th style="text-align:center;">作用</th></tr></thead><tbody><tr><td style="text-align:center;">typescript</td><td style="text-align:center;">在项目中支持Typescript</td></tr><tr><td style="text-align:center;">rollup</td><td style="text-align:center;">打包工具</td></tr><tr><td style="text-align:center;">rollup-plugin-typescript2</td><td style="text-align:center;">rollup 和 ts的 桥梁</td></tr><tr><td style="text-align:center;">@rollup/plugin-json</td><td style="text-align:center;">支持引入json</td></tr><tr><td style="text-align:center;">@rollup/plugin-node-resolve</td><td style="text-align:center;">解析node第三方模块</td></tr><tr><td style="text-align:center;">@rollup/plugin-commonjs</td><td style="text-align:center;">将CommonJS转化为ES6Module</td></tr><tr><td style="text-align:center;">minimist</td><td style="text-align:center;">命令行参数解析</td></tr><tr><td style="text-align:center;">execa@4</td><td style="text-align:center;">开启子进程</td></tr></tbody></table><h3 id="monorepo" tabindex="-1">monorepo <a class="header-anchor" href="#monorepo" aria-label="Permalink to &quot;monorepo&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">yarn workspace @vue/reactivity add @vue/shared@1.0.0</span></span></code></pre></div><h2 id="reactive" tabindex="-1">Reactive <a class="header-anchor" href="#reactive" aria-label="Permalink to &quot;Reactive&quot;">​</a></h2><ul><li>reactive: 深层响应式代理。</li><li>shallowReactive：浅层响应式代理，只有根属性具有响应式。</li><li>readonly: 深层只读代理。</li><li>shallowReadonly：浅层只读代理，只有根属性只读。</li></ul><h3 id="shared" tabindex="-1">shared <a class="header-anchor" href="#shared" aria-label="Permalink to &quot;shared&quot;">​</a></h3><ul><li>isObject</li><li>extend</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">export const isObject = (value: unknown):boolean =&gt; typeof value === &quot;object&quot; &amp;&amp; value !== null;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">export const extend = Object.assign</span></span></code></pre></div><h3 id="reactive-1" tabindex="-1">reactive <a class="header-anchor" href="#reactive-1" aria-label="Permalink to &quot;reactive&quot;">​</a></h3><h4 id="index-ts" tabindex="-1">index.ts <a class="header-anchor" href="#index-ts" aria-label="Permalink to &quot;index.ts&quot;">​</a></h4><ul><li>导出 reactive、shallowReactive、readonly、shallowReadonly</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">export {</span></span>
<span class="line"><span style="color:#A6ACCD;">    reactive,</span></span>
<span class="line"><span style="color:#A6ACCD;">    shallowReactive,</span></span>
<span class="line"><span style="color:#A6ACCD;">    readonly,</span></span>
<span class="line"><span style="color:#A6ACCD;">    shallowReadonly</span></span>
<span class="line"><span style="color:#A6ACCD;">} from &#39;./reactive&#39;</span></span></code></pre></div><h4 id="reactive-ts" tabindex="-1">reactive.ts <a class="header-anchor" href="#reactive-ts" aria-label="Permalink to &quot;reactive.ts&quot;">​</a></h4><ul><li>通过<code>createReactiveObject</code> 柯里化通过配置结合Proxy生成代理对象并返回代理对象。 <ul><li>target：目标对象。</li><li>isReadonly：通过这个区分使用不同的缓存对象。</li><li>baseHandlers：配置 Proxy 的 getter setter。</li></ul></li><li>使用WeakMap 会自动垃圾回收，不会造成内存泄漏，存储的key只能是对象。</li><li>剩下的看 baseHandlers，这个在调用 createReactiveObject 时传入，具体看 baseHandlers.ts。</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">import { isObject } from &quot;@vue/shared&quot;;</span></span>
<span class="line"><span style="color:#A6ACCD;">import {</span></span>
<span class="line"><span style="color:#A6ACCD;">  mutableHandlers,</span></span>
<span class="line"><span style="color:#A6ACCD;">  readonlyHandlers,</span></span>
<span class="line"><span style="color:#A6ACCD;">  shallowReactiveHandlers,</span></span>
<span class="line"><span style="color:#A6ACCD;">  shallowReadonlyHandlers,</span></span>
<span class="line"><span style="color:#A6ACCD;">} from &quot;./baseHandlers&quot;;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">export function reactive(target) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  return createReactiveObject(target, false, mutableHandlers);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">export function shallowReactive(target) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  return createReactiveObject(target, false, shallowReactiveHandlers);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">export function readonly(target) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  return createReactiveObject(target, true, readonlyHandlers);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">export function shallowReadonly(target) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  return createReactiveObject(target, true, shallowReadonlyHandlers);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 代理缓存</span></span>
<span class="line"><span style="color:#A6ACCD;">// WeakMap 会自动垃圾回收，不会造成内存泄漏，存储的key只能是对象</span></span>
<span class="line"><span style="color:#A6ACCD;">const reactiveMap = new WeakMap();</span></span>
<span class="line"><span style="color:#A6ACCD;">const readonlyMap = new WeakMap();</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">/**</span></span>
<span class="line"><span style="color:#A6ACCD;"> * 柯里化 new Proxy() 最核心的需要拦截</span></span>
<span class="line"><span style="color:#A6ACCD;"> * @param target 目标对象</span></span>
<span class="line"><span style="color:#A6ACCD;"> * @param isReadonly boolean  是不是仅读</span></span>
<span class="line"><span style="color:#A6ACCD;"> * @param baseHandlers</span></span>
<span class="line"><span style="color:#A6ACCD;"> */</span></span>
<span class="line"><span style="color:#A6ACCD;">export function createReactiveObject(</span></span>
<span class="line"><span style="color:#A6ACCD;">  target: object,</span></span>
<span class="line"><span style="color:#A6ACCD;">  isReadonly: boolean,</span></span>
<span class="line"><span style="color:#A6ACCD;">  baseHandlers: object</span></span>
<span class="line"><span style="color:#A6ACCD;">) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 如果目标不是对象，没法拦截了 reactive 这个 api 只能拦截对象</span></span>
<span class="line"><span style="color:#A6ACCD;">  if (!isObject(target)) return target;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">  // 使用 proxy 代理, 将要代理的对象合对应的结果进行缓存</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 如果某个对象已经代理过了，就不要再次代理</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 可能一个对象 被代理是深度的 又被仅读代理了</span></span>
<span class="line"><span style="color:#A6ACCD;">  const proxyMap = isReadonly ? readonlyMap : reactiveMap;</span></span>
<span class="line"><span style="color:#A6ACCD;">  const existProxy = proxyMap.get(target);</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 如果已经被代理了直接返回即可</span></span>
<span class="line"><span style="color:#A6ACCD;">  if (existProxy) return existProxy;</span></span>
<span class="line"><span style="color:#A6ACCD;">  const proxy = new Proxy(target, baseHandlers);</span></span>
<span class="line"><span style="color:#A6ACCD;">  proxyMap.set(target, proxy);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">  return proxy;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h4 id="basehandlers-ts" tabindex="-1">baseHandlers.ts <a class="header-anchor" href="#basehandlers-ts" aria-label="Permalink to &quot;baseHandlers.ts&quot;">​</a></h4><ul><li>createGetter：通过配置生成不同的<code>getter</code>函数。 <ul><li>isReadonly: 是否仅读。</li><li>shallow: 是否浅层代理。</li><li>使用<code>Reflect</code>反射获取值。</li><li>如果是非仅读的，进行依赖收集，等会数据变化后更新对应视图。</li><li>如果是浅层的直接返回值。</li><li>如果是对象，则进行递归代理（vue2是初始化就直接递归代理，vue3是取值时会进行代理（懒代理））。</li></ul></li><li>createSetter <ul><li>使用<code>Reflect</code>反射设置值并返回boolean标识是否设置成功。</li></ul></li><li>Relect 的优点 <ul><li>后续Object的方法属性会往Reflect迁移。</li><li>如果用target[key] = value 方式设置值可能会失败，并不会报异常，也没有返回值标识。</li><li>Reflect 方法具备返回值,判断是否设置成功。</li></ul></li><li>readonlyObj <ul><li>用于readonly 的 setter。</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">import { extend, isObject } from &quot;@vue/shared&quot;;</span></span>
<span class="line"><span style="color:#A6ACCD;">import { reactive, readonly } from &quot;./reactive&quot;;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// Relect 的优点</span></span>
<span class="line"><span style="color:#A6ACCD;">// 1.后续Object的方法属性会往Reflect迁移</span></span>
<span class="line"><span style="color:#A6ACCD;">// 2.如果用target[key] = value 方式设置值可能会失败，并不会报异常，也没有返回值标识</span></span>
<span class="line"><span style="color:#A6ACCD;">// 2.Reflect 方法具备返回值</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 是否是仅读的，是的话set时会报异常</span></span>
<span class="line"><span style="color:#A6ACCD;">// 是否是深度的</span></span>
<span class="line"><span style="color:#A6ACCD;">function createGetter(isReadonly: boolean = false, shallow: boolean = false) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  // target: 目标对象 key: 属性名 receiver: Proxy</span></span>
<span class="line"><span style="color:#A6ACCD;">  return function get(target, key, receiver) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 使用 reflect获取结果</span></span>
<span class="line"><span style="color:#A6ACCD;">    // target: 需要取值的目标对象 key: 需要获取的值的键值 receiver: 如果target对象中指定了getter，receiver则为getter调用时的this值</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 相当于 target[key]</span></span>
<span class="line"><span style="color:#A6ACCD;">    const res = Reflect.get(target, key, receiver);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    // 如果是非仅读的，进行依赖收集，等会数据变化后更新对应视图</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (!isReadonly) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    // 如果是浅层的</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (shallow) return res;</span></span>
<span class="line"><span style="color:#A6ACCD;">    // vue2是初始化就直接递归代理，vue3是取值时会进行代理（懒代理）</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (isObject(res)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">      return isReadonly ? readonly(res) : reactive(res);</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    return res;</span></span>
<span class="line"><span style="color:#A6ACCD;">  };</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">function createSetter(isShallow: boolean = false) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  // target: 目标对象 key: 属性名 value: 新属性值 receiver: Proxy</span></span>
<span class="line"><span style="color:#A6ACCD;">  return function set(target, key, value, receiver) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // target: 需要取值的目标对象 key: 需要获取的值的键值 value: 设置的值 receiver: 如果target对象中指定了getter，receiver则为getter调用时的this值</span></span>
<span class="line"><span style="color:#A6ACCD;">    const result = Reflect.set(target, key, value, receiver);</span></span>
<span class="line"><span style="color:#A6ACCD;">    return result;</span></span>
<span class="line"><span style="color:#A6ACCD;">  };</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 生成 getter</span></span>
<span class="line"><span style="color:#A6ACCD;">const get = createGetter();</span></span>
<span class="line"><span style="color:#A6ACCD;">const shallowGet = createGetter(false, true);</span></span>
<span class="line"><span style="color:#A6ACCD;">const readonlyGet = createGetter(true);</span></span>
<span class="line"><span style="color:#A6ACCD;">const shallowReadonlyGet = createGetter(true, true);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 生成 setter</span></span>
<span class="line"><span style="color:#A6ACCD;">const set = createSetter();</span></span>
<span class="line"><span style="color:#A6ACCD;">const shallowSet = createSetter(true);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// readonly Setter</span></span>
<span class="line"><span style="color:#A6ACCD;">const readonlyObj = {</span></span>
<span class="line"><span style="color:#A6ACCD;">  set: (target, key) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.warn(\`set \${target} on key \${key} failed\`);</span></span>
<span class="line"><span style="color:#A6ACCD;">  },</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">export const mutableHandlers = {</span></span>
<span class="line"><span style="color:#A6ACCD;">  get,</span></span>
<span class="line"><span style="color:#A6ACCD;">  set,</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span>
<span class="line"><span style="color:#A6ACCD;">export const shallowReactiveHandlers = {</span></span>
<span class="line"><span style="color:#A6ACCD;">  get: shallowGet,</span></span>
<span class="line"><span style="color:#A6ACCD;">  set: shallowSet,</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span>
<span class="line"><span style="color:#A6ACCD;">export const readonlyHandlers = extend({</span></span>
<span class="line"><span style="color:#A6ACCD;">  get: readonlyGet</span></span>
<span class="line"><span style="color:#A6ACCD;">}, readonlyObj);</span></span>
<span class="line"><span style="color:#A6ACCD;">export const shallowReadonlyHandlers = extend({</span></span>
<span class="line"><span style="color:#A6ACCD;">  get: shallowReadonlyGet,</span></span>
<span class="line"><span style="color:#A6ACCD;">}, readonlyObj);</span></span></code></pre></div><h4 id="_1-reactive-html" tabindex="-1">1.reactive.html <a class="header-anchor" href="#_1-reactive-html" aria-label="Permalink to &quot;1.reactive.html&quot;">​</a></h4><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;script&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">  let { reactive, shallowReactive, readonly, shallowReadonly } = VueReactivity</span></span>
<span class="line"><span style="color:#A6ACCD;">  let stateReactive = reactive({</span></span>
<span class="line"><span style="color:#A6ACCD;">      name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">      info: {</span></span>
<span class="line"><span style="color:#A6ACCD;">          age: 18</span></span>
<span class="line"><span style="color:#A6ACCD;">      }</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span>
<span class="line"><span style="color:#A6ACCD;">        </span></span>
<span class="line"><span style="color:#A6ACCD;">  let stateShallowReactive = shallowReactive({</span></span>
<span class="line"><span style="color:#A6ACCD;">      name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">      info: {</span></span>
<span class="line"><span style="color:#A6ACCD;">          age: 18</span></span>
<span class="line"><span style="color:#A6ACCD;">      }</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">  let stateReadonly = readonly({</span></span>
<span class="line"><span style="color:#A6ACCD;">      name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">      info: {</span></span>
<span class="line"><span style="color:#A6ACCD;">          age: 18</span></span>
<span class="line"><span style="color:#A6ACCD;">      }</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span>
<span class="line"><span style="color:#A6ACCD;">        </span></span>
<span class="line"><span style="color:#A6ACCD;">  let stateShallowReadonly = shallowReadonly({</span></span>
<span class="line"><span style="color:#A6ACCD;">      name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">      info: {</span></span>
<span class="line"><span style="color:#A6ACCD;">          age: 18</span></span>
<span class="line"><span style="color:#A6ACCD;">      }</span></span>
<span class="line"><span style="color:#A6ACCD;">  })</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">  //  reactive</span></span>
<span class="line"><span style="color:#A6ACCD;">  stateReactive.info.age = 80</span></span>
<span class="line"><span style="color:#A6ACCD;">  stateReactive.name = &#39;wellReactive&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&#39;reactive&#39;, stateReactive.info, stateReactive.name)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">  //  shallowReactive</span></span>
<span class="line"><span style="color:#A6ACCD;">  stateShallowReactive.name = &#39;wellShallowReactive&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">  stateShallowReactive.info.age = 80</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&#39;shallowReactive&#39;, stateShallowReactive.info, stateShallowReactiname)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">  // shallowReadonly</span></span>
<span class="line"><span style="color:#A6ACCD;">  stateShallowReadonly.name = &#39;wellShallowReadonly&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">  stateShallowReadonly.info.age = 80</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&#39;shallowReadonly&#39;, stateShallowReadonly.info, stateShallowReadonname)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">  // readonly</span></span>
<span class="line"><span style="color:#A6ACCD;">  stateReadonly.name = &#39;wellReadonly&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">  stateReadonly.info.age = 80</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(&#39;readonly&#39;, stateReadonly.info, stateReadonly.name)</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/script&gt;</span></span></code></pre></div><h2 id="effect-副作用函数-收集依赖" tabindex="-1">effect：副作用函数（收集依赖） <a class="header-anchor" href="#effect-副作用函数-收集依赖" aria-label="Permalink to &quot;effect：副作用函数（收集依赖）&quot;">​</a></h2><ul><li><p>第一次默认就会执行</p></li><li><p>默认执行时会进行取值操作，只要取值就会调用<code>getter</code>，这时候将对应的<code>effect</code>函数存放起来，在重写赋值的时候执行对应的<code>effect</code>函数就可以实现页面的更新</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;div id=&quot;app&quot;&gt;&lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;script src=&quot;https://unpkg.com/vue@3/dist/vue.global.js&quot;&gt;&lt;/script&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;script&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">	const { effect, reactive } = Vue</span></span>
<span class="line"><span style="color:#A6ACCD;">    let state = reactive({</span></span>
<span class="line"><span style="color:#A6ACCD;">        name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">        age: 18</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">    effect(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        app.innerHTML = \`\${state.name}\${state.age}\`</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">    setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        state.age = 80</span></span>
<span class="line"><span style="color:#A6ACCD;">    }, 1000);</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/script&gt;</span></span></code></pre></div></li></ul><h3 id="reactive-index-ts" tabindex="-1">reactive/index.ts <a class="header-anchor" href="#reactive-index-ts" aria-label="Permalink to &quot;reactive/index.ts&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">...</span></span>
<span class="line"><span style="color:#A6ACCD;">export {</span></span>
<span class="line"><span style="color:#A6ACCD;">    effect</span></span>
<span class="line"><span style="color:#A6ACCD;">} from &#39;./effect&#39;</span></span></code></pre></div><h3 id="operators-ts" tabindex="-1">operators.ts <a class="header-anchor" href="#operators-ts" aria-label="Permalink to &quot;operators.ts&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">export const enum TrackOpTypes {</span></span>
<span class="line"><span style="color:#A6ACCD;">    GET</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h3 id="effect-ts" tabindex="-1">effect.ts <a class="header-anchor" href="#effect-ts" aria-label="Permalink to &quot;effect.ts&quot;">​</a></h3><ul><li><p>function <code>effect</code></p><ul><li>调用<code>createReactiveEffect</code>生成一个<code>effect</code>,这个<code>effect</code>是一个函数，默认执行一次。</li></ul></li><li><p>function <code>createReactiveEffect</code></p><ul><li>定义<code>effect</code>等于一个函数<code>reactiveEffect</code>。</li><li>这个函数利用<code>activeEffect</code>这个变量存储当前的<code>effect</code>，供 <code>track</code>函数获取。</li><li>由于在使用的时候可能会有<code>effect</code>中嵌套<code>effect</code>的情况，为了保证属性收集的<code>effect</code>是正确的，需要用<code>effectStack</code>入栈出栈保证<code>activeEffect</code>的正确。</li><li>执行传入的函数<code>fn</code>，这个函数的执行会触发对应的getter函数，这个时候进行依赖的关联（baseHanlers.ts =&gt; createGetter(if (!isReadonly)) 分支）</li></ul></li><li><p>function <code>track</code></p><ul><li><p><code>const targetMap = new WeakMap()</code>全局收集依赖的存储变量。</p></li><li><p>如果不是<code>effect</code>中触发的<code>getter</code>进而触发的<code>track</code>属性不需要收集依赖</p></li><li><p>判断此target是否已经存在<code>targetMap</code>,如果没存在则创建，其值是一个map，并赋值给depsMap。</p></li><li><p>从 depsMap 获取 key 对应的值，如果没有则创建并赋值给 dep，其值是一个set数组，用于存放effect数组</p></li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">import { TrackOpTypes } from &quot;./operators&quot;;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">export function effect(fn: Function, options: any = {}) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 需要让这个 effect 变成响应式的 effect，实现数据变化重新执行</span></span>
<span class="line"><span style="color:#A6ACCD;">  const effect = createReactiveEffect(fn, options);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">  // 响应式的effect默认会先执行一次，如果是lazy不执行</span></span>
<span class="line"><span style="color:#A6ACCD;">  if (!options.lazy) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    effect();</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">  return effect;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 全局 effect，用于存储当前的 effect，供 track 获取</span></span>
<span class="line"><span style="color:#A6ACCD;">let activeEffect;</span></span>
<span class="line"><span style="color:#A6ACCD;">/**</span></span>
<span class="line"><span style="color:#A6ACCD;"> * effect 栈，用于effect 嵌套中获得正确的effect上下文</span></span>
<span class="line"><span style="color:#A6ACCD;"> * 保证每个属性收集的effect是正确的</span></span>
<span class="line"><span style="color:#A6ACCD;"> * effect(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;"> *  state.name // effect1</span></span>
<span class="line"><span style="color:#A6ACCD;"> *  effect(() =&gt; {state.age}) //effect2</span></span>
<span class="line"><span style="color:#A6ACCD;"> *  state.sex // effect1</span></span>
<span class="line"><span style="color:#A6ACCD;"> * })</span></span>
<span class="line"><span style="color:#A6ACCD;"> */</span></span>
<span class="line"><span style="color:#A6ACCD;">const effectStack = [];</span></span>
<span class="line"><span style="color:#A6ACCD;">// effect 唯一标识,用于区分 effect</span></span>
<span class="line"><span style="color:#A6ACCD;">let uid = 0;</span></span>
<span class="line"><span style="color:#A6ACCD;">function createReactiveEffect(fn, options) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  const effect = function reactiveEffect() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 保证此effect没有加入到effectStack 中，防止死循环</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 如 effect(() =&gt; state.age++) 如果没有这个判断，状态改变后重新执行会死循环</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (!effectStack.includes(effect)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">      try {</span></span>
<span class="line"><span style="color:#A6ACCD;">        effectStack.push(effect);</span></span>
<span class="line"><span style="color:#A6ACCD;">        activeEffect = effect;</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 函数执行时会执行对应的 getter 方法，这个时候进行关联</span></span>
<span class="line"><span style="color:#A6ACCD;">        // baseHanlers.ts =&gt; createGetter(if (!isReadonly)) 分支</span></span>
<span class="line"><span style="color:#A6ACCD;">        return fn();</span></span>
<span class="line"><span style="color:#A6ACCD;">      } finally {</span></span>
<span class="line"><span style="color:#A6ACCD;">        effectStack.pop();</span></span>
<span class="line"><span style="color:#A6ACCD;">        activeEffect = effectStack[effectStack.length - 1];</span></span>
<span class="line"><span style="color:#A6ACCD;">      }</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">  };</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 唯一标识</span></span>
<span class="line"><span style="color:#A6ACCD;">  effect.id = uid++;</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 用于标识这个是响应式effect</span></span>
<span class="line"><span style="color:#A6ACCD;">  effect._isEffect = true;</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 记录effect对应的函数</span></span>
<span class="line"><span style="color:#A6ACCD;">  effect.raw = fn;</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 记录选项</span></span>
<span class="line"><span style="color:#A6ACCD;">  effect.options = options;</span></span>
<span class="line"><span style="color:#A6ACCD;">  return effect;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 收集effect依赖</span></span>
<span class="line"><span style="color:#A6ACCD;">const targetMap = new WeakMap();</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">/**</span></span>
<span class="line"><span style="color:#A6ACCD;"> * 让某个对象中的属性收集对应的effect函数</span></span>
<span class="line"><span style="color:#A6ACCD;"> * @param target 目标对象</span></span>
<span class="line"><span style="color:#A6ACCD;"> * @param type 类型</span></span>
<span class="line"><span style="color:#A6ACCD;"> * @param key 属性</span></span>
<span class="line"><span style="color:#A6ACCD;"> */</span></span>
<span class="line"><span style="color:#A6ACCD;">export function track(target: object, type: TrackOpTypes, key: string) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 构建对应的weakMap(key: target value: map(key: key(依赖属性名), value: set[effect1,...]))</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 没在effect中使用的属性不用收集</span></span>
<span class="line"><span style="color:#A6ACCD;">  if (activeEffect === undefined) return;</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 从 targetMap 获取 target 对应的值，如果没有则创建并赋值给 depsMap，其值是一个map，用于存放key =&gt; set[effect]</span></span>
<span class="line"><span style="color:#A6ACCD;">  let depsMap = targetMap.get(target);</span></span>
<span class="line"><span style="color:#A6ACCD;">  if (!depsMap) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    targetMap.set(target, (depsMap = new Map()));</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 从 depsMap 获取 key 对应的值，如果没有则创建并赋值给 dep，其值是一个set数组，用于存放effect数组</span></span>
<span class="line"><span style="color:#A6ACCD;">  let dep = depsMap.get(key);</span></span>
<span class="line"><span style="color:#A6ACCD;">  if (!dep) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    depsMap.set(key, (dep = new Set()));</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 避免添加重复的</span></span>
<span class="line"><span style="color:#A6ACCD;">  if (!dep.has(activeEffect)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    dep.add(activeEffect)</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(targetMap)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h3 id="basehandlers-ts-1" tabindex="-1">baseHandlers.ts <a class="header-anchor" href="#basehandlers-ts-1" aria-label="Permalink to &quot;baseHandlers.ts&quot;">​</a></h3><ul><li>在 <code>effect</code>的执行时，会触发这里的<code>getter</code>函数，在这里调用<code>track</code>函数进行依赖的收集。</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function createGetter(isReadonly: boolean = false, shallow: boolean = false) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  // target: 目标对象 key: 属性名 receiver: Proxy</span></span>
<span class="line"><span style="color:#A6ACCD;">  return function get(target, key, receiver) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 使用 reflect获取结果</span></span>
<span class="line"><span style="color:#A6ACCD;">    // target: 需要取值的目标对象 key: 需要获取的值的键值 receiver: 如果target对象中指定了getter，receiver则为getter调用时的this值</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 相当于 target[key]</span></span>
<span class="line"><span style="color:#A6ACCD;">    const res = Reflect.get(target, key, receiver);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    // 如果是非仅读的，进行依赖收集，等会数据变化后更新对应视图</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (!isReadonly) {</span></span>
<span class="line"><span style="color:#A6ACCD;">      + console.log(&quot;执行 effect 时会取值，收集 effect&quot;);</span></span>
<span class="line"><span style="color:#A6ACCD;">      + // 调用 track 收集依赖</span></span>
<span class="line"><span style="color:#A6ACCD;">      + track(target, TrackOpTypes.GET, key);</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    // 如果是浅层的</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (shallow) return res;</span></span>
<span class="line"><span style="color:#A6ACCD;">    // vue2是初始化就直接递归代理，vue3是取值时会进行代理（懒代理）</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (isObject(res)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">      return isReadonly ? readonly(res) : reactive(res);</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    return res;</span></span>
<span class="line"><span style="color:#A6ACCD;">  };</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;script src=&quot;../node_modules/@vue/reactivity/dist/reactivity.global.js&quot;&gt;&lt;/script&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;script&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        const { effect, reactive } = VueReactivity</span></span>
<span class="line"><span style="color:#A6ACCD;">        let state = reactive({</span></span>
<span class="line"><span style="color:#A6ACCD;">            name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">            age: 18</span></span>
<span class="line"><span style="color:#A6ACCD;">        })</span></span>
<span class="line"><span style="color:#A6ACCD;">        effect(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            app.innerHTML = \`\${state.name}\${state.age}\`</span></span>
<span class="line"><span style="color:#A6ACCD;">        })</span></span>
<span class="line"><span style="color:#A6ACCD;">        effect(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            app.innerHTML = \`\${state.name}\${state.age}\`</span></span>
<span class="line"><span style="color:#A6ACCD;">        })</span></span>
<span class="line"><span style="color:#A6ACCD;">        setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            state.age = 80</span></span>
<span class="line"><span style="color:#A6ACCD;">        }, 1000);</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;/script&gt;</span></span></code></pre></div><p><img src="`+p+`" alt="image-20230629200302816"></p><h2 id="触发更新" tabindex="-1">触发更新 <a class="header-anchor" href="#触发更新" aria-label="Permalink to &quot;触发更新&quot;">​</a></h2><h3 id="operators-ts-1" tabindex="-1">operators.ts <a class="header-anchor" href="#operators-ts-1" aria-label="Permalink to &quot;operators.ts&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">...</span></span>
<span class="line"><span style="color:#A6ACCD;">export const enum TriggerOrTypes {</span></span>
<span class="line"><span style="color:#A6ACCD;">    ADD,</span></span>
<span class="line"><span style="color:#A6ACCD;">    SET</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h3 id="basehandlers-ts-2" tabindex="-1">baseHandlers.ts <a class="header-anchor" href="#basehandlers-ts-2" aria-label="Permalink to &quot;baseHandlers.ts&quot;">​</a></h3><ul><li>当数据更新时，通知对应属性的收集的<code>effect</code>重新执行</li><li>这里需要区分属性是新增的还是修改的</li><li>获取旧数据（watch需要旧数据）</li><li>调用 trigger 收集所有待重新执行的<code>effect</code>,统一执行。</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">function createSetter(isShallow: boolean = false) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  // target: 目标对象 key: 属性名 value: 新属性值 receiver: Proxy</span></span>
<span class="line"><span style="color:#A6ACCD;">  return function set(target, key, value, receiver) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    +// 当数据更新时，通知对应属性的 effect 重新执行</span></span>
<span class="line"><span style="color:#A6ACCD;">    +// 我们要区分是新增的还是修改的</span></span>
<span class="line"><span style="color:#A6ACCD;">    +// vue2里无法监控更改索引，无法监控数组的长度</span></span>
<span class="line"><span style="color:#A6ACCD;">    +// 获取未变更的值</span></span>
<span class="line"><span style="color:#A6ACCD;">    +const oldValue = target[key];</span></span>
<span class="line"><span style="color:#A6ACCD;">    +// 判断是否存在这个属性</span></span>
<span class="line"><span style="color:#A6ACCD;">    +let hadKey =</span></span>
<span class="line"><span style="color:#A6ACCD;">    +  isArray(target) &amp;&amp; isIntegerKey(key)</span></span>
<span class="line"><span style="color:#A6ACCD;">    +   ? Number(key) &lt; target.length</span></span>
<span class="line"><span style="color:#A6ACCD;">    +    : hasOwn(target, key);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    // target: 需要取值的目标对象 key: 需要获取的值的键值 value: 设置的值 receiver: 如果target对象中指定了getter，receiver则为getter调用时的this值</span></span>
<span class="line"><span style="color:#A6ACCD;">    const result = Reflect.set(target, key, value, receiver);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    +if (!hadKey) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    +  // 新增</span></span>
<span class="line"><span style="color:#A6ACCD;">    +  trigger(target, TriggerOrTypes.ADD, key, value);</span></span>
<span class="line"><span style="color:#A6ACCD;">    +} else if (hasChanged(oldValue, value)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    + // 修改</span></span>
<span class="line"><span style="color:#A6ACCD;">    +  trigger(target, TriggerOrTypes.SET, key, value, oldValue);</span></span>
<span class="line"><span style="color:#A6ACCD;">    +}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    return result;</span></span>
<span class="line"><span style="color:#A6ACCD;">  };</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h3 id="effect-ts-1" tabindex="-1">effect.ts <a class="header-anchor" href="#effect-ts-1" aria-label="Permalink to &quot;effect.ts&quot;">​</a></h3><ul><li>如果这个属性没有收集过<code>effect</code>依赖则不需要继续</li><li>判断修改的对象是数组且修改的是<code>length</code>属性 <ul><li>直接修改数组<code>length</code>导致长度变更</li><li>通过<code>push</code>等操作长度变更</li></ul></li><li>收集 <code>effect</code>统一执行</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">export function trigger(target, type?, key?, newValue?, oldValue?) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  console.log(target, type, key, newValue, oldValue);</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 如果这个属性没有收集过 effect 不需要做任何操作</span></span>
<span class="line"><span style="color:#A6ACCD;">  const depsMap = targetMap.get(target);</span></span>
<span class="line"><span style="color:#A6ACCD;">  if (!depsMap) return;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">  // 将所有的effect全部暂存到一个新的集合中，最终一起执行</span></span>
<span class="line"><span style="color:#A6ACCD;">  const effects: Set&lt;Function&gt; = new Set()</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 添加 effect</span></span>
<span class="line"><span style="color:#A6ACCD;">  const add = effectsToAdd =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (effectsToAdd) {</span></span>
<span class="line"><span style="color:#A6ACCD;">      effectsToAdd.forEach(effect =&gt; effects.add(effect))</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">  // 1.判断是否修改数组的长度，修改数组的长度影响较大</span></span>
<span class="line"><span style="color:#A6ACCD;">  if (key === &#39;length&#39; &amp;&amp; isArray(target)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 如果对应的长度有依赖收集，则需要更新</span></span>
<span class="line"><span style="color:#A6ACCD;">    depsMap.forEach((dep, key) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">      console.log(depsMap, dep, key)</span></span>
<span class="line"><span style="color:#A6ACCD;">      // 如果更改的长度小于收集的索引，那么这个索引也需要触发effect重新更新（state.arr.length = 1）</span></span>
<span class="line"><span style="color:#A6ACCD;">      // 如果不是直接更改length，如push的这种，key已经是新增的下标了</span></span>
<span class="line"><span style="color:#A6ACCD;">      if (key === &#39;length&#39; || key &gt; newValue) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        add(dep)</span></span>
<span class="line"><span style="color:#A6ACCD;">      }</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">  } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 2.如果不是修改数组的长度</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (key !== undefined) {</span></span>
<span class="line"><span style="color:#A6ACCD;">      add(depsMap.get(key))</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 如果是修改数组中某一个索引</span></span>
<span class="line"><span style="color:#A6ACCD;">    switch (type) {</span></span>
<span class="line"><span style="color:#A6ACCD;">      case TriggerOrTypes.ADD:</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (isArray(target) &amp;&amp; isIntegerKey(key)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">          add(depsMap.get(&#39;length&#39;))</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        break;</span></span>
<span class="line"><span style="color:#A6ACCD;">      default:</span></span>
<span class="line"><span style="color:#A6ACCD;">        break;</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 执行所有effect</span></span>
<span class="line"><span style="color:#A6ACCD;">  effects.forEach(effect =&gt; effect())</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="ref" tabindex="-1">ref <a class="header-anchor" href="#ref" aria-label="Permalink to &quot;ref&quot;">​</a></h2><ul><li><code>ref</code> 和 <code>reactive</code> 的区别 <ul><li>reactive 内部采用 proxy</li><li>ref 内部使用的是 defineProperty</li><li>ref 是为了解决 reactive 中 proxy 无法处理基本类型</li></ul></li></ul><h3 id="ref-ts" tabindex="-1">ref.ts <a class="header-anchor" href="#ref-ts" aria-label="Permalink to &quot;ref.ts&quot;">​</a></h3><ul><li>RefImpl <ul><li>__v_isRef 标识是一个ref属性</li><li>_value getter 和setter 的中间变量</li><li>rawValue：旧值</li><li>shallow：是否是浅的</li><li>constructor: 如果是深度的，需要调用<code>convert</code>把对象变成响应式</li><li>getter：调用<code>track</code>收集依赖</li><li>setter：调用<code>trigger</code>触发更新，如果是深度的需要需要调用<code>convert</code>把对象变成响应式</li><li>getter、setter 在编译后会转换成<code>Object.defineProperty</code></li></ul></li><li>convert <ul><li>如果是对象，调用<code>reactive</code>把对象进行代理</li></ul></li><li>ObjectRefImpl <ul><li>通过 getter setter 做一个简单的代理</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">import { hasChanged, isArray, isObject } from &quot;@vue/shared&quot;;</span></span>
<span class="line"><span style="color:#A6ACCD;">import { track, trigger } from &quot;./effect&quot;;</span></span>
<span class="line"><span style="color:#A6ACCD;">import { TrackOpTypes, TriggerOrTypes } from &quot;./operators&quot;;</span></span>
<span class="line"><span style="color:#A6ACCD;">import { reactive } from &quot;./reactive&quot;;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// value 是一个普通类型或者对象</span></span>
<span class="line"><span style="color:#A6ACCD;">export function ref(value) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 将普通类型变成一个对象</span></span>
<span class="line"><span style="color:#A6ACCD;">  return createRef(value);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">export function shallowRef(value) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  return createRef(value, true);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const convert = (val) =&gt; (isObject(val) ? reactive(val) : val);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">class RefImpl {</span></span>
<span class="line"><span style="color:#A6ACCD;">  public _value;</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 参数的实例添加_v-isRef 表示是一个ref属性</span></span>
<span class="line"><span style="color:#A6ACCD;">  public _v_isRef = true;</span></span>
<span class="line"><span style="color:#A6ACCD;">  // 参数中前面增加修饰符 标识此属性放到了实例上</span></span>
<span class="line"><span style="color:#A6ACCD;">  constructor(public rawValue, public shallow) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 如果是深度的，需要把里面的都变成响应式（使用reactive转换）</span></span>
<span class="line"><span style="color:#A6ACCD;">    this._value = shallow ? rawValue : convert(rawValue);</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">  // 类的属性访问器(编译后会自动转成defineProperty)</span></span>
<span class="line"><span style="color:#A6ACCD;">  get value() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    track(this, TrackOpTypes.GET, &quot;value&quot;);</span></span>
<span class="line"><span style="color:#A6ACCD;">    return this._value;</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  set value(newValue) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 判断老值和新值是否有变化</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (hasChanged(newValue, this.rawValue)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">      this.rawValue = newValue;</span></span>
<span class="line"><span style="color:#A6ACCD;">      this._value = this.shallow ? newValue : convert(newValue);</span></span>
<span class="line"><span style="color:#A6ACCD;">      trigger(this, TriggerOrTypes.SET, &quot;value&quot;, newValue);</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">function createRef(rawValue, shallow: boolean = false) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  return new RefImpl(rawValue, shallow);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// toRef toRefs 只是做了一层代理</span></span>
<span class="line"><span style="color:#A6ACCD;">class ObjectRefImpl {</span></span>
<span class="line"><span style="color:#A6ACCD;">  public __v_isRef = true;</span></span>
<span class="line"><span style="color:#A6ACCD;">  constructor(public target, public key) {}</span></span>
<span class="line"><span style="color:#A6ACCD;">  get value() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return this.target[this.key];</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  set value(newValue) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    this.target[this.key] = newValue;</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 将对象的一个属性变成ref类型</span></span>
<span class="line"><span style="color:#A6ACCD;">export function toRef(target, key) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  return new ObjectRefImpl(target, key);</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// object 可能传递的是一个数组或者对象</span></span>
<span class="line"><span style="color:#A6ACCD;">export function toRefs(object) {</span></span>
<span class="line"><span style="color:#A6ACCD;">  const ret = isArray(object) ? new Array(object.length) : {};</span></span>
<span class="line"><span style="color:#A6ACCD;">  for (let key in object) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    ret[key] = toRef(object, key);</span></span>
<span class="line"><span style="color:#A6ACCD;">  }</span></span>
<span class="line"><span style="color:#A6ACCD;">  return ret;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h3 id="用例" tabindex="-1">用例 <a class="header-anchor" href="#用例" aria-label="Permalink to &quot;用例&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;script&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">	const { effect, reactive, ref } = VueReactivity</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 将普通过的类型转化成一个对象，这个对象中value 属性指向原来的值</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 如果是对象类型，value会是一个proxy对象</span></span>
<span class="line"><span style="color:#A6ACCD;">    let name = ref(&#39;well&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    let info = ref({ age: 18 })</span></span>
<span class="line"><span style="color:#A6ACCD;">    let state = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    	sex: &#39;femal&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;name&#39;, name)</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;info&#39;, info)</span></span>
<span class="line"><span style="color:#A6ACCD;">    effect(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    	app.innerHTML = name.value + info.value.age</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">    setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    	name.value = &#39;liuguowei&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    	info.value.age = 80</span></span>
<span class="line"><span style="color:#A6ACCD;">    }, 1000)</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/script&gt;</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;script&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    const { effect, reactive, ref, toRef, toRefs } = VueReactivity</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    let state = reactive({</span></span>
<span class="line"><span style="color:#A6ACCD;">        name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">        age: 18</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">    let info = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    	sex: &#39;男&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    let nameRef = toRef(state, &#39;name&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    // let stateRef = toRefs(state)</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 可以配合 toRefs 解构，如果不用toRefs解构则失去响应式</span></span>
<span class="line"><span style="color:#A6ACCD;">    let { age } = toRefs(state)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    effect(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    	app.innerHTML = nameRef.value + age.value</span></span>
<span class="line"><span style="color:#A6ACCD;">    })</span></span>
<span class="line"><span style="color:#A6ACCD;">    setTimeout(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        nameRef.value = &#39;liuguowei&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">        age.value = 80</span></span>
<span class="line"><span style="color:#A6ACCD;">    }, 1000)</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/script&gt;</span></span></code></pre></div><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;script&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    const { createApp, reactive, toRefs } = Vue</span></span>
<span class="line"><span style="color:#A6ACCD;">    const App = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    	setup() {</span></span>
<span class="line"><span style="color:#A6ACCD;">    		let state = reactive({</span></span>
<span class="line"><span style="color:#A6ACCD;">    			name: &#39;well&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    			age: 18</span></span>
<span class="line"><span style="color:#A6ACCD;">    		})</span></span>
<span class="line"><span style="color:#A6ACCD;">            return {</span></span>
<span class="line"><span style="color:#A6ACCD;">                ...toRefs(state)</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">    	}</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    createApp(App).mount(&#39;#app&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/script&gt;</span></span></code></pre></div><h2 id="es6" tabindex="-1">Es6 <a class="header-anchor" href="#es6" aria-label="Permalink to &quot;Es6&quot;">​</a></h2><h3 id="symbol" tabindex="-1">symbol <a class="header-anchor" href="#symbol" aria-label="Permalink to &quot;symbol&quot;">​</a></h3><ul><li>symbol 是唯一的</li><li>Reflect.ownKeys</li><li>Reflect.apply</li><li>Symbol.for</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">let s1 = Symbol(&#39;well&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">let s2 = Symbol(&#39;well&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">let obj = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    name: &#39;liuguowei&#39;,</span></span>
<span class="line"><span style="color:#A6ACCD;">    age: 18,</span></span>
<span class="line"><span style="color:#A6ACCD;">    [s1]: &#39;ok&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// symbol 是唯一的</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(s1 === s2) // false</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 如果一个对象的key的 symbol 的，只能使用Reflect.ownKeys 才能获取</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(Object.keys(obj)) // [ &#39;name&#39;, &#39;age&#39; ]</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(Reflect.ownKeys(obj)) // [ &#39;name&#39;, &#39;age&#39;, Symbol(well) ]</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">const fn = (a, b) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;fn&#39;, a, b)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">fn.apply = function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    console.log(&#39;apply&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;">// 调用函数本身的apply方法如何调用？</span></span>
<span class="line"><span style="color:#A6ACCD;">fn.apply() // apply</span></span>
<span class="line"><span style="color:#A6ACCD;">// 让apply方法中的this指向fn，并让apply方法执行 fn.apply(null, [1,2])</span></span>
<span class="line"><span style="color:#A6ACCD;">Function.prototype.apply.call(fn, null, [1, 2])</span></span>
<span class="line"><span style="color:#A6ACCD;">// 使用 Reflect</span></span>
<span class="line"><span style="color:#A6ACCD;">Reflect.apply(fn, null, [1, 2])</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// Symbol.for 定义取值</span></span>
<span class="line"><span style="color:#A6ACCD;">let s3 = Symbol.for(&#39;liuguowei&#39;) // 声明全新的</span></span>
<span class="line"><span style="color:#A6ACCD;">let s4 = Symbol.for(&#39;liuguowei&#39;) // 把之前声明的拿过来用</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(s3 === s4) // true</span></span></code></pre></div><h3 id="set、map、weakmap" tabindex="-1">Set、Map、WeakMap <a class="header-anchor" href="#set、map、weakmap" aria-label="Permalink to &quot;Set、Map、WeakMap&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">let set = new Set([1, 1, 2, 2, 3, 3, 4, 4])</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(set) // Set(4) { 1, 2, 3, 4 }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">let map = new Map()</span></span>
<span class="line"><span style="color:#A6ACCD;">map.set(&#39;a&#39;, 1)</span></span>
<span class="line"><span style="color:#A6ACCD;">map.set(&#39;a&#39;, 1)</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(map) // Map(1) { &#39;a&#39; =&gt; 1 }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// weakMap 弱引用，不影响垃圾回收(浏览器控制台中输入)</span></span>
<span class="line"><span style="color:#A6ACCD;">class MyTest {}</span></span>
<span class="line"><span style="color:#A6ACCD;">let my = new MyTest()</span></span>
<span class="line"><span style="color:#A6ACCD;">let weakMap = new WeakMap()</span></span>
<span class="line"><span style="color:#A6ACCD;">weakMap.set(my, 1)</span></span>
<span class="line"><span style="color:#A6ACCD;">my = null</span></span>
<span class="line"><span style="color:#A6ACCD;">// 隔一段时间后会回收</span></span>
<span class="line"><span style="color:#A6ACCD;">console.log(weakMap) // WeakMap {}</span></span></code></pre></div><h2 id="computed" tabindex="-1">computed <a class="header-anchor" href="#computed" aria-label="Permalink to &quot;computed&quot;">​</a></h2><h3 id="index-ts-1" tabindex="-1">index.ts <a class="header-anchor" href="#index-ts-1" aria-label="Permalink to &quot;index.ts&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// reactivity/src/index.ts</span></span>
<span class="line"><span style="color:#A6ACCD;">...</span></span>
<span class="line"><span style="color:#A6ACCD;">export { computed } from &#39;./computed&#39;</span></span></code></pre></div><h3 id="computed-ts" tabindex="-1">computed.ts <a class="header-anchor" href="#computed-ts" aria-label="Permalink to &quot;computed.ts&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// reactivity/src/computed.ts</span></span>
<span class="line"><span style="color:#A6ACCD;">import { isFunction } from &#39;@vue/shared&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">import { effect, track, trigger } from &#39;./effect&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">import { TrackOpTypes, TriggerOrTypes } from &#39;./operators&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">class ComputedRefImpl {</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 默认取值时不要用缓存</span></span>
<span class="line"><span style="color:#A6ACCD;">    public _dirty = true</span></span>
<span class="line"><span style="color:#A6ACCD;">    public _value</span></span>
<span class="line"><span style="color:#A6ACCD;">    public effect</span></span>
<span class="line"><span style="color:#A6ACCD;">    // ts 中默认不会挂载到this上</span></span>
<span class="line"><span style="color:#A6ACCD;">    constructor(</span></span>
<span class="line"><span style="color:#A6ACCD;">        getter,</span></span>
<span class="line"><span style="color:#A6ACCD;">        public setter</span></span>
<span class="line"><span style="color:#A6ACCD;">    ) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 计算属性默认会产生一个effect</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.effect = effect(getter, {</span></span>
<span class="line"><span style="color:#A6ACCD;">            lazy: true, // 默认不执行</span></span>
<span class="line"><span style="color:#A6ACCD;">            scheduler: () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">                // triggle 触发执行后，把_dirty置为true，再次触发get时候即可再次更新</span></span>
<span class="line"><span style="color:#A6ACCD;">                if (!this._dirty) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    this._dirty = true</span></span>
<span class="line"><span style="color:#A6ACCD;">                    // 通知依赖进行更新</span></span>
<span class="line"><span style="color:#A6ACCD;">                    trigger(this, TriggerOrTypes.SET, &#39;value&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">                }</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        })</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 计算属性也要收集依赖</span></span>
<span class="line"><span style="color:#A6ACCD;">    get value() {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 在取值的时候才执行 effect(_dirty)</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (this._dirty) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 在 effect 执行时，会将用户的返回值返回，这时候可以更新 _value</span></span>
<span class="line"><span style="color:#A6ACCD;">            this._value = this.effect()</span></span>
<span class="line"><span style="color:#A6ACCD;">            this._dirty = false</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 收集此对象的.value属性的依赖</span></span>
<span class="line"><span style="color:#A6ACCD;">        track(this, TrackOpTypes.GET, &#39;value&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">        return this._value</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    set value(newValue) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        this.setter(newValue)</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">export function computed(getterOrOptions) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let getter</span></span>
<span class="line"><span style="color:#A6ACCD;">    let setter</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    if (isFunction(getterOrOptions)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        getter = getterOrOptions</span></span>
<span class="line"><span style="color:#A6ACCD;">        setter = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            console.warn(&#39;computed value must be readonly&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">        getter = getterOrOptions.get</span></span>
<span class="line"><span style="color:#A6ACCD;">        setter = getterOrOptions.set</span></span>
<span class="line"><span style="color:#A6ACCD;">    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    return new ComputedRefImpl(getter, setter)</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h3 id="effect-ts-2" tabindex="-1">effect.ts <a class="header-anchor" href="#effect-ts-2" aria-label="Permalink to &quot;effect.ts&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">export function trigger(target, type?, key?, newValue?, oldValue?) {</span></span>
<span class="line"><span style="color:#A6ACCD;">	...</span></span>
<span class="line"><span style="color:#A6ACCD;">	// 执行所有effect</span></span>
<span class="line"><span style="color:#A6ACCD;">	- effects.forEach(effect =&gt; effect())</span></span>
<span class="line"><span style="color:#A6ACCD;">	+ effects.forEach((effect: any) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    +    if (effect.options.scheduler) {</span></span>
<span class="line"><span style="color:#A6ACCD;">    +        effect.options.scheduler(effect)</span></span>
<span class="line"><span style="color:#A6ACCD;">    +    } else {</span></span>
<span class="line"><span style="color:#A6ACCD;">    +        effect()</span></span>
<span class="line"><span style="color:#A6ACCD;">    +    }</span></span>
<span class="line"><span style="color:#A6ACCD;">    + })</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h3 id="用例-1" tabindex="-1">用例 <a class="header-anchor" href="#用例-1" aria-label="Permalink to &quot;用例&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;body&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;div id=&quot;app&quot;&gt;&lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;!-- &lt;script src=&quot;https://unpkg.com/vue@3/dist/vue.global.js&quot;&gt;&lt;/script&gt; --&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;script src=&quot;../node_modules/@vue/reactivity/dist/reactivity.global.js&quot;&gt;&lt;/script&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;script&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        const { ref, computed, effect } = VueReactivity</span></span>
<span class="line"><span style="color:#A6ACCD;">        // const { ref, computed } = Vue</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">        const age = ref(18)</span></span>
<span class="line"><span style="color:#A6ACCD;">        const myAge = computed(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            console.log(&#39;getter 执行了&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">            return age.value + 10</span></span>
<span class="line"><span style="color:#A6ACCD;">        })</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">        /* console.log(myAge.value) // 28</span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(myAge.value) // 28</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">        // // 更新age，myAge 不会立刻重新计算，当执行myAge.value才会重新计算</span></span>
<span class="line"><span style="color:#A6ACCD;">        age.value = 100</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">        console.log(myAge.value) // 110 */</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">        // 当修改了age.value 时，我们也希望触发下面的effect执行</span></span>
<span class="line"><span style="color:#A6ACCD;">        effect(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 此 effect 没有使用 age，所以需要收集其依赖的值</span></span>
<span class="line"><span style="color:#A6ACCD;">            console.log(myAge.value)</span></span>
<span class="line"><span style="color:#A6ACCD;">        })</span></span>
<span class="line"><span style="color:#A6ACCD;">        age.value = 500</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;/script&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/body&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/html&gt;</span></span></code></pre></div><h2 id="render" tabindex="-1">render <a class="header-anchor" href="#render" aria-label="Permalink to &quot;render&quot;">​</a></h2><h3 id="compositionapi-的好处" tabindex="-1">compositionApi 的好处 <a class="header-anchor" href="#compositionapi-的好处" aria-label="Permalink to &quot;compositionApi 的好处&quot;">​</a></h3><ul><li>相比optionsApi，由于以前是通过<code>this</code>、<code>data</code>、<code>methods</code>声明，难以做到<code>tree-sharking</code></li><li>可以把data、computed、watch、methods 在一个文件里自由组合（hooks）</li></ul><h3 id="模板使用" tabindex="-1">模板使用 <a class="header-anchor" href="#模板使用" aria-label="Permalink to &quot;模板使用&quot;">​</a></h3><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;body&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;div id=&quot;app&quot;&gt;&lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;script src=&quot;https://unpkg.com/vue@3/dist/vue.global.js&quot;&gt;&lt;/script&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;script&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        let { createApp, h, reactive } = Vue</span></span>
<span class="line"><span style="color:#A6ACCD;">        let App = {</span></span>
<span class="line"><span style="color:#A6ACCD;">            props: {</span></span>
<span class="line"><span style="color:#A6ACCD;">                name: String</span></span>
<span class="line"><span style="color:#A6ACCD;">            },</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 替换 beforeCreate created，只运行一次</span></span>
<span class="line"><span style="color:#A6ACCD;">            setup(props, context) {</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">                console.log(props.name) // well</span></span>
<span class="line"><span style="color:#A6ACCD;">                console.log(context) // {attrs:xxx, emit:xxx, xxx}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">                const state = reactive({ count: 1 })</span></span>
<span class="line"><span style="color:#A6ACCD;">                const fn = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    state.count++</span></span>
<span class="line"><span style="color:#A6ACCD;">                }</span></span>
<span class="line"><span style="color:#A6ACCD;">                </span></span>
<span class="line"><span style="color:#A6ACCD;">                // render 函数是一个effect，数据变化 render 函数会重新执行</span></span>
<span class="line"><span style="color:#A6ACCD;">                return (proxy) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    console.log(proxy.name) // well</span></span>
<span class="line"><span style="color:#A6ACCD;">                    return h(&#39;div&#39;, { style: { color: &#39;red&#39; }, onclick: fn }, \`hello world \${state.count}\`)</span></span>
<span class="line"><span style="color:#A6ACCD;">                }</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        createApp(App, { name: &#39;well&#39; }).mount(&#39;#app&#39;)</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;/script&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/body&gt;</span></span></code></pre></div>`,77),c=[o];function r(i,C,A,y,D,d){return a(),n("div",null,c)}const g=s(t,[["render",r]]);export{f as __pageData,g as default};
