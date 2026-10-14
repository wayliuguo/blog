import { c as defineEventHandler } from '../../../_/nitro.mjs';
import { l as listOrders } from '../../../_/store.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';

const summary_get = defineEventHandler(() => {
  const orders = listOrders();
  return {
    total: orders.length,
    amount: orders.reduce((s, o) => s + o.amount, 0),
    orders: orders.map((o) => ({ id: o.id, title: o.title }))
  };
});

export { summary_get as default };
//# sourceMappingURL=summary.get.mjs.map
