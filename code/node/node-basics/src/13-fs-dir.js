// 13 目录遍历 + 批量读文件（fs / path 最常用的实战形态）
// 对应文档：node/01-运行环境/05-内置模块与文件操作.md
// 演示：用 fs/promises + path 扫描目录、过滤 .md、逐个读取并打印「文件名 + 字节数 + 首行」、最后汇总
// 运行命令：node src/13-fs-dir.js
//          node src/13-fs-dir.js keep   # 运行完保留临时示例目录（默认跑完自动清理）

const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

// 临时示例目录放在系统临时目录下，不依赖仓库里的任何文件，保证任何机器都能直接跑
const SAMPLE_DIR = path.join(os.tmpdir(), 'node-basics-fs-dir-demo');

// 自包含：自己造 2~3 个示例 .md 文件
const SAMPLE_FILES = [
  { name: 'a.md', content: '第一行：这是 a 文档\n后面是正文内容。\n' },
  { name: 'b.md', content: '首行：b 文档的标题\n第二行补充信息。\n' },
  { name: 'c.md', content: 'line1: c 是带中文与 emoji 的文档 🚀\nline2 收尾。\n' },
  // 故意放一个非 .md 文件，验证过滤逻辑确实会忽略它
  { name: 'note.txt', content: '这不是 markdown，应当被过滤掉。\n' },
];

async function prepareSamples() {
  await fs.mkdir(SAMPLE_DIR, { recursive: true });
  for (const f of SAMPLE_FILES) {
    await fs.writeFile(path.join(SAMPLE_DIR, f.name), f.content, 'utf8');
  }
}

async function scanMarkdown(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  // 只保留普通文件，且后缀为 .md（大小写不敏感）
  const mdFiles = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'))
    .map((e) => e.name)
    .sort();

  let totalBytes = 0;
  console.log(`=== 扫描目录：${dir} ===`);
  console.log(`找到 ${mdFiles.length} 个 .md 文件\n`);

  for (const name of mdFiles) {
    const full = path.join(dir, name);
    const buf = await fs.readFile(full); // 读成 Buffer，便于同时拿到字节数与首行
    const firstLine = buf.toString('utf8').split('\n')[0];
    totalBytes += buf.length;
    console.log(`文件：${name}`);
    console.log(`  字节数：${buf.length}`);
    console.log(`  首行：${firstLine}\n`);
  }

  console.log('--- 汇总 ---');
  console.log(`文件总数：${mdFiles.length}`);
  console.log(`总字节数：${totalBytes}`);
  return { count: mdFiles.length, totalBytes };
}

async function cleanup() {
  await fs.rm(SAMPLE_DIR, { recursive: true, force: true });
  console.log(`\n已清理临时目录：${SAMPLE_DIR}`);
}

async function main() {
  await prepareSamples();
  const keep = process.argv[2] === 'keep';
  try {
    await scanMarkdown(SAMPLE_DIR);
  } finally {
    if (!keep) {
      await cleanup();
    } else {
      console.log(`\n保留临时目录（因传了 keep 参数）：${SAMPLE_DIR}`);
    }
  }
}

main().catch((err) => {
  console.error('运行出错：', err);
  process.exit(1);
});
