# HTML5 播放器原理

> 级别：中级→高级

按本书四层推进：

- **入门使用**：会用 `video` / `audio` 标签的常用属性、事件与 API（`play` / `pause` / `currentTime` / `playbackRate`）驱动一个原生播放器；
- **进阶**：理解 MSE 的"拉流 → 转封装 → `appendBuffer` → SourceBuffer → 解码渲染"完整数据流，以及 Buffer 高低水位管理；
- **实战**：掌握播放器分层架构与首帧秒开、seek、倍速等性能优化套路，会对接 hls.js / mpegts.js 这类库；
- **最小实现掌握原理**：到 `code/frontend/16-media` 打开 `mse-hls.html`，用 `appendBuffer` 把分片数据喂给 `<video>`，亲手理清"JS 喂数据、浏览器解封装解码"的边界。

上一章解决了"数据长什么样"，本章解决"数据怎么在浏览器里流畅地播出来"。理解 video/audio 标签的能力边界、MSE 的数据流、播放器分层架构以及 Buffer 管理逻辑，是手写高性能播放器的核心，也是 hls.js/flv.js 这些知名开源库的设计蓝本。

## 一、video / audio 标签基础

### 1. 基本属性

```html
<video
  id="player"
  src="movie.mp4"
  controls
  preload="auto"
  muted
  loop
  playsinline
  autoplay
></video>
```

| 属性 | 作用 |
| --- | --- |
| `controls` | 显示原生控制条 |
| `autoplay` | 自动播放（**需 muted 才能在不拦截下生效**） |
| `preload` | `none`/`metadata`/`auto`，控制预加载程度 |
| `playsinline` | iOS Safari 内联播放，避免默认全屏 |
| `muted loop poster` | 静音、循环、封面图 |

### 2. 关键事件与状态机

| 事件 | 触发时机 | 常见使用 |
| --- | --- | --- |
| `loadedmetadata` | 元数据就绪 | 读取 duration 初始化 UI |
| `canplay` | 可以开始播放 | 关闭 loading 态 |
| `playing` | 已开始播放 | 曝光埋点 |
| `waiting` | 等待缓冲（卡顿） | 展示 loading |
| `stalled` | 数据流中断 | 播放器兜底重试 |
| `error` | 出错 | 调 `video.error` 定位 |
| `timeupdate` | 播放位置更新 | 进度条、埋点 |
| `ended` | 播放结束 | 回收资源 |

### 3. 常用属性与 API

```js
const v = document.querySelector('#player');

v.currentTime = 120;       // 跳转/sec 到 2:00
console.log(v.duration);   // 总时长
console.log(v.buffered.end(v.buffered.length - 1)); // 已缓冲到哪
console.log(v.readyState); // 0-4 表示就绪程度
console.log(v.networkState);
v.playbackRate = 2;        // 倍速播放
v.volume = 0.5;
```

> 关键理解：`buffered`（已缓冲区间）、`seekable`（可跳转区间）、`played`（已播放区间）三个对象是播放器 Buffer 管理的最直接观测接口。

## 二、MSE 播放流程

### 1. 为什么原生播放器不够

原生 `<video src="流URL">` 只能播放浏览器自带解码能力的"整段文件"，无法做到：动态增益/减益 Buffer、多码率切换、协议流（HLS/FLV 分片）。MSE（Media Source Extensions）把"数据喂给解码器"的主动权交给 JS。

### 2. MSE 完整数据流

```text
网络(分片文件) ──fetch/XMLHttpRequest──▶ JS(转封装成ISOBMFF/FLV) ──appendBuffer──▶ SourceBuffer
                                                                                    │
播放器(control)◀──currentTime/buffered── video 标签 ◀──媒体元素轨道(解码渲染) ─────┘
```

### 3. 最小可运行的分片推送示例

```html
<video id="mse" controls></video>
<script>
  const video = document.getElementById('mse');
  if (!('MediaSource' in window)) { alert('浏览器不支持 MSE'); }

  const ms = new MediaSource();
  video.src = URL.createObjectURL(ms);
  const codec = 'video/mp4; codecs="avc1.42E01E,mp4a.40.2"';
  let sb = null, idx = 0;

  ms.addEventListener('sourceopen', () => {
    sb = ms.addSourceBuffer(codec);
    loadNext();                       // 开始拉取第一个分片
  });

  async function loadNext() {
    const resp = await fetch(`seg-${idx}.m4s`);  // fMP4 分片
    const buf = await resp.arrayBuffer();
    // 超帧：如果缓冲已满，先 trim 再 append，避免内存膨胀
    while (video.buffered.length && video.buffered.end(0) - video.currentTime > 30) {
      sb.remove(0, video.buffered.start(0));
    }
    sb.appendBuffer(BigSlice(buf));   // BigSlice 实现：把 buffer 切分/模式拆分 fmp4
    idx++;
    if (idx < 10) loadNext();
  }
</script>
```

