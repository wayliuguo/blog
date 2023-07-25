// eslint-disable-next-line no-unused-vars
const name = 'well'
const age = 25

function showName() {
    const name = 'liuguowei'
    return function () {
        return name
    }
}
console.log(showName()()) // liuguowei

function myAge() {
    return age
}
function showAge(fn) {
    return fn()
}
console.log(showAge(myAge)) // 25
