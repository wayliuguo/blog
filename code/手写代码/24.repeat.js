function repeat(s, n) {
    if (n > 0) {
        return s + repeat(s, --n)
    } else {
        return ''
    }
}

function repeatReduce(s, n) {
    while (n > 1) {
        s += s
        n--
    }
    return s
}

console.log(repeat('abc', 2)) // abcabc
console.log(repeatReduce('abc', 2)) // abcabc
