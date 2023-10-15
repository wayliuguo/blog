export const isObject = (value: unknown): boolean =>
  typeof value === "object" && value !== null;

export const extend = Object.assign;

export const isArray = Array.isArray;

export const isFunction = (value) => typeof value === "function";

export const isNumber = (value) => typeof value === "number";

export const isString = (value) => typeof value === "string";

export const isIntegerKey = (key) => `${parseInt(key)}` === key;

// 判断对象是否存在此属性
export const hasOwn = (target, key) => Object.prototype.hasOwnProperty.call(target, key)

export const hasChanged = (oldValue, value) => oldValue !== value