## 调用流程图

![img](reactivity.png)

## reactive

### 基本功能特性

1. **基本响应式**： reactive 将普通对象包装为代理，返回值不等于原对象。
2. **深度响应式**：嵌套对象自动变为响应式
3. **使用特点**:
   1. **数组支持完善**：数组操作完全响应式
   2. **集合类型支持**：Map、Set 等也支持响应式
   3. **属性检测全面**：可检测属性添加/删除


### 测试用例

1. 验证了普通对象包装为代理，返回值不等于原对象。
2. 验证了嵌套对象自动变为响应式
3. 数组操作完全响应式、Map、Set 等也支持响应式、可检测属性添加/删除未验证，这里只实现最基础的。

```
// packages\reactivity\__tests__\reactive.spec.ts

import { reactive, isReactive, toRaw } from "../src/reactive";
describe("reactive", () => {
  test("Object", () => {
    const original = { foo: 1 };
    const observed = reactive(original);
    expect(observed).not.toBe(original);
    expect(isReactive(observed)).toBe(true);
    expect(isReactive(original)).toBe(false);
    // get
    expect(observed.foo).toBe(1);
    //     // has
    expect("foo" in observed).toBe(true);
    //     // ownKeys
    expect(Object.keys(observed)).toEqual(["foo"]);
  });

  test("nested reactives", () => {
    const original = {
      nested: {
        foo: 1,
      },
      array: [{ bar: 2 }],
    };
    const observed = reactive(original);
    expect(isReactive(observed.nested)).toBe(true);
    expect(isReactive(observed.array)).toBe(true);
    expect(isReactive(observed.array[0])).toBe(true);
  });

  test("toRaw", () => {
    const original = { foo: 1 };
    const observed = reactive(original);
    expect(toRaw(observed)).toBe(original);
    expect(toRaw(original)).toBe(original);
  });
});
```

### 关键实现—对象代理

1. 创建WeakMap 变量：reactiveMap，用于收集依赖

   1. 为何使用 WeakMap
   2. 收集依赖的数据结构

2. 通过 createReactiveObject 进行了代理

   1. 缓存优化：通过在 reactiveMap中如果查到目标对象已经设置了代理，则无需再次代理，直接返回代理对象
   2. 利用 Proxy 对目标对象进行代理，并存入reactiveMap 中，返回代理对象

3. 代理对象中参数设置=》mutableHandlers

   1. getter

      1. 参数：(target、property、receiver)
         1. target 目标对象（原来未被代理对象）
         2. property 被获取的属性名
         3. receiver Proxy 或基础 Proxy 的对象
      2. 通过 Reflect.get(target, property , receiver) 获取到对象的值
      3. **通过 track 函数进行依赖的收集**
      4. 如果返回的值还是对象，则对其进行再次代理：reactive(res)
      5. 返回获取到的值

   2. setter

      1. 参数：(target、property、value、receiver)
         1. target 目标对象（原来未被代理对象）
         2. property 被获取的属性名
         3. value 新属性值
         4. receiver Proxy 或基础 Proxy 的对象
      2. **通过 Reflect.set(target, property , value, receiver) 设置值**
      3. **通过trigger(target, "set", property ) 触发依赖**

   3. 最完整的参数设置（拦截属性删除、拦截 in 操作符、拦截Object.kes()等操作）

      ```
      deleteProperty(target, key) {
          const hadKey = Object.prototype.hasOwnProperty.call(target, key)
          const result = Reflect.deleteProperty(target, key)
      
          if (hadKey && result) {
          	trigger(target, key, 'delete') // 触发删除操作
          }
          return result
      },
        
      // 拦截 in 操作符
      has(target, key) {
        track(target, key)
        return Reflect.has(target, key)
      },
      
      // 拦截 Object.keys() 等操作
      ownKeys(target) {
      	track(target, 'iterable') // 追踪迭代操作
      	return Reflect.ownKeys(target)
      }
      ```

   4. 为何需要使用闭包？

      1. 用于设置是否是 readonly、shallowReactive
      2. 用于实现 isReactive

```
// packages\reactivity\src\reactive.ts

export const reactiveMap = new WeakMap();

import {
  mutableHandlers
} from "./baseHandlers";

export function reactive(target) {
  return createReactiveObject(target, reactiveMap, mutableHandlers);
}

function createReactiveObject(target, proxyMap, baseHandlers) {
  // 核心就是 proxy
  // 目的是可以侦听到用户 get 或者 set 的动作

  // 如果命中的话就直接返回就好了
  // 使用缓存做的优化点
  const existingProxy = proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  const proxy = new Proxy(target, baseHandlers);

  // 把创建好的 proxy 给存起来，
  proxyMap.set(target, proxy);
  return proxy;
}

```

```
// packages\reactivity\src\baseHandlers.ts

const get = createGetter();
const set = createSetter();

export const mutableHandlers = {
  get,
  set,
};

function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key, receiver) {
    const isExistInReactiveMap = () =>
      key === ReactiveFlags.RAW && receiver === reactiveMap.get(target);

    const isExistInReadonlyMap = () =>
      key === ReactiveFlags.RAW && receiver === readonlyMap.get(target);

    const isExistInShallowReadonlyMap = () =>
      key === ReactiveFlags.RAW && receiver === shallowReadonlyMap.get(target);

    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    } else if (
      isExistInReactiveMap() ||
      isExistInReadonlyMap() ||
      isExistInShallowReadonlyMap()
    ) {
      return target;
    }

    const res = Reflect.get(target, key, receiver);

    // 问题：为什么是 readonly 的时候不做依赖收集呢
    // readonly 的话，是不可以被 set 的， 那不可以被 set 就意味着不会触发 trigger
    // 所有就没有收集依赖的必要了

    if (!isReadonly) {
      // 在触发 get 的时候进行依赖收集
      track(target, "get", key);
    }

    if (shallow) {
      return res;
    }

    if (isObject(res)) {
      // 把内部所有的是 object 的值都用 reactive 包裹，变成响应式对象
      // 如果说这个 res 值是一个对象的话，那么我们需要把获取到的 res 也转换成 reactive
      // res 等于 target[key]
      return isReadonly ? readonly(res) : reactive(res);
    }

    return res;
  };
}

function createSetter() {
  return function set(target, key, value, receiver) {
    const result = Reflect.set(target, key, value, receiver);

    // 在触发 set 的时候进行触发依赖
    trigger(target, "set", key);

    return result;
  };
}
```

### 关键实现—依赖收集与依赖触发

## effect