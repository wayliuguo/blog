// 02 串行 await：三个任务一个接一个执行，总耗时 = 三者之和
// 模拟「用户信息 100ms / 聊天记忆 100ms / 知识库检索 500ms」
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
  // 注意：这里每次 await 都会“等上一个彻底完成后”才开始下一个
  const a = await fetchUserProfile();
  const b = await fetchChatMemory();
  const c = await fetchKnowledgeBase();
  const cost = Date.now() - start;
  console.log('串行执行结果:', a, b, c);
  console.log(`总耗时约 ${cost}ms（≈ 100+100+500，三个任务排队）`);
})();
