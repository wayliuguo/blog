// 单元测试：不该上线，会被 mini-drop 清空
import { helper } from './helper.js'

describe('helper', () => it('works', () => expect(helper()).toBeTruthy()))