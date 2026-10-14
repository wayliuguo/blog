import * as page0 from '../../pages/about.tsx'
import * as page1 from '../../pages/index.tsx'
import * as page2 from '../../pages/order/[id].tsx'
import type { Route } from "../match"
export const routes: Route[] = [
  { pattern: '/about', page: page0 },
  { pattern: '', page: page1 },
  { pattern: '/order/:id', page: page2 },
]
