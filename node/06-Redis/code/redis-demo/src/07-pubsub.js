'use strict';

// Pub/Sub 演示：订阅 -> 发布 3 条消息 -> 打印 -> 退出
require('dotenv').config();
const base = require('./client');

// 重要：ioredis 一旦连接进入「订阅模式」，该连接便不能再执行普通命令
// （只能 SUBSCRIBE / UNSUBSCRIBE / PING 等），因此订阅与发布必须用 duplicate() 独立连接
const subscriber = base.duplicate();
const publisher = base.duplicate();

const CHANNEL = 'demo:pubsub:news';
let received = 0;

async function main() {
  console.log('\n===== Pub/Sub 演示 =====');
  console.log('说明：Pub/Sub 不持久化，订阅之前的消息收不到；若需消息回溯请用 Stream。');

  await subscriber.subscribe(CHANNEL);
  console.log('已订阅频道：', CHANNEL);

  subscriber.on('message', (channel, message) => {
    received++;
    console.log(`收到第 ${received} 条消息 [${channel}]: ${message}`);
    // 收到第 3 条后，等待片刻后取消订阅并退出，保证脚本能跑完不挂住
    if (received === 3) {
      setTimeout(async () => {
        await subscriber.unsubscribe(CHANNEL);
        console.log('已取消订阅，演示结束。');
        subscriber.quit();
        publisher.quit();
        base.quit();
        process.exit(0);
      }, 500);
    }
  });

  // 用独立连接发布 3 条消息
  const messages = ['消息1：系统将在今晚 22:00 维护', '消息2：v2.3 版本已发布', '消息3：欢迎订阅通知频道'];
  for (const m of messages) {
    await publisher.publish(CHANNEL, m);
    await new Promise((r) => setTimeout(r, 300));
  }
}

main().catch(async (e) => {
  console.error('执行出错：', e);
  subscriber.quit();
  publisher.quit();
  base.quit();
  process.exit(1);
});
