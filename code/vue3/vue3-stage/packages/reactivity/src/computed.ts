import { isFunction } from '@vue/shared'
import { effect, track, trigger } from './effect'
import { TrackOpTypes, TriggerOrTypes } from './operators'

class ComputedRefImpl {
    // 默认取值时不要用缓存
    public _dirty = true
    public _value
    public effect
    // ts 中默认不会挂载到this上
    constructor(
        getter,
        public setter
    ) {
        // 计算属性默认会产生一个effect
        this.effect = effect(getter, {
            lazy: true, // 默认不执行
            scheduler: () => {
                // triggle 触发执行后，把_dirty置为true，再次触发get时候即可再次更新
                if (!this._dirty) {
                    this._dirty = true
                    // 通知依赖进行更新
                    trigger(this, TriggerOrTypes.SET, 'value')
                }
            }
        })
    }
    // 计算属性也要收集依赖
    get value() {
        // 在取值的时候才执行 effect(_dirty)
        if (this._dirty) {
            // 在 effect 执行时，会将用户的返回值返回，这时候可以更新 _value
            this._value = this.effect()
            this._dirty = false
        }
        // 收集此对象的.value属性的依赖
        track(this, TrackOpTypes.GET, 'value')
        return this._value
    }
    set value(newValue) {
        this.setter(newValue)
    }
}

export function computed(getterOrOptions) {
    let getter
    let setter

    if (isFunction(getterOrOptions)) {
        getter = getterOrOptions
        setter = () => {
            console.warn('computed value must be readonly')
        }
    } else {
        getter = getterOrOptions.get
        setter = getterOrOptions.set
    }
    return new ComputedRefImpl(getter, setter)
}
