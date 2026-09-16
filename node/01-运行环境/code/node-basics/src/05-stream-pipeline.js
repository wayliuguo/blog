// 05 对比 pipe() 与 pipeline()；演示 pipeline 出错时统一销毁整条链路
// 对应文档《Buffer 与 Stream》
// 四段演示：
//  A) pipe() 正常复制文件，并采样内存占用峰值(RSS)
//  B) pipeline() 出错演示：中间 Transform 抛错 -> pipeline 销毁全部流并抛异常
//  C) pipe() 出错对照：错误不会回传销毁上游，readStream 仍存活(destroyed=false)
//  D) pipeline() 正常多级链路：readStream -> gzip(Transform) -> writeStream

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const zlib = require('node:zlib');
const { Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');

const TMP = path.join(os.tmpdir(), 'node-basics-16');
const SRC = path.join(TMP, 'source.bin');
const DST_PIPE = path.join(TMP, 'pipe-out.bin');
const DST_PIPE_ERR = path.join(TMP, 'pipe-err-out.bin');
const DST_PL_ERR = path.join(TMP, 'pipeline-err-out.bin');
const DST_GZ = path.join(TMP, 'pipeline-gz.gz');

const SIZE = 30 * 1024 * 1024; // 30MB 临时源文件
const CHUNK = 64 * 1024;

// 采样 RSS 峰值：每隔几毫秒记录一次，返回 stop() 取峰值
function samplePeak(intervalMs = 10) {
  let peak = process.memoryUsage().rss;
  const id = setInterval(() => {
    peak = Math.max(peak, process.memoryUsage().rss);
  }, intervalMs);
  return { stop: () => { clearInterval(id); return peak; } };
}

// 生成临时源文件（不依赖仓库内任何文件）
function makeSource() {
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(SRC);
    let written = 0;
    const buf = Buffer.alloc(CHUNK, 'x');
    ws.on('error', reject);
    ws.on('finish', resolve);
    function write() {
      while (written < SIZE) {
        const ok = ws.write(buf); // 这一段在演示：背压时 write 返回 false 会暂停
        written += CHUNK;
        if (!ok) { ws.once('drain', write); return; }
      }
      ws.end();
    }
    write();
  });
}

// 一个会在第 N 块故意抛错的 Transform（用于出错演示）
function errorTransform(n) {
  let count = 0;
  return new Transform({
    transform(chunk, enc, cb) {
      count += 1;
      if (count === n) return cb(new Error(`Transform 第 ${n} 块故意出错`));
      cb(null, chunk);
    },
  });
}

(async () => {
  await fs.promises.mkdir(TMP, { recursive: true });
  await makeSource();
  console.log(`已生成临时源文件 ${SIZE / 1024 / 1024}MB @ ${TMP}\n`);

  // A) pipe() 正常复制 + 采样峰值
  console.log('=== A) pipe() 正常复制（采样 RSS 峰值）===');
  {
    const peak = samplePeak();
    await new Promise((resolve, reject) => {
      const rs = fs.createReadStream(SRC);
      const ws = fs.createWriteStream(DST_PIPE);
      rs.on('error', reject);
      ws.on('error', reject);
      ws.on('finish', resolve);
      rs.pipe(ws); // 这一段在演示：pipe 直接串起读写流
    });
    const peakRss = peak.stop();
    const ok = (await fs.promises.stat(DST_PIPE)).size === SIZE;
    console.log(`pipe() 复制${ok ? '成功' : '失败'}，RSS 峰值 ≈ ${(peakRss / 1024 / 1024).toFixed(1)} MB\n`);
  }

  // B) pipeline() 出错：验证整条链路被销毁（含上游 readStream.destroyed = true）
  console.log('=== B) pipeline() 出错：中间 Transform 抛错 ===');
  {
    const rsB = fs.createReadStream(SRC);
    const trB = errorTransform(2);
    const wsB = fs.createWriteStream(DST_PL_ERR);
    try {
      await pipeline(rsB, trB, wsB); // 这一段在演示：pipeline 出错会抛异常
      console.log('pipeline 未抛错（异常）');
    } catch (err) {
      console.log(`pipeline 捕获异常: ${err.message}`);
    }
    console.log(`pipeline 后 上游 rsB.destroyed = ${rsB.destroyed}（应为 true：整条链路被统一销毁）\n`);
  }

  // C) pipe() 出错对照：错误默认不会回传销毁上游
  console.log('=== C) pipe() 出错对照：错误不回传销毁上游 ===');
  {
    const rsC = fs.createReadStream(SRC);
    const trC = errorTransform(2);
    const wsC = fs.createWriteStream(DST_PIPE_ERR);
    rsC.on('error', () => {});
    wsC.on('error', () => {});
    rsC.pipe(trC).pipe(wsC); // 这一段在演示：pipe 出错不会自动销毁上游
    await new Promise((resolve) => {
      trC.on('error', (e) => {
        console.log(`pipe 捕获到错误: ${e.message}`);
        console.log(`pipe 后 上游 rsC.destroyed = ${rsC.destroyed}（false：pipe 不自动销毁上游，需手动处理）`);
        resolve();
      });
      wsC.on('finish', resolve);
    });
    console.log('');
  }

  // D) pipeline() 正常多级链路：read -> gzip -> write
  console.log('=== D) pipeline() 正常多级链路：read -> gzip -> write ===');
  {
    await pipeline(
      fs.createReadStream(SRC),
      zlib.createGzip(), // 这一段在演示：gzip 作为 Transform 串进多级链路
      fs.createWriteStream(DST_GZ),
    );
    const sz = (await fs.promises.stat(DST_GZ)).size;
    console.log(`pipeline(gzip) 完成，压缩后 ≈ ${(sz / 1024 / 1024).toFixed(2)} MB\n`);
  }

  // 清理临时目录，不污染仓库与系统
  await fs.promises.rm(TMP, { recursive: true, force: true });
  console.log(`已清理临时目录: ${TMP}`);
  process.exit(0);
})();
