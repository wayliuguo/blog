import Vue from 'vue'
import App from './App.vue'
import logo from '@/assets/logo.png'

import VueLazyLoad from './plugins/vue-lazyload'
Vue.use(VueLazyLoad, {
    loading: logo,
    preload: 1.2
})

Vue.config.productionTip = false

new Vue({
    render: h => h(App)
}).$mount('#app')
