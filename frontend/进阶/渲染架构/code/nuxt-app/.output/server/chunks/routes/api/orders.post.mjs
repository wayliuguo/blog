import { c as defineEventHandler, r as readBody, e as createError } from '../../_/nitro.mjs';
import { a as addOrder } from '../../_/store.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';

const orders_post = defineEventHandler(async (event) => {
  var _a, _b;
  const body = await readBody(event);
  const title = String((_a = body.title) != null ? _a : "").trim();
  const amount = Number((_b = body.amount) != null ? _b : 0);
  if (!title || amount <= 0) {
    throw createError({ statusCode: 400, statusMessage: "\u6807\u9898\u5FC5\u586B\u4E14\u91D1\u989D\u9700\u5927\u4E8E 0" });
  }
  const id = addOrder({ title, amount, status: "pending" });
  return { id };
});

export { orders_post as default };
//# sourceMappingURL=orders.post.mjs.map
