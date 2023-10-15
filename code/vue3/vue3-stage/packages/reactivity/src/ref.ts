import { hasChanged, isArray, isObject } from "@vue/shared";
import { track, trigger } from "./effect";
import { TrackOpTypes, TriggerOrTypes } from "./operators";
import { reactive } from "./reactive";

// value 是一个普通类型或者对象
export function ref(value) {
  // 将普通类型变成一个对象
  return createRef(value);
}

export function shallowRef(value) {
  return createRef(value, true);
}

const convert = (val) => (isObject(val) ? reactive(val) : val);

class RefImpl {
  public _value;
  // 参数的实例添加_v-isRef 表示是一个ref属性
  public _v_isRef = true;
  // 参数中前面增加修饰符 标识此属性放到了实例上
  constructor(public rawValue, public shallow) {
    // 如果是深度的，需要把里面的都变成响应式（使用reactive转换）
    this._value = shallow ? rawValue : convert(rawValue);
  }

  // 类的属性访问器(编译后会自动转成defineProperty)
  get value() {
    track(this, TrackOpTypes.GET, "value");
    return this._value;
  }
  set value(newValue) {
    // 判断老值和新值是否有变化
    if (hasChanged(newValue, this.rawValue)) {
      this.rawValue = newValue;
      this._value = this.shallow ? newValue : convert(newValue);
      trigger(this, TriggerOrTypes.SET, "value", newValue);
    }
  }
}

function createRef(rawValue, shallow: boolean = false) {
  return new RefImpl(rawValue, shallow);
}

// toRef toRefs 只是做了一层代理
class ObjectRefImpl {
  public __v_isRef = true;
  constructor(public target, public key) {}
  get value() {
    return this.target[this.key];
  }
  set value(newValue) {
    this.target[this.key] = newValue;
  }
}

// 将对象的一个属性变成ref类型
export function toRef(target, key) {
  return new ObjectRefImpl(target, key);
}

// object 可能传递的是一个数组或者对象
export function toRefs(object) {
  const ret = isArray(object) ? new Array(object.length) : {};
  for (let key in object) {
    ret[key] = toRef(object, key);
  }
  return ret;
}
