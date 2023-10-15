import { isArray, isIntegerKey } from "@vue/shared";
import { TrackOpTypes, TriggerOrTypes } from "./operators";

export function effect(fn: Function, options: any = {}) {
  // 需要让这个 effect 变成响应式的 effect，实现数据变化重新执行
  const effect = createReactiveEffect(fn, options);

  // 响应式的effect默认会先执行一次，如果是lazy不执行
  if (!options.lazy) {
    effect();
  }

  return effect;
}

// 全局 effect，用于存储当前的 effect，供 track 获取
let activeEffect;
/**
 * effect 栈，用于effect 嵌套中获得正确的effect上下文
 * 保证每个属性收集的effect是正确的
 * effect(() => {
 *  state.name // effect1
 *  effect(() => {state.age}) //effect2
 *  state.sex // effect1
 * })
 */
const effectStack = [];
// effect 唯一标识,用于区分 effect
let uid = 0;
function createReactiveEffect(fn, options) {
  const effect = function reactiveEffect() {
    // 保证此effect没有加入到effectStack 中，防止死循环
    // 如 effect(() => state.age++) 如果没有这个判断，状态改变后重新执行会死循环
    if (!effectStack.includes(effect)) {
      try {
        effectStack.push(effect);
        activeEffect = effect;
        // 函数执行时会执行对应的 getter 方法，这个时候进行关联
        // baseHanlers.ts => createGetter(if (!isReadonly)) 分支
        return fn();
      } finally {
        effectStack.pop();
        activeEffect = effectStack[effectStack.length - 1];
      }
    }
  };
  // 唯一标识
  effect.id = uid++;
  // 用于标识这个是响应式effect
  effect._isEffect = true;
  // 记录effect对应的函数
  effect.raw = fn;
  // 记录选项
  effect.options = options;
  return effect;
}

// 收集effect依赖
const targetMap = new WeakMap();

/**
 * 让某个对象中的属性收集对应的effect函数
 * @param target 目标对象
 * @param type 类型
 * @param key 属性
 */
export function track(target: object, type: TrackOpTypes, key: string) {
  // 构建对应的weakMap(key: target value: map(key: key(依赖属性名), value: set[effect1,...]))
  // 没在effect中使用的属性不用收集
  if (activeEffect === undefined) return;
  // 从 targetMap 获取 target 对应的值，如果没有则创建并赋值给 depsMap，其值是一个map，用于存放key => set[effect]
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  // 从 depsMap 获取 key 对应的值，如果没有则创建并赋值给 dep，其值是一个set数组，用于存放effect数组
  let dep = depsMap.get(key);
  if (!dep) {
    depsMap.set(key, (dep = new Set()));
  }
  // 避免添加重复的
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect);
  }
  console.log(targetMap);
}

export function trigger(target, type?, key?, newValue?, oldValue?) {
  console.log(target, type, key, newValue, oldValue);
  // 如果这个属性没有收集过 effect 不需要做任何操作
  const depsMap = targetMap.get(target);
  if (!depsMap) return;

  // 将所有的effect全部暂存到一个新的集合中，最终一起执行
  const effects: Set<Function> = new Set()
  // 添加 effect
  const add = effectsToAdd => {
    if (effectsToAdd) {
      effectsToAdd.forEach(effect => effects.add(effect))
    }
  }

  // 1.判断是否修改数组的长度，修改数组的长度影响较大
  if (key === 'length' && isArray(target)) {
    // 如果对应的长度有依赖收集，则需要更新
    depsMap.forEach((dep, key) => {
      console.log(depsMap, dep, key)
      // 如果更改的长度小于收集的索引，那么这个索引也需要触发effect重新更新（state.arr.length = 1）
      // 如果不是直接更改length，如push的这种，key已经是新增的下标了
      if (key === 'length' || key > newValue) {
        add(dep)
      }
    })
  } else {
    // 2.如果不是修改数组的长度
    if (key !== undefined) {
      add(depsMap.get(key))
    }
    // 如果是修改数组中某一个索引
    switch (type) {
      case TriggerOrTypes.ADD:
        if (isArray(target) && isIntegerKey(key)) {
          add(depsMap.get('length'))
        }
        break;
      default:
        break;
    }
  }
  // 执行所有effect
  effects.forEach(effect => effect())
}
