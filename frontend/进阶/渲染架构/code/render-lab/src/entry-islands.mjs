/**
 * 岛入口：不认识整棵树，只认识带 data-island 的那几个点。
 * 所以它既不需要页面数据，也不下载任何非交互组件的代码 —— 省下的就是这一层。
 */
import { activate } from './activate.mjs'
import { LikeButton } from './components/like-button.mjs'

const entryAt = Math.round(performance.now() * 10) / 10
const { value, ...measured } = await Lab.observeMutations('#app', () => activate({ 'like-button': LikeButton }, document))

// 岛是活的吗？真点一下：监听器没挂上，文案就不会变
const like = document.querySelector('.like')
const before = like && like.textContent
if (like) like.click()
const interactive = !!like && like.textContent !== before

await Lab.finish({ strategy: 'islands', entryAt, interactive, ...measured }, value)
