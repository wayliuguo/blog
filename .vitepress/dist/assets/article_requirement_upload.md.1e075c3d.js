import{_ as s,o as n,c as a,U as l}from"./chunks/framework.9adb0f96.js";const D=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"article/requirement/upload.md","filePath":"article/requirement/upload.md","lastUpdated":1693827608000}'),p={name:"article/requirement/upload.md"},e=l(`<h2 id="http" tabindex="-1">http <a class="header-anchor" href="#http" aria-label="Permalink to &quot;http&quot;">​</a></h2><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">let instance = axios.create();</span></span>
<span class="line"><span style="color:#A6ACCD;">instance.defaults.baseURL = &#39;http://127.0.0.1:8888&#39;;</span></span>
<span class="line"><span style="color:#A6ACCD;">instance.defaults.headers[&#39;Content-Type&#39;] = &#39;multipart/form-data&#39;;</span></span>
<span class="line"><span style="color:#A6ACCD;">instance.defaults.transformRequest = (data, headers) =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    const contentType = headers[&#39;Content-Type&#39;];</span></span>
<span class="line"><span style="color:#A6ACCD;">    if (contentType === &quot;application/x-www-form-urlencoded&quot;) return Qs.stringify(data);</span></span>
<span class="line"><span style="color:#A6ACCD;">    return data;</span></span>
<span class="line"><span style="color:#A6ACCD;">};</span></span>
<span class="line"><span style="color:#A6ACCD;">instance.interceptors.response.use(response =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">    return response.data;</span></span>
<span class="line"><span style="color:#A6ACCD;">});</span></span></code></pre></div><h2 id="单个文件上传" tabindex="-1">单个文件上传 <a class="header-anchor" href="#单个文件上传" aria-label="Permalink to &quot;单个文件上传&quot;">​</a></h2><ul><li>API<div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">url: /upload_single</span></span>
<span class="line"><span style="color:#A6ACCD;">method: POST</span></span>
<span class="line"><span style="color:#A6ACCD;">params: multipart/form-data</span></span>
<span class="line"><span style="color:#A6ACCD;">  file:文件对象</span></span>
<span class="line"><span style="color:#A6ACCD;">  filename:文件名字</span></span>
<span class="line"><span style="color:#A6ACCD;">return:application/json</span></span>
<span class="line"><span style="color:#A6ACCD;">  code:0成功 1失败,</span></span>
<span class="line"><span style="color:#A6ACCD;">  codeText:状态描述,</span></span>
<span class="line"><span style="color:#A6ACCD;">  originalFilename:文件原始名称,</span></span>
<span class="line"><span style="color:#A6ACCD;">  servicePath:文件服务器地址</span></span></code></pre></div></li><li>html</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;div class=&quot;item&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;h3&gt;单一文件上传「FORM-DATA」&lt;/h3&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;section class=&quot;upload_box&quot; id=&quot;upload1&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;!-- accept=&quot;.png&quot; 限定上传文件的格式 --&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;input type=&quot;file&quot; class=&quot;upload_inp&quot; accept=&quot;.png,.jpg,.jpeg&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;div class=&quot;upload_button_box&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;button class=&quot;upload_button select&quot;&gt;选择文件&lt;/button&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;button class=&quot;upload_button upload&quot;&gt;上传到服务器&lt;/button&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;div class=&quot;upload_tip&quot;&gt;只能上传 PNG/JPG/JPEG 格式图片，且大小不能超过2MB&lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;ul class=&quot;upload_list&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;/ul&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;/section&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/div&gt;</span></span></code></pre></div><ul><li>js <ul><li>通过<strong>选择文件</strong>按钮触发<strong>input</strong>的点击事件</li><li>监听<strong>input</strong>的<strong>change</strong> 事件，其<code>files</code>是一个数组，取值</li><li>通过 <code>FormData</code> 与 <code>append</code> 表单数据处理数据传输</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">/* 基于FORM-DATA实现文件上传 */</span></span>
<span class="line"><span style="color:#A6ACCD;">(function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let upload = document.querySelector(&#39;#upload1&#39;),</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_inp = upload.querySelector(&#39;.upload_inp&#39;),</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_button_select = upload.querySelector(&#39;.upload_button.select&#39;),</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_button_upload = upload.querySelector(&#39;.upload_button.upload&#39;),</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_tip = upload.querySelector(&#39;.upload_tip&#39;),</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_list = upload.querySelector(&#39;.upload_list&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;">    let _file = null;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    // 上传文件到服务器重置状态</span></span>
<span class="line"><span style="color:#A6ACCD;">    const changeDisable = flag =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (flag) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            upload_button_select.classList.add(&#39;disable&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;">            upload_button_upload.classList.add(&#39;loading&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;">            return;</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_button_select.classList.remove(&#39;disable&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_button_upload.classList.remove(&#39;loading&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;">    };</span></span>
<span class="line"><span style="color:#A6ACCD;">    // 点击上传</span></span>
<span class="line"><span style="color:#A6ACCD;">    upload_button_upload.addEventListener(&#39;click&#39;, function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (upload_button_upload.classList.contains(&#39;disable&#39;) || upload_button_upload.classList.contains(&#39;loading&#39;)) return;</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (!_file) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            alert(&#39;请您先选择要上传的文件~~&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;">            return;</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        changeDisable(true);</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 把文件传递给服务器：FormData / BASE64</span></span>
<span class="line"><span style="color:#A6ACCD;">        let formData = new FormData();</span></span>
<span class="line"><span style="color:#A6ACCD;">        formData.append(&#39;file&#39;, _file);</span></span>
<span class="line"><span style="color:#A6ACCD;">        formData.append(&#39;filename&#39;, _file.name);</span></span>
<span class="line"><span style="color:#A6ACCD;">        instance.post(&#39;/upload_single&#39;, formData).then(data =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (+data.code === 0) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                alert(\`文件已经上传成功~~,您可以基于 \${data.servicePath} 访问这个资源~~\`);</span></span>
<span class="line"><span style="color:#A6ACCD;">                return;</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">            return Promise.reject(data.codeText);</span></span>
<span class="line"><span style="color:#A6ACCD;">        }).catch(reason =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            alert(&#39;文件上传失败，请您稍后再试~~&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;">        }).finally(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            clearHandle();</span></span>
<span class="line"><span style="color:#A6ACCD;">            changeDisable(false);</span></span>
<span class="line"><span style="color:#A6ACCD;">        });</span></span>
<span class="line"><span style="color:#A6ACCD;">    });</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    // 移除按钮的点击处理</span></span>
<span class="line"><span style="color:#A6ACCD;">    const clearHandle = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        _file = null;</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_tip.style.display = &#39;block&#39;;</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_list.style.display = &#39;none&#39;;</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_list.innerHTML = \`\`;</span></span>
<span class="line"><span style="color:#A6ACCD;">    };</span></span>
<span class="line"><span style="color:#A6ACCD;">    upload_list.addEventListener(&#39;click&#39;, function (ev) {</span></span>
<span class="line"><span style="color:#A6ACCD;">        let target = ev.target;</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (target.tagName === &quot;EM&quot;) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 点击的是移除按钮</span></span>
<span class="line"><span style="color:#A6ACCD;">            clearHandle();</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    });</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    // 监听用户选择文件的操作</span></span>
<span class="line"><span style="color:#A6ACCD;">    upload_inp.addEventListener(&#39;change&#39;, function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">        // 获取用户选中的文件对象</span></span>
<span class="line"><span style="color:#A6ACCD;">        //   + name：文件名</span></span>
<span class="line"><span style="color:#A6ACCD;">        //   + size：文件大小 B</span></span>
<span class="line"><span style="color:#A6ACCD;">        //   + type：文件的MIME类型</span></span>
<span class="line"><span style="color:#A6ACCD;">        let file = upload_inp.files[0];</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (!file) return;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">        // 限制文件上传的格式「方案一」</span></span>
<span class="line"><span style="color:#A6ACCD;">        /* if (!/(PNG|JPG|JPEG)/i.test(file.type)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            alert(&#39;上传的文件只能是 PNG/JPG/JPEG 格式的~~&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;">            return;</span></span>
<span class="line"><span style="color:#A6ACCD;">        } */</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">        // 限制文件上传的大小</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (file.size &gt; 2 * 1024 * 1024) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            alert(&#39;上传的文件不能超过2MB~~&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;">            return;</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">        _file = file;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">        // 显示上传的文件</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_tip.style.display = &#39;none&#39;;</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_list.style.display = &#39;block&#39;;</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_list.innerHTML = \`&lt;li&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;span&gt;文件：\${file.name}&lt;/span&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;span&gt;&lt;em&gt;移除&lt;/em&gt;&lt;/span&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;/li&gt;\`;</span></span>
<span class="line"><span style="color:#A6ACCD;">    });</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    // 点击选择文件按钮，触发上传文件INPUT框选择文件的行为</span></span>
<span class="line"><span style="color:#A6ACCD;">    upload_button_select.addEventListener(&#39;click&#39;, function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (upload_button_select.classList.contains(&#39;disable&#39;) || upload_button_select.classList.contains(&#39;loading&#39;)) return;</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_inp.click();</span></span>
<span class="line"><span style="color:#A6ACCD;">    });</span></span>
<span class="line"><span style="color:#A6ACCD;">})();</span></span></code></pre></div><h2 id="进度管控" tabindex="-1">进度管控 <a class="header-anchor" href="#进度管控" aria-label="Permalink to &quot;进度管控&quot;">​</a></h2><ul><li>html</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;div class=&quot;item&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;h3&gt;单一文件上传「进度管控」&lt;/h3&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;section class=&quot;upload_box&quot; id=&quot;upload4&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;input type=&quot;file&quot; class=&quot;upload_inp&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;div class=&quot;upload_button_box&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;button class=&quot;upload_button select&quot;&gt;上传文件&lt;/button&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;div class=&quot;upload_progress&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;div class=&quot;value&quot;&gt;&lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;/section&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/div&gt;</span></span></code></pre></div><ul><li>js <ul><li>传入上传回调函数配置<code>onUploadProgress</code></li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">(function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let upload = document.querySelector(&#39;#upload4&#39;),</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_inp = upload.querySelector(&#39;.upload_inp&#39;),</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_button_select = upload.querySelector(&#39;.upload_button.select&#39;),</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_progress = upload.querySelector(&#39;.upload_progress&#39;),</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_progress_value = upload_progress.querySelector(&#39;.value&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    // 验证是否处于可操作性状态</span></span>
<span class="line"><span style="color:#A6ACCD;">    const checkIsDisable = element =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        let classList = element.classList;</span></span>
<span class="line"><span style="color:#A6ACCD;">        return classList.contains(&#39;disable&#39;) || classList.contains(&#39;loading&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;">    };</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    upload_inp.addEventListener(&#39;change&#39;, async function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">        let file = upload_inp.files[0],</span></span>
<span class="line"><span style="color:#A6ACCD;">            data;</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (!file) return;</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_button_select.classList.add(&#39;loading&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;">        try {</span></span>
<span class="line"><span style="color:#A6ACCD;">            let formData = new FormData();</span></span>
<span class="line"><span style="color:#A6ACCD;">            formData.append(&#39;file&#39;, file);</span></span>
<span class="line"><span style="color:#A6ACCD;">            formData.append(&#39;filename&#39;, file.name);</span></span>
<span class="line"><span style="color:#A6ACCD;">            data = await instance.post(&#39;/upload_single&#39;, formData, {</span></span>
<span class="line"><span style="color:#A6ACCD;">                // 文件上传中的回调函数 xhr.upload.onprogress</span></span>
<span class="line"><span style="color:#A6ACCD;">                onUploadProgress(ev) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    let {</span></span>
<span class="line"><span style="color:#A6ACCD;">                        loaded,</span></span>
<span class="line"><span style="color:#A6ACCD;">                        total</span></span>
<span class="line"><span style="color:#A6ACCD;">                    } = ev;</span></span>
<span class="line"><span style="color:#A6ACCD;">                    upload_progress.style.display = &#39;block&#39;;</span></span>
<span class="line"><span style="color:#A6ACCD;">                    upload_progress_value.style.width = \`\${loaded/total*100}%\`;</span></span>
<span class="line"><span style="color:#A6ACCD;">                }</span></span>
<span class="line"><span style="color:#A6ACCD;">            });</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (+data.code === 0) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                upload_progress_value.style.width = \`100%\`;</span></span>
<span class="line"><span style="color:#A6ACCD;">                await delay(300);</span></span>
<span class="line"><span style="color:#A6ACCD;">                alert(\`恭喜您，文件上传成功，您可以基于 \${data.servicePath} 访问该文件~~\`);</span></span>
<span class="line"><span style="color:#A6ACCD;">                return;</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">            throw data.codeText;</span></span>
<span class="line"><span style="color:#A6ACCD;">        } catch (err) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            alert(&#39;很遗憾，文件上传失败，请您稍后再试~~&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;">        } finally {</span></span>
<span class="line"><span style="color:#A6ACCD;">            upload_button_select.classList.remove(&#39;loading&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;">            upload_progress.style.display = &#39;none&#39;;</span></span>
<span class="line"><span style="color:#A6ACCD;">            upload_progress_value.style.width = \`0%\`;</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">    });</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    upload_button_select.addEventListener(&#39;click&#39;, function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (checkIsDisable(this)) return;</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_inp.click();</span></span>
<span class="line"><span style="color:#A6ACCD;">    });</span></span>
<span class="line"><span style="color:#A6ACCD;">})();</span></span></code></pre></div><h2 id="大文件切片上传-合并切片" tabindex="-1">大文件切片上传（合并切片） <a class="header-anchor" href="#大文件切片上传-合并切片" aria-label="Permalink to &quot;大文件切片上传（合并切片）&quot;">​</a></h2><ul><li>APIS</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">// 上传切片</span></span>
<span class="line"><span style="color:#A6ACCD;">  url:/upload_chunk</span></span>
<span class="line"><span style="color:#A6ACCD;">  method:POST</span></span>
<span class="line"><span style="color:#A6ACCD;">  params:multipart/form-data</span></span>
<span class="line"><span style="color:#A6ACCD;">    file:切片数据</span></span>
<span class="line"><span style="color:#A6ACCD;">    filename:切片名字「文件生成的HASH_切片编号.后缀」</span></span>
<span class="line"><span style="color:#A6ACCD;">  return:application/json</span></span>
<span class="line"><span style="color:#A6ACCD;">    code:0成功 1失败,</span></span>
<span class="line"><span style="color:#A6ACCD;">    codeText:状态描述,</span></span>
<span class="line"><span style="color:#A6ACCD;">    originalFilename:文件原始名称,</span></span>
<span class="line"><span style="color:#A6ACCD;">    servicePath:文件服务器地址</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 合并切片</span></span>
<span class="line"><span style="color:#A6ACCD;">  url:/upload_merge</span></span>
<span class="line"><span style="color:#A6ACCD;">  method:POST</span></span>
<span class="line"><span style="color:#A6ACCD;">  params:application/x-www-form-urlencoded</span></span>
<span class="line"><span style="color:#A6ACCD;">    HASH:文件的HASH名字</span></span>
<span class="line"><span style="color:#A6ACCD;">    count:切片数量</span></span>
<span class="line"><span style="color:#A6ACCD;">  return:application/json</span></span>
<span class="line"><span style="color:#A6ACCD;">    code:0成功 1失败,</span></span>
<span class="line"><span style="color:#A6ACCD;">    codeText:状态描述,</span></span>
<span class="line"><span style="color:#A6ACCD;">    originalFilename:文件原始名称,</span></span>
<span class="line"><span style="color:#A6ACCD;">    servicePath:文件服务器地址</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">// 获取已经上传的切片</span></span>
<span class="line"><span style="color:#A6ACCD;">  url:/upload_already</span></span>
<span class="line"><span style="color:#A6ACCD;">  method:GET</span></span>
<span class="line"><span style="color:#A6ACCD;">  params:</span></span>
<span class="line"><span style="color:#A6ACCD;">    HASH:文件的HASH名字</span></span>
<span class="line"><span style="color:#A6ACCD;">  return:application/json</span></span>
<span class="line"><span style="color:#A6ACCD;">    code:0成功 1失败,</span></span>
<span class="line"><span style="color:#A6ACCD;">    codeText:状态描述,</span></span>
<span class="line"><span style="color:#A6ACCD;">    fileList:[...]</span></span></code></pre></div><ul><li>html</li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">&lt;div class=&quot;item&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;h3&gt;大文件上传&lt;/h3&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;section class=&quot;upload_box&quot; id=&quot;upload7&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;input type=&quot;file&quot; class=&quot;upload_inp&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;div class=&quot;upload_button_box&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;button class=&quot;upload_button select&quot;&gt;上传图片&lt;/button&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;div class=&quot;upload_progress&quot;&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">            &lt;div class=&quot;value&quot;&gt;&lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">        &lt;/div&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">    &lt;/section&gt;</span></span>
<span class="line"><span style="color:#A6ACCD;">&lt;/div&gt;</span></span></code></pre></div><ul><li>js <ul><li>通过 changeBuffer 生成文件 hash <ul><li>通过 FleReader 的 readAsArrayBuffer 把 File 转为 ArrayBuffer</li><li>通过 SparkMD5 生成文件 hash</li></ul></li><li>对文件进行切片处理，max：切片长度，count：切片数量，chunks: {file, filename}：切片数组</li><li>遍历 chunks, 取出每一项进行上传切片，每上传完成一个切片就调用 complete</li><li>complete 通过判断 index 和 count，如果所有切片都上传成功，则合并切片</li></ul></li></ul><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki material-theme-palenight"><code><span class="line"><span style="color:#A6ACCD;">(function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">    let upload = document.querySelector(&#39;#upload7&#39;),</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_inp = upload.querySelector(&#39;.upload_inp&#39;),</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_button_select = upload.querySelector(&#39;.upload_button.select&#39;),</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_progress = upload.querySelector(&#39;.upload_progress&#39;),</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_progress_value = upload_progress.querySelector(&#39;.value&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    const checkIsDisable = element =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        let classList = element.classList;</span></span>
<span class="line"><span style="color:#A6ACCD;">        return classList.contains(&#39;disable&#39;) || classList.contains(&#39;loading&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;">    };</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    const changeBuffer = file =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">        return new Promise(resolve =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            let fileReader = new FileReader();</span></span>
<span class="line"><span style="color:#A6ACCD;">            fileReader.readAsArrayBuffer(file);</span></span>
<span class="line"><span style="color:#A6ACCD;">            fileReader.onload = ev =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">                let buffer = ev.target.result,</span></span>
<span class="line"><span style="color:#A6ACCD;">                    spark = new SparkMD5.ArrayBuffer(),</span></span>
<span class="line"><span style="color:#A6ACCD;">                    HASH,</span></span>
<span class="line"><span style="color:#A6ACCD;">                    suffix;</span></span>
<span class="line"><span style="color:#A6ACCD;">                spark.append(buffer);</span></span>
<span class="line"><span style="color:#A6ACCD;">                HASH = spark.end();</span></span>
<span class="line"><span style="color:#A6ACCD;">                suffix = /\\.([a-zA-Z0-9]+)$/.exec(file.name)[1];</span></span>
<span class="line"><span style="color:#A6ACCD;">                resolve({</span></span>
<span class="line"><span style="color:#A6ACCD;">                    buffer,</span></span>
<span class="line"><span style="color:#A6ACCD;">                    HASH,</span></span>
<span class="line"><span style="color:#A6ACCD;">                    suffix,</span></span>
<span class="line"><span style="color:#A6ACCD;">                    filename: \`\${HASH}.\${suffix}\`</span></span>
<span class="line"><span style="color:#A6ACCD;">                });</span></span>
<span class="line"><span style="color:#A6ACCD;">            };</span></span>
<span class="line"><span style="color:#A6ACCD;">        });</span></span>
<span class="line"><span style="color:#A6ACCD;">    };</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    upload_inp.addEventListener(&#39;change&#39;, async function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">        let file = upload_inp.files[0];</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (!file) return;</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_button_select.classList.add(&#39;loading&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_progress.style.display = &#39;block&#39;;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">        // 获取文件的HASH</span></span>
<span class="line"><span style="color:#A6ACCD;">        let already = [],</span></span>
<span class="line"><span style="color:#A6ACCD;">            data = null,</span></span>
<span class="line"><span style="color:#A6ACCD;">            {</span></span>
<span class="line"><span style="color:#A6ACCD;">                HASH,</span></span>
<span class="line"><span style="color:#A6ACCD;">                suffix</span></span>
<span class="line"><span style="color:#A6ACCD;">            } = await changeBuffer(file);</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">        // 获取已经上传的切片信息</span></span>
<span class="line"><span style="color:#A6ACCD;">        try {</span></span>
<span class="line"><span style="color:#A6ACCD;">            data = await instance.get(&#39;/upload_already&#39;, {</span></span>
<span class="line"><span style="color:#A6ACCD;">                params: {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    HASH</span></span>
<span class="line"><span style="color:#A6ACCD;">                }</span></span>
<span class="line"><span style="color:#A6ACCD;">            });</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (+data.code === 0) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                already = data.fileList;</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        } catch (err) {}</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">        // 实现文件切片处理 「固定数量 &amp; 固定大小」</span></span>
<span class="line"><span style="color:#A6ACCD;">        let max = 1024 * 100,</span></span>
<span class="line"><span style="color:#A6ACCD;">            count = Math.ceil(file.size / max),</span></span>
<span class="line"><span style="color:#A6ACCD;">            index = 0,</span></span>
<span class="line"><span style="color:#A6ACCD;">            chunks = [];</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (count &gt; 100) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            max = file.size / 100;</span></span>
<span class="line"><span style="color:#A6ACCD;">            count = 100;</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;">        while (index &lt; count) {</span></span>
<span class="line"><span style="color:#A6ACCD;">            chunks.push({</span></span>
<span class="line"><span style="color:#A6ACCD;">                file: file.slice(index * max, (index + 1) * max),</span></span>
<span class="line"><span style="color:#A6ACCD;">                filename: \`\${HASH}_\${index+1}.\${suffix}\`</span></span>
<span class="line"><span style="color:#A6ACCD;">            });</span></span>
<span class="line"><span style="color:#A6ACCD;">            index++;</span></span>
<span class="line"><span style="color:#A6ACCD;">        }</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">        // 上传成功的处理</span></span>
<span class="line"><span style="color:#A6ACCD;">        index = 0;</span></span>
<span class="line"><span style="color:#A6ACCD;">        const clear = () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            upload_button_select.classList.remove(&#39;loading&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;">            upload_progress.style.display = &#39;none&#39;;</span></span>
<span class="line"><span style="color:#A6ACCD;">            upload_progress_value.style.width = &#39;0%&#39;;</span></span>
<span class="line"><span style="color:#A6ACCD;">        };</span></span>
<span class="line"><span style="color:#A6ACCD;">        const complate = async () =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 管控进度条</span></span>
<span class="line"><span style="color:#A6ACCD;">            index++;</span></span>
<span class="line"><span style="color:#A6ACCD;">            upload_progress_value.style.width = \`\${index/count*100}%\`;</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">            // 当所有切片都上传成功，我们合并切片</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (index &lt; count) return;</span></span>
<span class="line"><span style="color:#A6ACCD;">            upload_progress_value.style.width = \`100%\`;</span></span>
<span class="line"><span style="color:#A6ACCD;">            try {</span></span>
<span class="line"><span style="color:#A6ACCD;">                data = await instance.post(&#39;/upload_merge&#39;, {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    HASH,</span></span>
<span class="line"><span style="color:#A6ACCD;">                    count</span></span>
<span class="line"><span style="color:#A6ACCD;">                }, {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    headers: {</span></span>
<span class="line"><span style="color:#A6ACCD;">                        &#39;Content-Type&#39;: &#39;application/x-www-form-urlencoded&#39;</span></span>
<span class="line"><span style="color:#A6ACCD;">                    }</span></span>
<span class="line"><span style="color:#A6ACCD;">                });</span></span>
<span class="line"><span style="color:#A6ACCD;">                if (+data.code === 0) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    alert(\`恭喜您，文件上传成功，您可以基于 \${data.servicePath} 访问该文件~~\`);</span></span>
<span class="line"><span style="color:#A6ACCD;">                    clear();</span></span>
<span class="line"><span style="color:#A6ACCD;">                    return;</span></span>
<span class="line"><span style="color:#A6ACCD;">                }</span></span>
<span class="line"><span style="color:#A6ACCD;">                throw data.codeText;</span></span>
<span class="line"><span style="color:#A6ACCD;">            } catch (err) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                alert(&#39;切片合并失败，请您稍后再试~~&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;">                clear();</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">        };</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">        // 把每一个切片都上传到服务器上</span></span>
<span class="line"><span style="color:#A6ACCD;">        chunks.forEach(chunk =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">            // 已经上传的无需在上传</span></span>
<span class="line"><span style="color:#A6ACCD;">            if (already.length &gt; 0 &amp;&amp; already.includes(chunk.filename)) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                complate();</span></span>
<span class="line"><span style="color:#A6ACCD;">                return;</span></span>
<span class="line"><span style="color:#A6ACCD;">            }</span></span>
<span class="line"><span style="color:#A6ACCD;">            let fm = new FormData;</span></span>
<span class="line"><span style="color:#A6ACCD;">            fm.append(&#39;file&#39;, chunk.file);</span></span>
<span class="line"><span style="color:#A6ACCD;">            fm.append(&#39;filename&#39;, chunk.filename);</span></span>
<span class="line"><span style="color:#A6ACCD;">            instance.post(&#39;/upload_chunk&#39;, fm).then(data =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">                if (+data.code === 0) {</span></span>
<span class="line"><span style="color:#A6ACCD;">                    complate();</span></span>
<span class="line"><span style="color:#A6ACCD;">                    return;</span></span>
<span class="line"><span style="color:#A6ACCD;">                }</span></span>
<span class="line"><span style="color:#A6ACCD;">                return Promise.reject(data.codeText);</span></span>
<span class="line"><span style="color:#A6ACCD;">            }).catch(() =&gt; {</span></span>
<span class="line"><span style="color:#A6ACCD;">                alert(&#39;当前切片上传失败，请您稍后再试~~&#39;);</span></span>
<span class="line"><span style="color:#A6ACCD;">                clear();</span></span>
<span class="line"><span style="color:#A6ACCD;">            });</span></span>
<span class="line"><span style="color:#A6ACCD;">        });</span></span>
<span class="line"><span style="color:#A6ACCD;">    });</span></span>
<span class="line"><span style="color:#A6ACCD;"></span></span>
<span class="line"><span style="color:#A6ACCD;">    upload_button_select.addEventListener(&#39;click&#39;, function () {</span></span>
<span class="line"><span style="color:#A6ACCD;">        if (checkIsDisable(this)) return;</span></span>
<span class="line"><span style="color:#A6ACCD;">        upload_inp.click();</span></span>
<span class="line"><span style="color:#A6ACCD;">    });</span></span>
<span class="line"><span style="color:#A6ACCD;">})();</span></span></code></pre></div>`,19),o=[e];function t(c,i,A,C,r,y){return n(),a("div",null,o)}const d=s(p,[["render",t]]);export{D as __pageData,d as default};
