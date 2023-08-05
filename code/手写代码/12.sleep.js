function sleep(wait) {
    return new Promise(resolve => {
        setTimeout(resolve, wait)
    })
}
const curTime = Date.now()
sleep(3000).then(() => {
    console.log(Date.now() - curTime) // 3000
})
