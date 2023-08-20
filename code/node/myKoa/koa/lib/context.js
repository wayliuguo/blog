const contxt = {}

function defineGetter(target, key) {
    contxt.__defineGetter__(key, function () {
        return this[target][key]
    })
}

function defineSetter(target, key) {
    contxt.__defineSetter__(key, function (value) {
        this[target][key] = value
    })
}

defineGetter('request', 'path')
defineGetter('request', 'url')
defineGetter('request', 'query')

defineGetter('response', 'body')
defineSetter('response', 'body')

module.exports = contxt
