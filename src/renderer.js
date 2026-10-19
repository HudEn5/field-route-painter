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
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#f6f8f2";
      ctx.fillRect(0, 0, 1000, 1000);
      for (let n = 100; n < 1000; n += 100) {
        ctx.beginPath();
        ctx.strokeStyle = n === 500 ? "#bdcdb4" : "#dce5d5";
        ctx.lineWidth = n === 500 ? 2 : 1;
        ctx.moveTo(n, 0); ctx.lineTo(n, 1000);
        ctx.moveTo(0, n); ctx.lineTo(1000, n);
        ctx.stroke();
      }
      // TODO T01：读取 state.points，按顺序画线、画点并标注编号。
      // 阵营颜色：red -> #b94740，blue -> #346db5。
      // 每次完整重绘，方便撤销、清空及切换配色共用。
      void state;
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
