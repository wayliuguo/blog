const express = require('express')
const userRouter = express.Router()

userRouter.get('/:id', (req, res) => {
    const { id } = req.params
    res.send(id)
})

module.exports = userRouter