### 4. `appendBuffer` 职责

浏览器只负责"解封装+解码+渲染"，**转封装必须由 JS 完成**。即网络上是 TS 分片的 HLS，JS 需要把 TS 转换成 MSE 认识的 fMP4（fragmented MP4），这就是 **mux.js / hls.js 内部工具的职责**。

## 三、播放器分层架构

### 1. 经典五层模型

| 层 | 职责 | 对应开源组件 |
| --- | --- | --- |
| 音视频流控制层 | 协议解析（HLS/FLV/DASH） | hls.js、flv.js |
| 解封装层 | TS→ES / FLV→fMP4 | mux.js、mediaserver 转封装 |
| 缓冲/引擎层 | SourceBuffer 增删、水位水位 | 自研 |
| 解码渲染层 | video 标签 / WebAudio | 浏览器内置 |
| UI 层 | 控制条、进度条、皮肤 | DPlayer、video.js、自研 UI |

### 2. 面向对象核心类（伪码）

```ts
type Demuxer = { parse(data: Uint8Array): {frames: any[]; timestamp: number} };
type Muxer   = { appendTo(ssb: SourceBuffer, parts: any[]): void };

class Player {
  private ms: MediaSource;
  private sb: SourceBuffer;
  private demuxer: Demuxer;
  private muxer: Muxer;

  load(url: string) { /* 创建 MSE、拉流转封装 */ }
  append(data) { this.muxer.appendTo(this.sb, this.demuxer.parse(data)); }
  seek(ms: number) { /* 清 Buffer，从最近 I 帧重建 */ }
  destroy() { URL.revokeObjectURL(this.msURL); this.sb = null; }
}
```

### 3. Buffer 管理（核心难点）

Buffer 水位管理要同时满足"不断流"与"不爆内存"：

- **下限（低水位阈值）**：当前播放位置 + 前瞻缓冲 < 某个值（如 30s）时就继续拉流。
- **上限（高水位阈值）**：buffered 末尾 - currentTime > 某上限（如 60s）时停止请求或 remove 掉已播完部分。
- **Trim 时机**：`sb.remove(buffered.start(0), currentTime - 前瞻)`，同时要考虑**不能 remove 掉正处于解码队列的关键帧**。

```js
function guardBuffer(video, sb, {lo=20, hi=60}) {
  const end = video.buffered.length ? video.buffered.end(0) : 0;
  const ahead = end - video.currentTime;      // 离缓冲尾部还差多少
  const need = ahead < lo;                     // 低于低水位，需要继续拉
  const high = ahead > hi;                     // 高于高水位，可以暂停
  // 已播完的早期数据及时移除，防止内存持续增长
  if (video.buffered.start(0) < video.currentTime - 5)
    sb.remove(video.buffered.start(0), video.currentTime - 5);
  return { need, high };
}
```

## 四、常见播放器与协议库对比

| 库 | 定位 | 支持的流 | 特点 | 框架集 |
| --- | --- | --- | --- | --- |
| hls.js | HLS 解析 | HTTP-HLS (m3u8+TS/fMP4) | 开源免费、ABR 能力强 | 支持 MSE 的浏览器 |
| flv.js | FLV 解析 | HTTP-FLV / WebSocket-FLV | 低延迟直播主力 | MSE + fMP4 转封装 |
| mpegts.js | 更好版 flv.js | FLV/MPEG-TS | flv.js 的热门继任者 | 同上 |
| video.js | 播放器壳 | 插件扩展 HLS 等 | 老牌 UI 生态 | 全套 UI |
| DPlayer / Plyr / xgPlayer | UI 播放器 | 内部可接 hls.js 等 | 方便二次开发 | Vue/React 友好 |
| dash.js | MPEG-DASH | DASH (mpd) | 标准自适应 | MSE |

> 选型建议：**点播 H5 用 hls.js（或直接原生 MP4）；直播低延迟用 mpegts.js/flv.js 拉 HTTP-FLV；需要高级 UI 和插件体系选 video.js。**

## 五、倍速 / 首帧 / seek 优化

### 1. 倍速播放优化

