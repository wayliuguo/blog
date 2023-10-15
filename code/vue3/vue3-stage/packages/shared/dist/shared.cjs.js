'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const isObject = (value) => typeof value === "object" && value !== null;
const extend = Object.assign;
const isArray = Array.isArray;
const isFunction = (value) => typeof value === "function";
const isNumber = (value) => typeof value === "number";
const isString = (value) => typeof value === "string";
const isIntegerKey = (key) => `${parseInt(key)}` === key;
// 判断对象是否存在此属性
const hasOwn = (target, key) => Object.prototype.hasOwnProperty.call(target, key);
const hasChanged = (oldValue, value) => oldValue !== value;

exports.extend = extend;
exports.hasChanged = hasChanged;
exports.hasOwn = hasOwn;
exports.isArray = isArray;
exports.isFunction = isFunction;
exports.isIntegerKey = isIntegerKey;
exports.isNumber = isNumber;
exports.isObject = isObject;
exports.isString = isString;
//# sourceMappingURL=shared.cjs.js.map
