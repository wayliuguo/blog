## lazyLoad 使用
```
import VueLazyLoad from './plugins/vue-lazyload'
Vue.use(VueLazyLoad, {
    loading: logo,
    preload: 1.2
})
```

```
<div class="box">
    <li v-for="(item, index) in list" :key="index">
        <img v-lazy="item" alt="">
    </li>
</div>
```

## 实现 VueLazyLoad
- lazy 执行后得到一个类`lazyClass`
- `lazyClass`实例化的对象，包含有`add`与`remove`方法
- 定义一个`lazy`指令
```
const VueLazyLoad = {
    install(Vue, options) {
        const LazyClass = lazy(Vue)
        const instance = new LazyClass(options)
        Vue.directive('lazy', {
            bind: instance.add.bind(instance),
            unbind: instance.remove.bind(instance)
        })
    }
}
```

## lazy 函数做了什么？
- 实例上定义`listeners`收集元素集合
- 实现`add`方法，作为指令`bind`时执行
  - 通过`ReactiveListener`类生成一个元素对应的实例，收集于`listeners`
  - 通过`scrollParent`找到父级滚动的元素，监听该元素滚动事件执行`lazyLoadHandler`
- 实现`lazyLoadHandler`
  - 遍历`listeners`集合，检测元素如果位于可视区则加载图片
```
const lazy = Vue => {
    class ReactiveListener {
        ...
    }

    return class LazyClass {
        constructor(options) {
            this.options = options
            this.bindHandler = false
            this.listeners = []
        }
        add(el, bindings) {
            Vue.nextTick(() => {
                // 寻找到可滚动的元素
                let ele = scrollParent(el)
                // 1. 监控el是否需要显示
                let listener = new ReactiveListener({
                    el,
                    src: bindings.value,
                    options: this.options
                })
                this.listeners.push(listener)
                // 2.绑定滚动事件
                // 只需要绑定一次
                if (!this.bindHandler) {
                    // 也可以使用 intersectionObserver(兼容性不好)
                    // 节流降低使用频率
                    let lazyHandler = throttle(this.lazyLoadHandler.bind(this), 500)
                    ele.addEventListener('scroll', lazyHandler, {
                        passive: true
                    })
                    this.bindHandler = true
                }
                // 默认不滚动也需要展示的
                this.lazyLoadHandler()
            })
        }
        lazyLoadHandler() {
            // 看一下 哪些需要加载
            // 在可视区域内，这个元素没有被加载过
            this.listeners.forEach(listener => {
                // 如果加载过
                if (listener.state.loading) return
                listener.checkInView() && listener.load()
            })
        }
        remove() {}
    }
}
```

## 懒加载核心 ReactiveListener
- checkInView: 检查元素是否位于可视区
  - 通过`getBoundingClientRect`获取元素距离屏幕位置
  - 与屏幕的高度*比值比较是否已经位于可视区
- load: 负责src的变更
  - 先显示loading图片
  - 再去加载真实图片，图片成功后显示成功内容，失败显示失败内容
```
class ReactiveListener {
    constructor({ el, src, options }) {
        this.el = el
        this.src = src
        this.options = options
        this.state = {
            loading: false
        }
    }
    // 用来检测自己在不在可视区域内
    checkInView() {
        // 获取当前元素距离屏幕的位置
        let { top } = this.el.getBoundingClientRect()
        return top < window.innerHeight * this.options.preload
    }
    load() {
        // 先显示loading图片
        // 再去加载真实图片，图片成功后显示成功内容，失败显示失败内容
        render(this, 'loading')
        loadImg(
            this.src,
            () => {
                this.state.loading = true
                render(this, 'loaded')
            },
            () => {
                render(this, 'error')
            }
        )
    }
}
```

## 其他方法
- scrollParent
- render
- loadImg
```
const scrollParent = el => {
    let parent = el.parentNode
    while (parent) {
        // getComputedStyle: 原生方法用于获取元素样式
        if (/scroll/.test(getComputedStyle(parent)['overflow'])) {
            return parent
        }
        parent = parent.parentNode
    }
}

const render = (listener, status) => {
    let el = listener.el
    let src = ''
    switch (status) {
        case 'loading':
            src = listener.options.loading
            break
        case 'loaded':
            src = listener.src
            break
        case 'error':
            src = listener.options.error
            break
        default:
            break
    }
    el.setAttribute('src', src)
}

const loadImg = (src, resolve, reject) => {
    let img = new Image()
    img.src = src
    img.onload = resolve
    img.onerror = reject
}
```