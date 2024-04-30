// ch03/barchart/canvas/index.js

const data = [
    { name: 'questions', value: 17 },
    { name: 'schools', value: 25 },
    { name: 'philosophers', value: 35 }
]

const chartWidth = 480 // 条形图的宽度
const chartHeight = 300 // 条形图的高度
const margin = 15 // 条形图的外边距

const containerWidth = chartWidth + margin * 2 // 容器的宽度
const containerHeight = chartHeight + margin * 2 // 容器的高度
