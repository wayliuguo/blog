function red() {
    console.log('red')
}
function green() {
    console.log('green')
}
function yellow() {
    console.log('yellow')
}
// 回调函数实现
const task = (wait, light, callback) => {
    setTimeout(() => {
        switch (light) {
            case 'red':
                red()
                break
            case 'green':
                green()
                break
            case 'yellow':
                yellow()
                break
        }
        callback()
    }, wait)
}
const step = () => {
    task(3000, 'red', () => {
        task(2000, 'green', () => {
            task(1000, 'yellow', step)
        })
    })
}
// step()

// promise 实现
const taskPromise = (wait, light) => {
    return new Promise(resolve => {
        setTimeout(() => {
            switch (light) {
                case 'red':
                    red()
                    break
                case 'green':
                    green()
                    break
                case 'yellow':
                    yellow()
                    break
            }
            resolve()
        }, wait)
    })
}
const setpPromise = () => {
    taskPromise(3000, 'red')
        .then(() => {
            taskPromise(2000, 'green')
        })
        .then(() => {
            taskPromise(1000, 'yellow')
        })
        .then(() => {
            setpPromise()
        })
}
// setpPromise()

const stepRunner = async () => {
    await taskPromise(3000, 'red')
    await taskPromise(2000, 'green')
    await taskPromise(1000, 'yellow')
    stepRunner()
}
stepRunner()
