# WebRTC 实时音视频

> 级别：高级

按本书四层推进：

- **入门使用**：用 `getUserMedia` 打开摄像头 / 麦克风，把本地音视频 `srcObject` 回显到一个 `<video>`；
- **进阶**：理解 `RTCPeerConnection`、SDP 与信令、ICE / STUN / TURN 打洞以及编解码协商的完整链路；
- **实战**：掌握 SFU / MCU / Mesh 架构选型、Simulcast / SVC 与弱网降级策略，会接入 Agora / LiveKit 等 SDK；
- **最小实现掌握原理**：到 `code/frontend/16-media` 打开 `media-capture.html`（采集并回显本地音视频，体会 Track 与 Stream 的分层）与 `audio-viz.html`（把声音实时画成频谱，看音频轨如何被分析）。

WebRTC 与"点播/直播拉流"完全不同，它是**浏览器原生 P2P 实时通信**协议栈，目标是毫秒级双向音视频与任意数据通道。本章深入 WebRTC 核心 API、SDP 信令、ICE 打洞、媒体协商与弱网应对，最后对比主流商业化 SDK，适合做音视频通话产品的进阶工程师。

## 一、WebRTC 三大核心 API

### 1. getUserMedia：采集

`getUserMedia` 负责从本地设备（摄像头/麦克风/屏幕）获取**媒体轨道（MediaStreamTrack）**。

```js
const stream = await navigator.mediaDevices.getUserMedia({
  video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
});
const cam = stream.getVideoTracks()[0];
cam.applyConstraints({ width: 1920 }); // 播放中动态改分辨率
```

**重要概念：MediaStream / MediaStreamTrack**。一个 Stream 含多个 Track（音/视频），Track 可在不同 PeerConnection 间 `replaceTrack`。`getDisplayMedia` 用于屏幕共享（天然带高 DPR）。

### 2. RTCPeerConnection：建立点对点链路

```js
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'turn:turn.example.com:3478', username: 'u', credential: 'p' },
  ],
});

// 本地轨道入链
stream.getTracks().forEach(t => pc.addTrack(t, stream));

// 远端轨道到达
pc.ontrack = ev => remoteVideo.srcObject = ev.streams[0];

// 候选（ICE Candidate）交换
pc.onicecandidate = e => sendSignaling({ type: 'candidate', candidate: e.candidate });
```

### 3. RTCDataChannel：非音视频的任意数据通道

可传输文本/文件/游戏状态等，走 P2P、延迟极低、可选可靠/不可靠两种模式。

```js
const dc = pc.createDataChannel('chat', { ordered: false, maxRetransmits: 0 });
dc.binaryType = 'arraybuffer';
dc.onmessage = ev => console.log('收到', ev.data);
dc.send('hello');   // P2P 直发
```

## 二、SDP 与信令

### 1. 为什么需要信令

WebRTC 的媒体链路是 **P2P 点对点**的，但**双方如何发现彼此、协商媒体参数、交换地址候**，需要一个"撮合"过程，这就是**信令（Signaling）**。WebRTC **没有规定信令协议**，可以用 WebSocket、HTTP、MQTT 等任何方式实现。

### 2. Offer/Answer 与 SDP

- **Offer**：发起方生成的媒体能力描述。`setLocalDescription(offer)` 后发给对端。
- **Answer**：对端 `setRemoteDescription(offer)` 后生成的应答。
- **SDP（Session Description Protocol）**：一段描述媒体能力、编解码、IP/端口、crypto 的文本。

```js
// 发起方
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
sendSignaling({ type: 'offer', sdp: JSON.stringify(offer) });

// 应答方接收后：
await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
const answer = await pc.createAnswer();
await pc.setLocalDescription(answer);
sendSignaling({ type: 'answer', sdp: JSON.stringify(answer) });
```

### 3. SDP 关键片段解读

