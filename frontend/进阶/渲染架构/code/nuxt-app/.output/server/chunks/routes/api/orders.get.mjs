import { c as defineEventHandler } from '../../_/nitro.mjs';
import { l as listOrders } from '../../_/store.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';

const orders_get = defineEventHandler(() => {
  return { orders: listOrders() };
});

export { orders_get as default };
//# sourceMappingURL=orders.get.mjs.map
