## http
```
let instance = axios.create();
instance.defaults.baseURL = 'http://127.0.0.1:8888';
instance.defaults.headers['Content-Type'] = 'multipart/form-data';
instance.defaults.transformRequest = (data, headers) => {
    const contentType = headers['Content-Type'];
    if (contentType === "application/x-www-form-urlencoded") return Qs.stringify(data);
    return data;
};
instance.interceptors.response.use(response => {
    return response.data;
});
```
## 单个文件上传
- API
  ```
  url: /upload_single
  method: POST
  params: multipart/form-data
    file:文件对象
    filename:文件名字
  return:application/json
    code:0成功 1失败,
    codeText:状态描述,
    originalFilename:文件原始名称,
    servicePath:文件服务器地址
  ```
- html
```
<div class="item">
    <h3>单一文件上传「FORM-DATA」</h3>
    <section class="upload_box" id="upload1">
        <!-- accept=".png" 限定上传文件的格式 -->
        <input type="file" class="upload_inp" accept=".png,.jpg,.jpeg">
        <div class="upload_button_box">
            <button class="upload_button select">选择文件</button>
            <button class="upload_button upload">上传到服务器</button>
        </div>
        <div class="upload_tip">只能上传 PNG/JPG/JPEG 格式图片，且大小不能超过2MB</div>
        <ul class="upload_list">
        </ul>
    </section>
</div>
```
- js
  - 通过**选择文件**按钮触发**input**的点击事件
  - 监听**input**的**change** 事件，其`files`是一个数组，取值
  - 通过 `FormData` 与 `append` 表单数据处理数据传输
```
/* 基于FORM-DATA实现文件上传 */
(function () {
    let upload = document.querySelector('#upload1'),
        upload_inp = upload.querySelector('.upload_inp'),
        upload_button_select = upload.querySelector('.upload_button.select'),
        upload_button_upload = upload.querySelector('.upload_button.upload'),
        upload_tip = upload.querySelector('.upload_tip'),
        upload_list = upload.querySelector('.upload_list');
    let _file = null;

    // 上传文件到服务器重置状态
    const changeDisable = flag => {
        if (flag) {
            upload_button_select.classList.add('disable');
            upload_button_upload.classList.add('loading');
            return;
        }
        upload_button_select.classList.remove('disable');
        upload_button_upload.classList.remove('loading');
    };
    // 点击上传
    upload_button_upload.addEventListener('click', function () {
        if (upload_button_upload.classList.contains('disable') || upload_button_upload.classList.contains('loading')) return;
        if (!_file) {
            alert('请您先选择要上传的文件~~');
            return;
        }
        changeDisable(true);
        // 把文件传递给服务器：FormData / BASE64
        let formData = new FormData();
        formData.append('file', _file);
        formData.append('filename', _file.name);
        instance.post('/upload_single', formData).then(data => {
            if (+data.code === 0) {
                alert(`文件已经上传成功~~,您可以基于 ${data.servicePath} 访问这个资源~~`);
                return;
            }
            return Promise.reject(data.codeText);
        }).catch(reason => {
            alert('文件上传失败，请您稍后再试~~');
        }).finally(() => {
            clearHandle();
            changeDisable(false);
        });
    });

    // 移除按钮的点击处理
    const clearHandle = () => {
        _file = null;
        upload_tip.style.display = 'block';
        upload_list.style.display = 'none';
        upload_list.innerHTML = ``;
    };
    upload_list.addEventListener('click', function (ev) {
        let target = ev.target;
        if (target.tagName === "EM") {
            // 点击的是移除按钮
            clearHandle();
        }
    });

    // 监听用户选择文件的操作
    upload_inp.addEventListener('change', function () {
        // 获取用户选中的文件对象
        //   + name：文件名
        //   + size：文件大小 B
        //   + type：文件的MIME类型
        let file = upload_inp.files[0];
        if (!file) return;

        // 限制文件上传的格式「方案一」
        /* if (!/(PNG|JPG|JPEG)/i.test(file.type)) {
            alert('上传的文件只能是 PNG/JPG/JPEG 格式的~~');
            return;
        } */

        // 限制文件上传的大小
        if (file.size > 2 * 1024 * 1024) {
            alert('上传的文件不能超过2MB~~');
            return;
        }

        _file = file;

        // 显示上传的文件
        upload_tip.style.display = 'none';
        upload_list.style.display = 'block';
        upload_list.innerHTML = `<li>
            <span>文件：${file.name}</span>
            <span><em>移除</em></span>
        </li>`;
    });

    // 点击选择文件按钮，触发上传文件INPUT框选择文件的行为
    upload_button_select.addEventListener('click', function () {
        if (upload_button_select.classList.contains('disable') || upload_button_select.classList.contains('loading')) return;
        upload_inp.click();
    });
})();
```

