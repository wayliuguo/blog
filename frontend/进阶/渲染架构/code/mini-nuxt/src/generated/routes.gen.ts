import * as page0 from '../../pages/index.vue'
import * as page1 from '../../pages/order/[id].vue'
export const routes = [
  { pattern: '', page: page0 },
  { pattern: '/order/:id', page: page1 },
]
