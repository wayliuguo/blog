import { c as defineEventHandler, g as getRouterParam, e as createError } from '../../../_/nitro.mjs';
import { g as getOrder } from '../../../_/store.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';

const _id__get = defineEventHandler((event) => {
  const id = getRouterParam(event, "id");
  const order = getOrder(id);
  if (!order) {
    throw createError({ statusCode: 404, statusMessage: "order not found" });
  }
  return order;
});

export { _id__get as default };
//# sourceMappingURL=_id_.get.mjs.map
