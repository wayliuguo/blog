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
        // resolve 方法
        const resolve = value => {
            if ((this.state = PENDING)) {
                this.state = FULFILLED
                this.value = value
            }
        }
        const reject = reason => {
            if ((this.state = PENDING)) {
                this.state = REJECTED
                this.reason = reason
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
        // 如果状态是 fulfilled，则执行then传入的 onFulfilled 函数
        if (this.state === FULFILLED) {
            typeof onFulfilled === 'function' && onFulfilled(this.value)
        }
        // 如果状态是 fulfilled，则执行then传入的 onRejected 函数
        if (this.state === REJECTED) {
            typeof onRejected === 'function' && onRejected(this.reason)
        }
    }
}

const promise = new myPromise((resolve, reject) => {
    resolve(1)
})
console.log(promise) // myPromise { state: 'fulfilled', value: 1, reason: undefined }
promise.then(res => console.log(res)) // 1

// 漏洞
const promiseError = new myPromise((resolve, reject) => {
    console.log('执行')
    setTimeout(() => {
        reject(3)
    })
})
console.log(promiseError) // myPromise { state: 'pengding', value: undefined, reason: undefined }
promiseError.then(
    res => console.log(res),
    err => console.log(err)
)
