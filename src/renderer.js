/* T01：保留网格，在 draw 中补充路径连线、路径点和编号。 */
(function () {
  "use strict";
  const app = window.RoutePainter = window.RoutePainter || {};
  let canvas;
  let ctx;
  app.renderer = {
    init(element) {
      canvas = element;
      ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("浏览器无法创建 Canvas 2D 上下文。");
    },
    draw(state) {
      // 先清空画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 画背景底色
      ctx.fillStyle = "#f6f8f2";
      ctx.fillRect(0, 0, 1000, 1000);
      
      // 画网格（队长的代码，没动）
      for (let n = 100; n < 1000; n += 100) {
        ctx.beginPath();
        ctx.strokeStyle = n === 500 ? "#bdcdb4" : "#dce5d5";
        ctx.lineWidth = n === 500 ? 2 : 1;
        ctx.moveTo(n, 0); ctx.lineTo(n, 1000);
        ctx.moveTo(0, n); ctx.lineTo(1000, n);
        ctx.stroke();
      }

      // --- 下面是你（T01）负责的新增内容 ---
      
      // 如果没有点，就不用画了
      if (!state.points || state.points.length === 0) return;

      // 根据阵营决定颜色（默认红色）
      const color = state.team === "blue" ? "#346db5" : "#b94740";
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 3;

      // 1. 画线：把所有的点按顺序连起来
      ctx.beginPath();
      ctx.moveTo(state.points[0].x, state.points[0].y);
      for (let i = 1; i < state.points.length; i++) {
        ctx.lineTo(state.points[i].x, state.points[i].y);
      }
      ctx.stroke();

      // 2. 画点和编号
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let i = 0; i < state.points.length; i++) {
        const p = state.points[i];
        
        // 画点（画个实心圆）
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // 画编号（文字，从1开始）
        ctx.fillText(i + 1, p.x, p.y - 20);
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
