const path = require('path')

// basename
console.log(path.basename(__filename, '.js')) // 2.path
console.log(path.basename(__filename)) // 2.path.js

// dirname
console.log(path.dirname('/a/b/c')) // /a/b

// extname
console.log(path.extname('/a/b.css')) // .css

// parse
console.log(path.parse('/a/b/c/index.html'))
/* {
    root: '/',
    dir: '/a/b/c',     
    base: 'index.html',
    ext: '.html',
    name: 'index'
} */

// format
console.log(
    path.format({
        root: '/',
        dir: '/a/b/c',
        base: 'index.html',
        ext: '.html',
        name: 'index'
    })
) // /a/b/c\index.html

// isAbsolute
console.log(path.isAbsolute('foo')) // false
console.log(path.isAbsolute('/foo')) // true

// join
console.log(path.join('a/b', 'c', '../', 'index.html')) // a\b\index.html

// normalize
console.log(path.normalize('a/b/c/d')) // a\b\c\d

// resolve
console.log(path.resolve()) // E:\working\blog\code\node\nodeBasic
console.log(path.resolve('a', 'b')) //  E:\working\blog\code\node\nodeBasic\a\b
console.log(path.resolve('/a', 'b')) // E:\a\b
