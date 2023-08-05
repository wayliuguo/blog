const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

let length = arr.length
let randomIndex
while (length) {
    randomIndex = Math.floor(Math.random() * length)
    length--
    ;[arr[length], arr[randomIndex]] = [arr[randomIndex], arr[length]]
}
console.log(arr)
