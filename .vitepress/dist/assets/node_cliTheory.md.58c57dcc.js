import{_ as s,o as n,c as a,U as e}from"./chunks/framework.9adb0f96.js";const l="/blog/assets/image-20231210152249462.d3861765.png",v=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"node/cliTheory.md","filePath":"node/cliTheory.md","lastUpdated":1702193793000}'),o={name:"node/cliTheory.md"},p=e(`<h2 id="解密-vue-cli-的执行过程" tabindex="-1">解密 vue-cli 的执行过程 <a class="header-anchor" href="#解密-vue-cli-的执行过程" aria-label="Permalink to &quot;解密 vue-cli 的执行过程&quot;">​</a></h2><p>在使用vue-cli 的时候，当我们输入<code>vue create xxx</code> 的时候，到底发生了什么呢？</p><ol><li><p>为什么全局安装<code>@vue/cli</code> 后会添加的命令为 <code>vue</code>?</p><ol><li><p>通过查看<code>@vue/cli</code> 下的 <code>package.json</code>文件</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&quot;bin&quot;: {</span></span>
<span class="line"><span style="color:#A6ACCD;">    &quot;vue&quot;: &quot;bin/vue.js&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">}</span></span></code></pre></div></li><li><p>package.json 中 bin 属性的作用</p><ol><li>指定一个名为 <code>vue</code> 的命令，其入口文件位于 <code>bin/vue.js</code></li><li>当你全局安装该包后，可以直接通过在终端中属性<code>vue</code>来运行相应的命令</li></ol></li></ol></li><li><p>全局安装 <code>@vue/cli</code>时发生了什么？</p><ol><li><p><code>npm</code> 会把对应的包下载到node_modules 目录下</p></li><li><p>解析包中<code>package.json</code> 中 <code>bin</code>的配置，配置一个对应命令<code>vue</code>的软链接，所以我们会在C:\\Program Files\\nodejs\\node_modules 下有一个 vue.cmd 文件，此文件识别到vue命令，执行<code>bin</code>目录中配置的js文件</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">@ECHO off</span></span>
<span class="line"><span style="color:#A6ACCD;">GOTO start</span></span>
<span class="line"><span style="color:#A6ACCD;">:find_dp0</span></span>
<span class="line"><span style="color:#A6ACCD;">SET dp0=%~dp0</span></span>
<span class="line"><span style="color:#A6ACCD;">EXIT /b</span></span>
<span class="line"><span style="color:#A6ACCD;">:start</span></span>
<span class="line"><span style="color:#A6ACCD;">SETLOCAL</span></span>
<span class="line"><span style="color:#A6ACCD;">CALL :find_dp0</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">IF EXIST &quot;%dp0%\\node.exe&quot; (</span></span>
<span class="line"><span style="color:#A6ACCD;">  SET &quot;_prog=%dp0%\\node.exe&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">) ELSE (</span></span>
<span class="line"><span style="color:#A6ACCD;">  SET &quot;_prog=node&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">  SET PATHEXT=%PATHEXT:;.JS;=;%</span></span>
<span class="line"><span style="color:#A6ACCD;">)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">endLocal &amp; goto #_undefined_# 2&gt;NUL || title %COMSPEC% &amp; &quot;%_prog%&quot;  &quot;%dp0%\\node_modules\\@vue\\cli\\bin\\vue.js&quot; %*</span></span></code></pre></div></li></ol></li><li><p>执行 <code>vue</code> 命令时发生了什么？为什么<code>vue</code>指向一个<code>js</code>文件，我们可以直接通过<code>vue</code>命令去执行它？</p><ol><li><p>从操作系统的角度来看</p><ol><li><p>当我们在命令中输入<code>vue</code>中的时候，操作系统会尝试根据环境变量中的路径来查找可执行文件。在安装 Node.js 和 Vue CLI 时，相关的可执行文件被添加到系统的环境变量中（通常是 PATH 变量）</p></li><li><p>Node.js 在系统中的环境变量路径查看</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// cmd</span></span>
<span class="line"><span style="color:#A6ACCD;">echo %PATH%</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">C:\\Users\\10855\\AppData\\Roaming\\nvm;C:\\Program Files\\nodejs</span></span></code></pre></div></li><li><p>打开 Node.js 环境变量路径（C:\\Program Files\\nodejs）</p><ol><li><p>文件目录</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">- node_modules (目录)</span></span>
<span class="line"><span style="color:#A6ACCD;">	- @vue</span></span>
<span class="line"><span style="color:#A6ACCD;">		- cli</span></span>
<span class="line"><span style="color:#A6ACCD;">			- bin</span></span>
<span class="line"><span style="color:#A6ACCD;">				- vue.js</span></span>
<span class="line"><span style="color:#A6ACCD;">- vue (文件)</span></span>
<span class="line"><span style="color:#A6ACCD;">- vue.cmd (文件)</span></span></code></pre></div><p>我们在全局安装的时候，npm会在node_modules下载包，并添加软链接(vue/vue.cmd)</p></li><li><p>vue/vue.cmd 文件内容与作用</p><p>其是一个shell 脚本，会执行当前目录路径下/node_modules/@vue/cli/bin/vue.js</p><ul><li>vue 文件代码</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">#!/bin/sh</span></span>
<span class="line"><span style="color:#A6ACCD;">basedir=$(dirname &quot;$(echo &quot;$0&quot; | sed -e &#39;s,\\\\,/,g&#39;)&quot;)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">case \`uname\` in</span></span>
<span class="line"><span style="color:#A6ACCD;">    *CYGWIN*|*MINGW*|*MSYS*) basedir=\`cygpath -w &quot;$basedir&quot;\`;;</span></span>
<span class="line"><span style="color:#A6ACCD;">esac</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">if [ -x &quot;$basedir/node&quot; ]; then</span></span>
<span class="line"><span style="color:#A6ACCD;">  exec &quot;$basedir/node&quot;  &quot;$basedir/node_modules/@vue/cli/bin/vue.js&quot; &quot;$@&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">else </span></span>
<span class="line"><span style="color:#A6ACCD;">  exec node  &quot;$basedir/node_modules/@vue/cli/bin/vue.js&quot; &quot;$@&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">fi</span></span></code></pre></div><ul><li>vue.cmd</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">@ECHO off</span></span>
<span class="line"><span style="color:#A6ACCD;">GOTO start</span></span>
<span class="line"><span style="color:#A6ACCD;">:find_dp0</span></span>
<span class="line"><span style="color:#A6ACCD;">SET dp0=%~dp0</span></span>
<span class="line"><span style="color:#A6ACCD;">EXIT /b</span></span>
<span class="line"><span style="color:#A6ACCD;">:start</span></span>
<span class="line"><span style="color:#A6ACCD;">SETLOCAL</span></span>
<span class="line"><span style="color:#A6ACCD;">CALL :find_dp0</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">IF EXIST &quot;%dp0%\\node.exe&quot; (</span></span>
<span class="line"><span style="color:#A6ACCD;">  SET &quot;_prog=%dp0%\\node.exe&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">) ELSE (</span></span>
<span class="line"><span style="color:#A6ACCD;">  SET &quot;_prog=node&quot;</span></span>
<span class="line"><span style="color:#A6ACCD;">  SET PATHEXT=%PATHEXT:;.JS;=;%</span></span>
<span class="line"><span style="color:#A6ACCD;">)</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">endLocal &amp; goto #_undefined_# 2&gt;NUL || title %COMSPEC% &amp; &quot;%_prog%&quot;  &quot;%dp0%\\node_modules\\@vue\\cli\\bin\\vue.js&quot; %*</span></span></code></pre></div></li></ol></li></ol></li><li><p>从执行的角度</p><ol><li>操作系统会通过which vue/ where vue 的路径找到并执行文件</li></ol><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">C:\\Users\\10855&gt;where vue</span></span>
<span class="line"><span style="color:#A6ACCD;">C:\\Program Files\\nodejs\\vue</span></span>
<span class="line"><span style="color:#A6ACCD;">C:\\Program Files\\nodejs\\vue.cmd</span></span></code></pre></div><ol start="2"><li><p>这个文件作为软链接，会去执行对应的js 文件</p></li><li><p>对应的js文件</p><p>这段代码指定 node 解析器来执行此段代码</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">#!/usr/bin/env node</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">...</span></span></code></pre></div></li></ol></li></ol></li></ol><p><img src="`+l+'" alt="image-20231210152249462"></p><h2 id="从应用角度如何开发一个脚手架" tabindex="-1">从应用角度如何开发一个脚手架 <a class="header-anchor" href="#从应用角度如何开发一个脚手架" aria-label="Permalink to &quot;从应用角度如何开发一个脚手架&quot;">​</a></h2><ol><li>开发<code>npm</code>项目，该项目中应包含一个<code>bin/vue.js </code>文件，并将这个项目发布到<code>npm</code></li><li>将 <code>npm</code> 项目安装到 <code>node</code> 的 <code>node_modules</code></li><li>将 <code>node</code> 的 <code>bin</code> 目录下配置 <code>vue</code> 软链接执行 <code>node_modules/@vue/cli/bin/vue.js </code></li></ol>',6),c=[p];function t(i,d,C,r,u,A){return n(),a("div",null,c)}const D=s(o,[["render",t]]);export{v as __pageData,D as default};
