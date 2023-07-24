const name = 'well'
const age = 25

function showName () {
    const name = 'liuguowei'
    return function () {
        return name
    } 
}
console.log(showName()()) // liuguowei

function myAge () {
    return age
}
function showAge (fn) {
    const age = 18
    return fn()
}
console.log(showAge(myAge)) // 25
