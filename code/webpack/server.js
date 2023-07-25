const express = require('express')
const app = new express()

app.get('/api/getNum', (req, res) => {
    res.status(200).end('hello world')
})

app.listen(3000)
