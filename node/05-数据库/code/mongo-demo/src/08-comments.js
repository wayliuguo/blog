// 08-comments.js：评论/回复——把回复嵌在评论里
// 单条评论小于 1KB、一篇文档内评论通常不超过 100 条时，嵌套比单开集合更好用：
// 一次查询就能把整棵评论树取出来，$push 追加，用 comments.$ 定位到具体那条评论
// 运行： npm run comments
require('dotenv').config()
const mongoose = require('mongoose')

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mongo_demo'

// 文章评论，直接将回复嵌入
const postSchema = new mongoose.Schema({
    title: String,
    content: String,
    comments: [
        {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            userName: String,
            content: String,
            createdAt: { type: Date, default: Date.now },
            likes: { type: Number, default: 0 },
            replies: [
                {
                    // 嵌套回复
                    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                    userName: String,
                    content: String,
                    createdAt: { type: Date, default: Date.now }
                }
            ]
        }
    ]
})
const Post = mongoose.model('Post', postSchema)

;(async () => {
    await mongoose.connect(uri)
    await Post.deleteMany({})

    const post = await Post.create({ title: 'MongoDB 嵌套文档怎么设计', content: '正文……' })
    const postId = post._id.toString()
    const userId = new mongoose.Types.ObjectId().toString()
    const userName = '张三'
    const content = '写得清楚，先赞一个'
    console.log('=== 1. 建一篇文章 ===')
    console.log('  postId =', postId)

    console.log('=== 2. 追加一条评论（$push）===')
    // 添加评论
    await Post.updateOne({ _id: postId }, { $push: { comments: { userId, userName, content } } })
    const afterComment = await Post.findOne({ _id: postId })
    const commentId = afterComment.comments[0]._id
    console.log('  评论数 =', afterComment.comments.length, '，作者 =', afterComment.comments[0].userName)
    console.log(
        '  子文档自动拿到 _id 与 default 值：likes =',
        afterComment.comments[0].likes,
        '，createdAt =',
        afterComment.comments[0].createdAt.toISOString()
    )
    console.log('  commentId =', commentId.toString(), '（定位到具体某条评论要用它）')

    console.log('=== 3. 给这条评论追加回复（comments.$）===')
    // 添加回复
    await Post.updateOne(
        { _id: postId, 'comments._id': commentId },
        { $push: { 'comments.$.replies': { userId, userName, content } } }
    )
    const afterReply = await Post.findOne({ _id: postId })
    console.log(
        '  这条评论的回复数 =',
        afterReply.comments[0].replies.length,
        '，回复人 =',
        afterReply.comments[0].replies[0].userName
    )

    console.log('=== 4. 为什么条件里必须带 comments._id ===')
    const missed = await Post.updateOne(
        { _id: postId },
        { $push: { 'comments.$.replies': { userId, userName, content: '这条会失败' } } }
    )
    console.log(
        '  只给 _id 不给 comments._id 时 matchedCount =',
        missed.matchedCount,
        '（$ 定位不到数组元素，更新直接落空）'
    )

    await mongoose.disconnect()
})().catch(async err => {
    console.error('运行失败：', err.message, '（请确认本机 mongod 已启动）')
    await mongoose.disconnect()
    process.exit(1)
})
