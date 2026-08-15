if (typeof globalThis.structuredClone === "undefined") {
  const { serialize, deserialize } = require("node:v8");
  globalThis.structuredClone = (value) => deserialize(serialize(value));
}

if (typeof globalThis.queueMicrotask === "undefined") {
  globalThis.queueMicrotask = (cb) => Promise.resolve().then(cb);
}