## 进度管控
- html
```
<div class="item">
    <h3>单一文件上传「进度管控」</h3>
    <section class="upload_box" id="upload4">
        <input type="file" class="upload_inp">
        <div class="upload_button_box">
            <button class="upload_button select">上传文件</button>
        </div>
        <div class="upload_progress">
            <div class="value"></div>
        </div>
    </section>
</div>
```
- js
  - 传入上传回调函数配置`onUploadProgress`
```
(function () {
    let upload = document.querySelector('#upload4'),
        upload_inp = upload.querySelector('.upload_inp'),
        upload_button_select = upload.querySelector('.upload_button.select'),
        upload_progress = upload.querySelector('.upload_progress'),
        upload_progress_value = upload_progress.querySelector('.value');

    // 验证是否处于可操作性状态
    const checkIsDisable = element => {
        let classList = element.classList;
        return classList.contains('disable') || classList.contains('loading');
    };

    upload_inp.addEventListener('change', async function () {
        let file = upload_inp.files[0],
            data;
        if (!file) return;
        upload_button_select.classList.add('loading');
        try {
            let formData = new FormData();
            formData.append('file', file);
            formData.append('filename', file.name);
            data = await instance.post('/upload_single', formData, {
                // 文件上传中的回调函数 xhr.upload.onprogress
                onUploadProgress(ev) {
                    let {
                        loaded,
                        total
                    } = ev;
                    upload_progress.style.display = 'block';
                    upload_progress_value.style.width = `${loaded/total*100}%`;
                }
            });
            if (+data.code === 0) {
                upload_progress_value.style.width = `100%`;
                await delay(300);
                alert(`恭喜您，文件上传成功，您可以基于 ${data.servicePath} 访问该文件~~`);
                return;
            }
            throw data.codeText;
        } catch (err) {
            alert('很遗憾，文件上传失败，请您稍后再试~~');
        } finally {
            upload_button_select.classList.remove('loading');
            upload_progress.style.display = 'none';
            upload_progress_value.style.width = `0%`;
        }
    });

    upload_button_select.addEventListener('click', function () {
        if (checkIsDisable(this)) return;
        upload_inp.click();
    });
})();
```

## 大文件切片上传（合并切片）
- APIS
```
// 上传切片
  url:/upload_chunk
  method:POST
  params:multipart/form-data
    file:切片数据
    filename:切片名字「文件生成的HASH_切片编号.后缀」
  return:application/json
    code:0成功 1失败,
    codeText:状态描述,
    originalFilename:文件原始名称,
    servicePath:文件服务器地址

// 合并切片
  url:/upload_merge
  method:POST
  params:application/x-www-form-urlencoded
    HASH:文件的HASH名字
    count:切片数量
  return:application/json
    code:0成功 1失败,
    codeText:状态描述,
    originalFilename:文件原始名称,
    servicePath:文件服务器地址

// 获取已经上传的切片
  url:/upload_already
  method:GET
  params:
    HASH:文件的HASH名字
  return:application/json
    code:0成功 1失败,
    codeText:状态描述,
    fileList:[...]
```
- html
```
<div class="item">
    <h3>大文件上传</h3>
    <section class="upload_box" id="upload7">
        <input type="file" class="upload_inp">
        <div class="upload_button_box">
            <button class="upload_button select">上传图片</button>
        </div>
        <div class="upload_progress">
            <div class="value"></div>
        </div>
    </section>
</div>
```
- js
  - 通过 changeBuffer 生成文件 hash
    - 通过 FleReader 的 readAsArrayBuffer 把 File 转为 ArrayBuffer
    - 通过 SparkMD5 生成文件 hash 
  - 对文件进行切片处理，max：切片长度，count：切片数量，chunks: {file, filename}：切片数组
  - 遍历 chunks, 取出每一项进行上传切片，每上传完成一个切片就调用 complete
  - complete 通过判断 index 和 count，如果所有切片都上传成功，则合并切片
