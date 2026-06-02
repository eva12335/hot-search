// 使用动态 import() 以支持 ESM（@vercel/node 用 esbuild 编译后会输出 CJS，
// CJS 的 require() 无法加载 ESM 的 backend/src/app.js，必须用动态 import）
export default async function handler(req: any, res: any) {
  const { default: app } = await import("../backend/src/app.js");
  app(req, res);
}