```text
v=0
o=- 4294967297 2 IN IP4 0.0.0.0
m=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101
c=IN IP4 0.0.0.0
a=rtpmap:96 VP8/90000          <-- payload 96 = VP8
a=rtpmap:97 rtx/90000
a=rtpmap:98 H264/90000
a=rtpmap:101 opus/48000/2       <-- 音频 opus
a=fmtp:101 minptime=10;useinbandfec=1   <- 带内 FEC 抗丢包
a=mid:0
```

**面试高频点**：SDP 里的 `m=video`/`m=audio` 行 + `a=rtpmap` 决定协商结果；`a=fmtp` 里的 `useinbandfec`、`max-fr`、`sar` 等控制弱网与编码细节。

## 三、ICE / STUN / TURN 与 NAT 穿透

### 1. NAT 为什么是问题

公网 IP 有限，大多数主机在 NAT（网络地址转换）后面，内网 IP 对端不可直达。建立 P2P 需要双方知道对方**可被联系的公网地址**，为此需要打洞。

### 2. 三者的角色

| 组件 | 作用 | 是否需要服务器中转媒体 |
| --- | --- | --- |
| STUN | 帮你**发现**自己的公网 IP:端口 | 否，仅信令级协助 |
| TURN | 当 NAT 打不通时**中继所有媒体流量** | 是（媒体走服务器） |
| ICE | 统筹尝试候选组合并选出最优路径 | 逻辑层，不涉媒体 |

打洞流程（ICE candidate 收集）：

```text
Host candidate:   本机内网 192.168.1.5:51820       (直接连)
srflx candidate:  STUN 发现的公网 120.x.x.x:52000  (打洞)
relay candidate:  TURN 中继  turn:relay.example     (兜底，最稳但服务器压力大)
```

双方把 candidate 通过信令互相交换，ICE 按优先级尝试，选出一条**可用路径**：

```text
最佳：Host↔Host（同内网）
次之：srflx↔srflx（NAT 打洞成功，P2P）
最稳：relay↔relay（TURN 中继，无 P2P）
```

## 四、音视频编解码协商

协商结果由 Offer 里的优先级与 Answer 里的匹配决定，**协商不出共同能力就会失败**。

| 媒体 | 典型协商结果 | 场景建议 |
| --- | --- | --- |
| 视频 | VP8 / H.264 / VP9 / AV1 | 兼容性 VP8、H.264 最稳 |
| 音频 | Opus / G.711(PCMU/PCMA) | Opus 质量最佳、延迟低 |
| FEC | Opus inband FEC / RED | 抗丢包 |

WebRTC 用 `setCodecPreferences` 调整偏好：

```js
const prefer = RTCRtpSender.getCapabilities('video').codecs
  .filter(c => ['H264', 'VP8'].some(n => c.mimeType.includes(n)));
transceiver.setCodecPreferences(prefer);
```

### Simulcast（联播）与 SVC

- **Simulcast**：同时发多路不同分辨率+码率的视频流（如 360p/720p），对端按带宽选。实现"弱网自适应下降"。
- **SVC**：单流内粒度化分层（空间层+时间层），按需剥离层数。

```js
// 启用 simulcast（降级时自动切换到低层）
const ts = pc.addTransceiver('video', { direction: 'sendrecv', sendEncodings: [
  { rid: 'low',  maxBitrate: 200_000,  scaleResolutionDownBy: 4 },
  { rid: 'high', maxBitrate: 1_500_000, scaleResolutionDownBy: 1 },
]});
ts.sender.replaceTrack(stream.getVideoTracks()[0]);
```

## 五、弱网策略：拥塞控制与降级

### 1. 拥塞控制（Congestion Control）

WebRTC 有 **拥塞控制算法**（BWE，带宽估计），常见：

- **GCC（Google Congestion Control）**：基于丢包率 + 延迟梯度，动态调整发送码率，`b=AS:` 与 fmtp 共同作用。
- **REMB / TWCC**：接收方反馈（REM）。新版多用 **Transport-CC（TWCC）** 逐包的接收反馈来更精确估计。

```text
估算带宽 = f(丢包率、RTT、延迟 jitter)
网络差 → 主动降码率、降分辨率 → 尽量"卡但不掉线"
```

