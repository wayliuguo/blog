// 08 对比两种复制大文件的方式，看内存占用差异
// ① readFile + writeFile：一次性把整文件读进内存
// ② createReadStream().pipe()：分块流式读写，内存峰值稳定
const fs = require('node:fs');
const path = require('node:path');

const SIZE = 200 * 1024 * 1024; // 200MB
const CHUNK = 1024 * 1024;       // 1MB 一块
const tmp = path.join(__dirname, 'tmp-big.bin');
const out1 = path.join(__dirname, 'tmp-out-readfile.bin');
const out2 = path.join(__dirname, 'tmp-out-stream.bin');

// 自己生成大文件：用 Buffer.alloc 分块写，避免一次性 alloc 200MB 把内存瞬间顶满
function genFile() {
  return new Promise((resolve, reject) => {
    const w = fs.createWriteStream(tmp);
    let written = 0;
    function step() {
      if (written >= SIZE) {
        w.end(resolve); // 写完回调
        return;
      }
      const buf = Buffer.alloc(CHUNK, 1); // 填充 1，分块写，峰值稳定
      written += buf.length;
      if (!w.write(buf)) {
        w.once('drain', step); // 背压：缓冲满就等 drain 再继续
      } else {
        setImmediate(step);
      }
    }
    w.on('error', reject);
    step();
  });
}

function copyByReadFile() {
  return new Promise((resolve) => {
    const start = Date.now();
    fs.readFile(tmp, (err, data) => {
      if (err) throw err;
      fs.writeFile(out1, data, () => {
        console.log(`readFile+writeFile 完成，耗时 ${Date.now() - start}ms`);
        console.log(`  进程 RSS(约): ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB（含整文件 200MB 缓冲）`);
        resolve();
      });
    });
  });
}

function copyByStream() {
  return new Promise((resolve) => {
    const start = Date.now();
    const ws = fs.createWriteStream(out2);
    fs.createReadStream(tmp).pipe(ws);
    ws.on('finish', () => {
      console.log(`stream.pipe 完成，耗时 ${Date.now() - start}ms`);
      console.log(`  进程 RSS(约): ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB（分块读写，峰值稳定）`);
      resolve();
    });
  });
}

(async () => {
  console.log('生成 200MB 临时文件...');
  await genFile();
  console.log('开始复制对比：\n');
  await copyByReadFile();
  await copyByStream();
  // 收尾：删除临时文件，避免污染仓库
  fs.unlinkSync(tmp);
  fs.unlinkSync(out1);
  fs.unlinkSync(out2);
  console.log('\n已删除临时文件，实验结束');
  console.log('结论：读大文件优先用 Stream，内存不会被一次性撑爆');
})();
