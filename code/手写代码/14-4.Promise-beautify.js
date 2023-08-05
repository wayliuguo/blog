const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'

class myPromise {
    constructor(executor) {
        this.state = PENDING
        this.value = null
        this.reason = null
        this.onFulfilledCb = []
        this.onRejectedCb = []

        const resolve = value => {
            this.state = FULFILLED
            this.value = value
            this.onFulfilledCb.forEach(fn => fn(value))
        }
        const reject = reason => {
            this.state = REJECTED
            this.reason = reason
            this.onRejectedCb.forEach(fn => fn(reason))
        }
        try {
            executor(resolve, reject)
        } catch (e) {
            reject(e)
        }
    }
    then(onFulfilled, onRejected) {
        return new myPromise((resolve, reject) => {
            if (typeof onFulfilled !== 'function') {
                onFulfilled = value => value
            }
            if (typeof onRejected !== 'function') {
                onRejected = reason => {
                    throw reason
                }
            }
            if (this.state === PENDING) {
                this.onFulfilledCb.push(() => {
                    setTimeout(() => {
                        try {
                            resolve(onFulfilled(this.value))
                        } catch (e) {
                            reject(e)
                        }
                    })
                })
                this.onRejectedCb.push(() => {
                    setTimeout(() => {
                        try {
                            resolve(onRejected(this.reason))
                        } catch (e) {
                            reject(e)
                        }
                    })
                })
            }
            if (this.state === FULFILLED) {
                setTimeout(() => {
                    try {
                        resolve(onFulfilled(this.value))
                    } catch (e) {
                        reject(e)
                    }
                })
            }
            if (this.state === REJECTED) {
                setTimeout(() => {
                    try {
                        resolve(onRejected(this.reason))
                    } catch (e) {
                        reject(e)
                    }
                })
            }
        })
    }
}

const promise = new myPromise((resolve, reject) => {
    resolve(1)
})
promise
    .then(res => {
        console.log(res)
        return res
    })
    .then(res => console.log(res))
console.log(2)

promise.then().then(res => console.log(res)) // 1

// 测试中途catch
const promise2 = new myPromise((resolve, reject) => {
    resolve(2)
})
promise2
    .then(res => {
        throw new Error('error')
    })
    .then(
        res => console.log(res),
        e => {
            console.log(e.message) // error
            return 5
        }
    )
    .then(res => console.log(res))