- 原生 `video.playbackRate` 支持 0.25~4，超出 4 很多浏览器不支持。
- **主播频道常用 1.5/2x**，但倍速下音频变调，可启用 `preservesPitch = true`（默认即是）保证音调不变。

```js
video.playbackRate = 2;
video.preservesPitch = true; // 保证变调
```

- 高倍速追求"语音识别级清晰"时，可路由到 WebAudio 自行变速（timeStretch），属于高级玩法。

### 2. 首帧 / 秒开优化

首帧优化目标是**从点击到看到第一帧画面尽量 <1s**：

| 手段 | 说明 |
| --- | --- |
| moov 前置 | 转码 `-movflags +faststart`，让 MP4 可流式播放 |
| 首屏 `preload` 与 `rules=low-latency` | 提前拉头部几帧 |
| 关键帧对齐 | GOP 设小，hls 用 `#EXT-X-TARGETDURATION` 小分片 |
| 分片预热 | 首帧前优先请求 `seg0/seg1` |
| 封面图 `poster` 兜底 | 卡顿时先展示 poster 而非黑屏 |

```html
<!-- React 里对首屏视频提前预热 -->
<link rel="preload" as="video" href="/intro.mp4" type="video/mp4">
```

### 3. seek（拖进度条）优化

跳到 `t` 秒时：

1. 先 `video.currentTime = t`，会从最近的 I 帧解码。
2. 若不理想，播放器主动：清掉 SourceBuffer → 从目标时间点所在分片重新 appendBuffer → 再 seek。
3. 精度权衡：**先给用户视觉反馈到"搜到帧"，后台再精细对齐**，避免白屏/长时间卡顿。

```js
function seekTo(video, ms, sb) {
  // 方案 A：交给浏览器（快但可能画质糊、偶发卡）
  video.currentTime = ms;
  // 方案 B：完全重建（慢但精确）—— 先清 buffer
  sb.remove(0, video.buffered.end(0));
  // 播放器随后从目标分片重新 append
}
```

### 4. WeakModel（弱模型/轻量状态）思想

在做大播放器时，常把**与播放强相关的轻量准实时状态模型**（当前测速带宽、缓冲水位、当前码率档位）单独维护，不直接耦合到 React/Vue 的重渲染中——这被称为 WeakModel/轻状态。因为视频流是高频更新的（每秒多次 timeupdate），直接进响应式状态会触发大量无谓渲染，导致掉帧。

```ts
// 轻量模型：普通 TS 对象，不走响应式，仅必要时手动通知 UI
type WeakModel = {
  bandwidth: number;
  bitrate: number;
  bufferAhead: number;
  lastSeek: number;
};
const model: WeakModel = { bandwidth: 0, bitrate: 0, bufferAhead: 0, lastSeek: 0 };

video.addEventListener('timeupdate', () => {
  model.bufferAhead = (video.buffered.end?.(0) ?? 0) - video.currentTime;
  // 只在变化超过阈值时才触发一次 UI 更新，避免高频重渲染
  if (model.bufferAhead % 5 < 0.1) emitNowPlaying(); // 语义示意
});
```

这种做法保证"画面实时、UI 稳定"，是专业播放器性能的基本功。

## 最小实现：用 MSE 把分片喂给 video

到 `code/frontend/16-media` 打开 `mse-hls.html`，它把本章的核心概念落成可运行代码：新建 `MediaSource`、`URL.createObjectURL(ms)` 绑定到 `<video>`，等 `sourceopen` 后 `addSourceBuffer('video/mp4; codecs="avc1.42E01E"')`，再逐段 `fetch` 分片并 `appendBuffer`。

- `appendBuffer` 就是"JS 主动喂数据"的那一刻——浏览器收到后自行解封装、解码、渲染，对应本章 MSE 数据流图。
- Buffer 高低水位、`buffered` / `seekable` 判断都可在此基础之上叠加，理解"不断流"与"不爆内存"的取舍起点就在这里。

原理一句话：MSE 把"数据从哪来、何时喂、喂多少"的控制权交给 JS，浏览器退化为纯解码渲染引擎——分片流播放与手写播放器的地基全在这条线上。若浏览器不支持 MSE，demo 会显示友好提示，页面文字始终可见。

## 面试衔接

本节对应 `90-附录-面试体系` 的「音视频」阶段（125-128）：MSE 原理与为何能解决浏览器不支持 HLS/FLV、播放器 Buffer 高低水位管理、hls.js/flv.js 的转封装职责、首帧秒开与 seek 优化、WeakModel 轻状态思想都要能讲清。做真题自测后，进入下一节 `03-WebRTC实时音视频`。