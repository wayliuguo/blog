var _a;
const g = globalThis;
(_a = g.__orders) != null ? _a : g.__orders = [
  { id: "1001", title: "\u673A\u68B0\u952E\u76D8", amount: 399, status: "paid" },
  { id: "1002", title: "\u663E\u793A\u5668\u652F\u67B6", amount: 259, status: "pending" },
  { id: "1003", title: "USB-C \u6269\u5C55\u575E", amount: 189, status: "paid" },
  { id: "1004", title: "\u4EBA\u4F53\u5DE5\u5B66\u6905", amount: 1299, status: "refunded" },
  { id: "1005", title: "\u964D\u566A\u8033\u673A", amount: 899, status: "paid" }
];
function listOrders() {
  return g.__orders;
}
function getOrder(id) {
  return g.__orders.find((o) => o.id === id);
}
function addOrder(o) {
  const id = String(1e3 + g.__orders.length + 1);
  g.__orders.push({ id, ...o });
  return id;
}

export { addOrder as a, getOrder as g, listOrders as l };
//# sourceMappingURL=store.mjs.map
