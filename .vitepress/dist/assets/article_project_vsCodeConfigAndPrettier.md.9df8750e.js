import{_ as s,o as n,c as a,U as e}from"./chunks/framework.9adb0f96.js";const y=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"article/project/vsCodeConfigAndPrettier.md","filePath":"article/project/vsCodeConfigAndPrettier.md","lastUpdated":1714468888000}'),l={name:"article/project/vsCodeConfigAndPrettier.md"},t=e(`<h2 id="vscode-setting-json" tabindex="-1">.vsCode/setting.json <a class="header-anchor" href="#vscode-setting-json" aria-label="Permalink to &quot;.vsCode/setting.json&quot;">​</a></h2><ul><li>作用 用于覆盖 VS Code 的默认全局配置，或者添加新的设置来制定特定项目的配置。</li><li>参考简单配置 通过 <code>&quot;editor.formatOnSave&quot;: true</code> 开启保存时自动格式化<br> 通过 <code>&quot;[javascript]&quot;: { &quot;editor.defaultFormatter&quot;: &quot;esbenp.prettier-vscode&quot; } ,对于 JavaScript，使用 Prettier 作为默认格式化器 </code></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">{  </span></span>
<span class="line"><span style="color:#A6ACCD;">    &quot;editor.fontSize&quot;: 14,  </span></span>
<span class="line"><span style="color:#A6ACCD;">    &quot;editor.formatOnSave&quot;: true, // 开启保存时自动格式化  </span></span>
<span class="line"><span style="color:#A6ACCD;">  </span></span>
<span class="line"><span style="color:#A6ACCD;">    // 对于 JavaScript，使用 Prettier 作为默认格式化器  </span></span>
<span class="line"><span style="color:#A6ACCD;">    &quot;[javascript]&quot;: {  </span></span>
<span class="line"><span style="color:#A6ACCD;">        &quot;editor.defaultFormatter&quot;: &quot;esbenp.prettier-vscode&quot;,  </span></span>
<span class="line"><span style="color:#A6ACCD;">    },  </span></span>
<span class="line"><span style="color:#A6ACCD;">  </span></span>
<span class="line"><span style="color:#A6ACCD;">    // 对于 JSON，您可以选择使用 VS Code 自带的格式化器，或者如果您希望使用 Prettier，也可以更改这里的设置  </span></span>
<span class="line"><span style="color:#A6ACCD;">    &quot;[json]&quot;: {  </span></span>
<span class="line"><span style="color:#A6ACCD;">        &quot;editor.defaultFormatter&quot;: &quot;esbenp.prettier-vscode&quot; // 如果希望 JSON 也使用 Prettier 格式化  </span></span>
<span class="line"><span style="color:#A6ACCD;">    },  </span></span>
<span class="line"><span style="color:#A6ACCD;">  </span></span>
<span class="line"><span style="color:#A6ACCD;">    &quot;security.workspace.trust.untrustedFiles&quot;: &quot;open&quot;,  </span></span>
<span class="line"><span style="color:#A6ACCD;">  </span></span>
<span class="line"><span style="color:#A6ACCD;">    // 这里是保存时触发的代码操作，比如 ESLint 的修复等  </span></span>
<span class="line"><span style="color:#A6ACCD;">    &quot;editor.codeActionsOnSave&quot;: {  </span></span>
<span class="line"><span style="color:#A6ACCD;">        // 例如，使用 ESLint 修复可修复的问题  </span></span>
<span class="line"><span style="color:#A6ACCD;">        &quot;source.fixAll.eslint&quot;: true  </span></span>
<span class="line"><span style="color:#A6ACCD;">    },  </span></span>
<span class="line"><span style="color:#A6ACCD;">  </span></span>
<span class="line"><span style="color:#A6ACCD;">    // ESLint 相关的设置（如果安装了 ESLint 插件）  </span></span>
<span class="line"><span style="color:#A6ACCD;">    &quot;eslint.codeActionsOnSave.rules&quot;: null, // 如果需要，可以指定某些规则在保存时执行  </span></span>
<span class="line"><span style="color:#A6ACCD;">    &quot;eslint.execArgv&quot;: null, // ESLint 执行的参数，通常不需要设置  </span></span>
<span class="line"><span style="color:#A6ACCD;">  </span></span>
<span class="line"><span style="color:#A6ACCD;">    &quot;compile-hero.ignore&quot;: &quot;&quot; // 其他插件的配置  </span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div><h2 id="prettier" tabindex="-1">Prettier <a class="header-anchor" href="#prettier" aria-label="Permalink to &quot;Prettier&quot;">​</a></h2><ul><li><p>作用 通过其达成格式化代码作用，这里需要注意的是：通过vscode 插件安装和 npm 安装的使用场景不一致。</p></li><li><p>通过 vscode 插件安装 如果编译器配置开启了自动化格式代码&amp;使用prettier作用默认格式化器，则会在编译器进行保存的时候，prettier 插件会自动读取prettierrc.js 中的配置进行代码格式化。</p></li><li><p>通过 npm 安装 通过npm 包的方式，只能通过命令行进行使用。通过此方式使用的主要原因是通过git hooks 强制提交代码前格式化代码，保证代码仓库的代码风格统一。</p></li><li><p>安装</p></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">npm install prettier --save-dev</span></span></code></pre></div><ul><li>配置</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// .prettierrc.js</span></span>
<span class="line"><span style="color:#A6ACCD;">module.exports = {</span></span>
<span class="line"><span style="color:#A6ACCD;">    semi: false, //强制在语句末尾不使用分号。</span></span>
<span class="line"><span style="color:#A6ACCD;">    trailingComma: &#39;none&#39;, //不允许在多行结构的最后一个元素或属性后添加逗号。</span></span>
<span class="line"><span style="color:#A6ACCD;">    singleQuote: true, //使用单引号而不是双引号来定义字符串。</span></span>
<span class="line"><span style="color:#A6ACCD;">    printWidth: 120, //指定每行代码的最大字符宽度，超过这个宽度的代码将被换行</span></span>
<span class="line"><span style="color:#A6ACCD;">    tabWidth: 4, //指定一个制表符（Tab）等于多少个空格。</span></span>
<span class="line"><span style="color:#A6ACCD;">    singleQuote: true, //使用单引号</span></span>
<span class="line"><span style="color:#A6ACCD;">    arrowParens: &#39;avoid&#39;, //  箭头函数括号</span></span>
<span class="line"><span style="color:#A6ACCD;">    endOfLine: &#39;auto&#39;, // 结尾换行自动</span></span>
<span class="line"><span style="color:#A6ACCD;">    jsxBracketSameLine: true</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// .prettierignore</span></span>
<span class="line"><span style="color:#A6ACCD;">node_modules</span></span>
<span class="line"><span style="color:#A6ACCD;">dist</span></span>
<span class="line"><span style="color:#A6ACCD;">package.json</span></span></code></pre></div><ul><li>拓展 结合 husky + eslint 进行进一步规范化配置</li></ul>`,9),p=[t];function o(i,r,c,C,A,u){return n(),a("div",null,p)}const D=s(l,[["render",o]]);export{y as __pageData,D as default};
