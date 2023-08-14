/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs')

const readableStream = fs.createReadStream('readStream.txt', {
    highWaterMark: 1024
})

const writeableStream = fs.createWriteStream('./writeStream.txt', {
    highWaterMark: 10
})

readableStream.pipe(writeableStream)

// 监听可读流的结束事件
readableStream.on('end', () => {
    console.log('File copy completed.')
})

// 监听可写流的结束事件
writeableStream.on('finish', () => {
    console.log('Data written to the file.')
})
