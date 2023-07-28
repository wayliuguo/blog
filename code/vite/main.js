import axios from 'axios'
import tsmode from './tsmode'

import './common.less'
import img from './index.jpg'
import icon from './small.png'

import { createApp } from 'vue'
import App from './App.vue'
createApp(App).mount('#app')

const imgEle = new Image()
imgEle.src = img
const imgIcon = new Image()
imgIcon.src = icon
document.getElementById('app').appendChild(imgEle)
document.getElementById('app').appendChild(imgIcon)

axios.get('/api/getNum').then(res => console.log(res))

import('./model').then(model => {
    console.log(model)
})
console.log(tsmode)