```
(function () {
    let upload = document.querySelector('#upload7'),
        upload_inp = upload.querySelector('.upload_inp'),
        upload_button_select = upload.querySelector('.upload_button.select'),
        upload_progress = upload.querySelector('.upload_progress'),
        upload_progress_value = upload_progress.querySelector('.value');

    const checkIsDisable = element => {
        let classList = element.classList;
        return classList.contains('disable') || classList.contains('loading');
    };

    const changeBuffer = file => {
        return new Promise(resolve => {
            let fileReader = new FileReader();
            fileReader.readAsArrayBuffer(file);
            fileReader.onload = ev => {
                let buffer = ev.target.result,
                    spark = new SparkMD5.ArrayBuffer(),
                    HASH,
                    suffix;
                spark.append(buffer);
                HASH = spark.end();
                suffix = /\.([a-zA-Z0-9]+)$/.exec(file.name)[1];
                resolve({
                    buffer,
                    HASH,
                    suffix,
                    filename: `${HASH}.${suffix}`
                });
            };
        });
    };

    upload_inp.addEventListener('change', async function () {
        let file = upload_inp.files[0];
        if (!file) return;
        upload_button_select.classList.add('loading');
        upload_progress.style.display = 'block';

        // 获取文件的HASH
        let already = [],
            data = null,
            {
                HASH,
                suffix
            } = await changeBuffer(file);

        // 获取已经上传的切片信息
        try {
            data = await instance.get('/upload_already', {
                params: {
                    HASH
                }
            });
            if (+data.code === 0) {
                already = data.fileList;
            }
        } catch (err) {}

        // 实现文件切片处理 「固定数量 & 固定大小」
        let max = 1024 * 100,
            count = Math.ceil(file.size / max),
            index = 0,
            chunks = [];
        if (count > 100) {
            max = file.size / 100;
            count = 100;
        }
        while (index < count) {
            chunks.push({
                file: file.slice(index * max, (index + 1) * max),
                filename: `${HASH}_${index+1}.${suffix}`
            });
            index++;
        }

        // 上传成功的处理
        index = 0;
        const clear = () => {
            upload_button_select.classList.remove('loading');
            upload_progress.style.display = 'none';
            upload_progress_value.style.width = '0%';
        };
        const complate = async () => {
            // 管控进度条
            index++;
            upload_progress_value.style.width = `${index/count*100}%`;

            // 当所有切片都上传成功，我们合并切片
            if (index < count) return;
            upload_progress_value.style.width = `100%`;
            try {
                data = await instance.post('/upload_merge', {
                    HASH,
                    count
                }, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                if (+data.code === 0) {
                    alert(`恭喜您，文件上传成功，您可以基于 ${data.servicePath} 访问该文件~~`);
                    clear();
                    return;
                }
                throw data.codeText;
            } catch (err) {
                alert('切片合并失败，请您稍后再试~~');
                clear();
            }
        };

        // 把每一个切片都上传到服务器上
        chunks.forEach(chunk => {
            // 已经上传的无需在上传
            if (already.length > 0 && already.includes(chunk.filename)) {
                complate();
                return;
            }
            let fm = new FormData;
            fm.append('file', chunk.file);
            fm.append('filename', chunk.filename);
            instance.post('/upload_chunk', fm).then(data => {
                if (+data.code === 0) {
                    complate();
                    return;
                }
                return Promise.reject(data.codeText);
            }).catch(() => {
                alert('当前切片上传失败，请您稍后再试~~');
                clear();
            });
        });
    });

    upload_button_select.addEventListener('click', function () {
        if (checkIsDisable(this)) return;
        upload_inp.click();
    });
})();
```