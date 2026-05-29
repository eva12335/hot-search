import NodeCache from "node-cache";

const cache = new NodeCache({
  stdTTL: 300,           // 5 分钟默认 TTL
  checkperiod: 60,       // 每 60 秒检查过期
  useClones: false,      // 直接返回引用，性能更好
});

export default cache;
