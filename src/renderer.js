/* 场地、路线依次重绘；共享路径点仍使用 0–1000 逻辑坐标。 */
(function () {
  "use strict";
  const app = window.RoutePainter = window.RoutePainter || {};
  let canvas, ctx;
  app.renderer = {
    init(element) {
      canvas = element;
      ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("浏览器无法创建 Canvas 2D 上下文。");
    },
    draw(state) {
      const points = state.points || [];
      canvas.setAttribute("aria-label", `VEX U 对抗赛场地，当前 ${points.length} 个路径点，点击场地添加路径点`);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      app.field.draw(ctx);
      if (points.length === 0) return;
      const color = state.team === "blue" ? "#167cdc" : "#d4314d";
      ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.beginPath();
      points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.strokeStyle = "#ffffffdb"; ctx.lineWidth = 11; ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.stroke();
      points.forEach((p, i) => {
        ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.stroke();
        const label = String(i + 1);
        ctx.font = "700 19px system-ui, sans-serif";
        const radius = Math.max(16, ctx.measureText(label).width / 2 + 7);
        const x = Math.max(radius + 2, Math.min(998 - radius, p.x));
        const y = p.y < 58 ? p.y + 33 : p.y - 30;
        ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.stroke();
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = "#fff"; ctx.fillText(label, x, y);
      });
      ctx.restore();
    },
    canvasToPoint(event) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(1000, (event.clientX - rect.left) / rect.width * 1000)),
        y: Math.max(0, Math.min(1000, (event.clientY - rect.top) / rect.height * 1000))
      };
    }
  };
}());
