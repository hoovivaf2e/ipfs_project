import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import axios from 'axios'
import VueAxios from 'vue-axios'
import JsEncrypt from 'jsencrypt'
import VueCryptojs from 'vue-cryptojs'

Vue.use(VueAxios, axios)
Vue.use(VueCryptojs)

Vue.config.productionTip = false
axios.defaults.withCredentials = false
Vue.prototype.$jsEncrypt = JsEncrypt

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
