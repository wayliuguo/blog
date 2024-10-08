// 绘制形状+颜色设置
/* const draw = () => {
    const canvas = document.getElementById('canvas')
    const context = canvas.getContext('2d')

    // 画一个矩形
    context.fillStyle = '#5B8FF9' // 设置图形的填充颜色
    context.fillRect(10, 10, 100, 50)

    // 画一个矩形的边框
    context.lineWidth = 5 // 设置边框宽度
    context.strokeStyle = '#61DDAA' // 设置边框颜色
    context.strokeRect(10, 70, 100, 50)

    // 清除矩形区域
    context.clearRect(15, 15, 50, 25)
} */

// 绘制线段
/* const draw = () => {
    const canvas = document.getElementById('canvas')
    const context = canvas.getContext('2d')

    context.strokeStyle = '#61DDAA' // 设置边框颜色

    context.beginPath() // 新建一条path
    context.moveTo(50, 50) // 把画笔移动到指定的坐标
    context.lineTo(200, 50) // 绘制一条从当前画笔坐标（50, 50）到（200, 50） 的直线
    context.closePath() // 闭合路径：会拉一条从当前点到path起始点的直线
    context.stroke() // 绘制路径
} */

// 绘制三角形边框
/* const draw = () => {
    const canvas = document.getElementById('canvas')
    const context = canvas.getContext('2d')

    context.strokeStyle = '#61DDAA' // 设置边框颜色

    context.beginPath() // 新建一条path
    context.moveTo(50, 50) // 把画笔移动到指定的坐标

    context.lineTo(200, 50)
    context.lineTo(200, 200)

    context.closePath() // 闭合路径：会拉一条从当前点到path起始点的直线
    context.stroke() // 绘制路径
} */

// 填充三角形
/* const draw = () => {
    const canvas = document.getElementById('canvas')
    const context = canvas.getContext('2d')

    context.fillStyle = '#61DDAA'

    context.beginPath() // 新建一条path
    context.moveTo(50, 50) // 把画笔移动到指定的坐标

    context.lineTo(200, 50)
    context.lineTo(200, 200)

    context.closePath() // 闭合路径：会拉一条从当前点到path起始点的直线
    context.fill() // 填充闭合区域
} */

/* const draw = () => {
    const canvas = document.getElementById('canvas')
    const context = canvas.getContext('2d')

    context.strokeStyle = '#61DDAA' // 设置边框颜色

    const centerX = canvas.width / 2 // 圆心x坐标
    const centerY = canvas.height / 2 // 圆心y坐标
    const radius = 100 // 半径
    const startAngle = 0 // 起始角度
    const endAngle = Math.PI * 2 // 结束角度，这里是完整的圆（2π弧度）

    // 绘制圆
    context.beginPath()
    context.arc(centerX, centerY, radius, startAngle, endAngle)
    context.lineWidth = 5 // 设置线条宽度
    context.stroke() // 绘制圆的边框
} */

// 样式-lineWidth-setLineDash-lineDashOffset
/* const draw = () => {
    const canvas = document.getElementById('canvas')
    const context = canvas.getContext('2d')

    context.lineWidth = 5

    context.setLineDash([20, 5])
    context.lineDashOffset = -0

    context.strokeRect(50, 50, 150, 150)
} */

// 绘制文本
/* const draw = () => {
    const canvas = document.getElementById('canvas')
    const context = canvas.getContext('2d')

    context.font = '50px sans-serif'
    context.textBaseline = 'center'

    context.fillText('HELLO', 0, 50)
    context.strokeText('天若有情', 0, 100)
} */

// 绘制图片
// const draw = () => {
//     const canvas = document.getElementById('canvas')
//     const context = canvas.getContext('2d')
//     const img = document.querySelector('img')
//     const { width, height } = img
//     context.drawImage(img, 0, 0, width / 2, height / 2)
// }
// document.querySelector('img').onload = () => {
//     draw()
// }

// 状态保存和恢复
const draw = () => {
    const canvas = document.getElementById('canvas')
    const context = canvas.getContext('2d')

    // 保存当前状态
    context.save()

    // 设置一些样式和变换
    context.fillStyle = 'red'
    context.translate(50, 50)

    // 绘制一个矩形
    context.fillRect(0, 0, 100, 100) // 这个矩形会在(50, 50)的位置，颜色是红色

    // 恢复之前保存的状态
    context.restore()

    // 再次绘制一个矩形，但这次它会在原始位置（0,0），且颜色可能是之前的状态（如果之前设置过的话）
    context.fillRect(0, 0, 100, 100) // 这个矩形会在(0, 0)的位置，颜色取决于restore()之前的设置
}
draw()
