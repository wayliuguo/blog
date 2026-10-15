// 单元测试：不该上线，会被 mini-drop 清空
import { helper } from './helper.js'

// 浏览器里没有测试运行器（describe / it / expect 都不存在），dev 下直接执行会抛
// ReferenceError；用 typeof 守卫让它在浏览器里成为空操作。
// 生产构建时整个文件被 mini-drop 清空（apply: 'build'），这段不会进产物。
if (typeof describe === 'function') {
    describe('helper', () => it('works', () => expect(helper()).toBeTruthy()))
}