### 2. 抗丢包三件套

| 手段 | 原理 | 代价 |
| --- | --- | --- |
| 前向纠错 FEC | 发送冗余包，对端无需重传即可恢复 | 带宽翻倍 |
| 重传 NACK/RTX | 收到反馈后补发丢失的包 | 增加延迟 |
| 关键帧请求（PLI/FIR） | 画面黑/糊时请对端发关键帧 | 瞬时大块头 |

### 3. 弱网降级决策伪码

```js
function onQualityUpdate({bwe, lossRate, rtt}) {
  const target = pickBestBitrate(bwe);        // 由拥塞控制给出
  const layers = videoTracks[0].getSettings();
  if (lossRate > 0.15) requestKeyframe();      // 丢包严重请关键帧
  applySimulcast({ high: target });            // 切到 1 路合适码率
}
```

### 4. 监控指标

必采集：`videoStats.framesPerSecond`、`framesDecoded/framesDropped`、`inbound-rtp` 丢包率、`RTT`、`jitter`、编码码率、`googFps`（旧字段）。据此判断"分辨率低但 CPU 高"和"网络差"是两回事。

## 六、常见 SDK 与自研

### 1. 商业化/开源 SDK 对比

| 方案 | 类型 | CDN/业务绑定 | 特点 | 适用 |
| --- | --- | --- | --- | --- |
| Agora 声网 | 商业 PaaS | 有 CDN | 低延迟、跨国强 | 在线教育/会议 |
| ZEGO 即构 | 商业 PaaS | 有 CDN | 画质与 AI 能力 | 直播互动 |
| Tencent TRTC | 商业 PaaS | 腾讯云 | 与云直播打通 | 腾讯系 |
| LiveKit | 开源可私有 | 自建 | SFU 架构、中文文档好 | 自研可控 |
| 纯原生 | 自研 | 自建 SFU | 学习成本高、完全可控 | 极客团队 |

### 2. 架构模式：SFU vs MCU vs Mesh

| 架构 | 简介 | 带宽 | 服务端压力 | 典型规模 |
| --- | --- | --- | --- | --- |
| Mesh (P2P) | 每人向所有人发流 | O(N²) | 小 | ≤4 人 |
| SFU | 服务端转发各流不回混 | O(N) | 中 | 几十~上百人 |
| MCU | 服务端混屏再下发 | 最低 | 高 | 直播+录制 |

大多数音视频会议用 **SFU**（media 不落盘、秒级处理、天然支持 Simulcast 分包转发）。

## 最小实现：采集并回显本地音视频

到 `code/frontend/16-media` 打开 `media-capture.html`，它演示了 WebRTC 链路的第一环——媒体采集。点击按钮后 `getUserMedia({ video, audio })` 拿到一个 `MediaStream`，直接赋给 `<video>.srcObject` 就能实时回显，无需任何服务器。

- `MediaStream` 里可包含多条 `MediaStreamTrack`（一条视频轨 + 一条麦克风轨），它们后续可 `addTrack` / `replaceTrack` 进 `RTCPeerConnection`——这就是 WebRTC 媒体链路的起点。
- demo 对"权限拒绝"与"浏览器不支持"都做了友好降级提示，页面文字始终可见，方便你在不同浏览器实测体验差异。

原理一句话：WebRTC 采集 = `getUserMedia` 拿到 Stream 里的 Track，回显 = 把 Stream 赋给 `srcObject`；再往下走 Track 才会被 `addTrack` 进 P2P 链路完成协商。若浏览器不支持 `getUserMedia`，demo 会显示友好提示。

## 面试衔接

本节对应 `90-附录-面试体系` 的「音视频」阶段（125-128）：为什么需要信令服务器、STUN / TURN / ICE 分工、SDP 的 m-line 与 `a=rtpmap` 协商、Simulcast / SVC 弱网应用、FEC 与 NACK 取舍、SFU / MCU / Mesh 选型与弱网调优 stats 都要能讲清。做真题自测后，进入下一节 `04-直播技术方案`。