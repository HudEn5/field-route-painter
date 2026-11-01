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
      canvas.setAttribute("aria-label", `VEX U 对抗赛场地，1号车 ${state.routes["1"].length} 个点，2号车 ${state.routes["2"].length} 个点，当前编辑${state.activeVehicle}号车`);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      app.field.draw(ctx);
      // 相对坐标轴固定在当前车首点；只提示原点和方向，不变换路线数据。
      if (state.coordinateMode === "relative" && state.showCoordinates && state.points.length) {
        const origin = state.points[0];
        ctx.save(); ctx.setLineDash([8, 8]);
        ctx.strokeStyle = "#edf8e5b0"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, origin.y); ctx.lineTo(1000, origin.y);
        ctx.moveTo(origin.x, 0); ctx.lineTo(origin.x, 1000); ctx.stroke();
        ctx.setLineDash([]); ctx.font = "600 18px system-ui, sans-serif";
        ctx.textAlign = "left"; ctx.lineWidth = 4; ctx.strokeStyle = "#334438"; ctx.fillStyle = "#f1ffe6";
        const labels = [
          [`O${state.activeVehicle} (0,0)`, Math.max(8, Math.min(870, origin.x + 20)), origin.y > 940 ? origin.y - 45 : origin.y + 45],
          ["X →", 938, Math.max(25, origin.y - 12)],
          ["Y ↓", Math.min(938, origin.x + 12), 975]
        ];
        for (const [text, x, y] of labels) { ctx.strokeText(text, x, y); ctx.fillText(text, x, y); }
        ctx.restore();
      }
      // 当前车最后绘制，交叉处保留当前编辑路线的清晰度。
      const order = state.activeVehicle === "1" ? ["2", "1"] : ["1", "2"];
      for (const vehicle of order) {
        const points = state.routes[vehicle];
        if (points.length === 0) continue;
        const second = vehicle === "2";
        const color = state.team === "blue" ? (second ? "#174984" : "#167cdc") : (second ? "#961d3f" : "#d4314d");
        ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round";
        ctx.globalAlpha = vehicle === state.activeVehicle ? 1 : 0.82;
        ctx.setLineDash(second ? [20, 13] : []);
        ctx.beginPath();
        points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
        ctx.strokeStyle = "#ffffffdb"; ctx.lineWidth = 11; ctx.stroke();
        ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.stroke();
        ctx.setLineDash([]);
        points.forEach((p, i) => {
          ctx.beginPath();
          if (second) ctx.rect(p.x - 9, p.y - 9, 18, 18);
          else ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
          ctx.fillStyle = color; ctx.fill();
          ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.stroke();
          const label = `${vehicle}·${i + 1}`;
          ctx.font = "700 19px system-ui, sans-serif";
          const radius = Math.max(16, ctx.measureText(label).width / 2 + 7);
          const x = Math.max(radius + 2, Math.min(998 - radius, p.x));
          const y = p.y < 58 ? p.y + 33 : p.y - 30;
          ctx.beginPath();
          if (second) ctx.rect(x - radius, y - 16, radius * 2, 32);
          else ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = color; ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.stroke();
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillStyle = "#fff"; ctx.fillText(label, x, y);
        });
        ctx.restore();
      }
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
