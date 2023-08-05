const PENDING = 'pengding'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'

class myPromise {
    constructor(executor) {
        // 保存 promise 的状态
        this.state = PENDING
        // 成功结果
        this.value = undefined
        // 失败结果
        this.reason = undefined
        // 成功的回调
        this.onFulfilled = []
        // 失败的回调
        this.onRejected = []
        // resolve 方法
        const resolve = value => {
            if ((this.state = PENDING)) {
                this.state = FULFILLED
                this.value = value
                // 执行成功的回调
                this.onFulfilled.forEach(fn => fn(value))
            }
        }
        const reject = reason => {
            if ((this.state = PENDING)) {
                this.state = REJECTED
                this.reason = reason
                // 执行失败的回调
                this.onRejected.forEach(fn => fn(reason))
            }
        }
        try {
            executor(resolve, reject)
        } catch (e) {
            reject(e)
        }
    }
    // then 方法
    then(onFulfilled, onRejected) {
        if (typeof onFulfilled !== 'function') onFulfilled = () => {}
        if (typeof onRejected !== 'function') onRejected = () => {}

        // 如果状态是 pending，不是马上执行回调函数，而是将其存储起来
        if (this.state === PENDING) {
            this.onFulfilled.push(() => {
                setTimeout(() => onFulfilled(this.value))
            })
            this.onRejected.push(() => {
                setTimeout(() => onRejected(this.reason))
            })
        }
        // 如果状态是 fulfilled，则执行then传入的 onFulfilled 函数
        if (this.state === FULFILLED) {
            setTimeout(() => onFulfilled(this.value))
        }
        // 如果状态是 fulfilled，则执行then传入的 onRejected 函数
        if (this.state === REJECTED) {
            setTimeout(() => onRejected(this.reason))
        }
    }
}

const promise = new myPromise((resolve, reject) => {
    resolve(1)
})
promise.then(res => console.log(res)) // 1
promise.then(res => console.log(res)) // 1
console.log(2)
