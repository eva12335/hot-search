import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// 3D 视差：文档级 mousemove，所有卡片统一旋转（对齐 v2-showcase.html）
document.addEventListener("mousemove", (e) => {
  document.querySelectorAll(".glass-card").forEach((card) => {
    const el = card as HTMLElement;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (window.innerWidth / 2);
    const dy = (e.clientY - cy) / (window.innerHeight / 2);
    el.style.transform = `translateY(-6px) rotateX(${dy * -5}deg) rotateY(${dx * 4}deg)`;
  });
}, { passive: true });

document.addEventListener("mouseleave", () => {
  document.querySelectorAll(".glass-card").forEach((card) => {
    (card as HTMLElement).style.transform = "";
  });
});
