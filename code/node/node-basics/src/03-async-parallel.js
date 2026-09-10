// 03 并行 Promise.all：三个任务同时开始，总耗时 = 最慢的那个
function fetchUserProfile() {
  return new Promise((resolve) => setTimeout(() => resolve('用户信息'), 100));
}
function fetchChatMemory() {
  return new Promise((resolve) => setTimeout(() => resolve('聊天记忆'), 100));
}
function fetchKnowledgeBase() {
  return new Promise((resolve) => setTimeout(() => resolve('知识库检索'), 500));
}

(async () => {
  const start = Date.now();
  // Promise.all 同时启动三个任务，等全部 settle 后一起拿到结果
  const [a, b, c] = await Promise.all([
    fetchUserProfile(),
    fetchChatMemory(),
    fetchKnowledgeBase(),
  ]);
  const cost = Date.now() - start;
  console.log('并行执行结果:', a, b, c);
  console.log(`总耗时约 ${cost}ms（≈ 最慢的一个 500ms）`);
  console.log('对比 02 串行：从约 700ms 降到约 500ms，省掉了两次排队等待');
})();
