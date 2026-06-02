import app from "./app.js";

const PORT = parseInt(process.env.PORT || "3001", 10);

app.listen(PORT, () => {
  console.log(`[server] 今日热搜 API 已启动: http://localhost:${PORT}`);
});
