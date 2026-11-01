/* VEX U 对抗赛示意：手册 2.1 版图 VEXU-1，内部位置按图估计。 */
(function () {
  "use strict";
  const app = window.RoutePainter = window.RoutePainter || {};
  const sizeMm = 3657.6, tile = 1000 / 6;
  const red = "#df4356", blue = "#27b5e0", yellow = "#f1d35e";
  function circle(ctx, x, y, radius, fill, stroke) {
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }
  function line(ctx, points, color, width) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  }
  function goal(ctx, x, y, color, loaded) {
    ctx.save(); ctx.translate(x, y);
    ctx.shadowColor = "#10191b70"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 5;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + i * Math.PI / 4;
      const px = Math.cos(a) * 21, py = Math.sin(a) * 21;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    ctx.shadowColor = "transparent"; ctx.lineWidth = 3;
    ctx.strokeStyle = color === "#263236" ? "#4b595d" : "#ffffff50"; ctx.stroke();
    circle(ctx, 0, 0, 10, "#1d292b", "#ffffff35");
    if (loaded) circle(ctx, 0, 0, 8, yellow, "#f8edb5");
    ctx.restore();
  }
  function pin(ctx, x, y, color) {
    circle(ctx, x + 1, y + 3, 11, "#17232665");
    circle(ctx, x, y, 9, color, "#ffffff65");
    circle(ctx, x - 2, y - 2, 3, "#ffffff65");
  }
  function horizontalPins(ctx, x, y) {
    ctx.save(); ctx.translate(x, y);
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.rotate(i * Math.PI / 2);
      ctx.fillStyle = "#404d50"; ctx.fillRect(-7, 4, 14, 43);
      ctx.beginPath(); ctx.moveTo(-5, 13); ctx.lineTo(5, 13);
      ctx.lineTo(10, 42); ctx.lineTo(-10, 42); ctx.closePath();
      ctx.fillStyle = i < 2 ? red : blue; ctx.fill();
      ctx.fillStyle = yellow; ctx.fillRect(-6, 12, 12, 11);
      ctx.restore();
    }
    circle(ctx, 0, 0, 12, "#d6d6b5", "#263236");
    circle(ctx, 0, 0, 5, "#79898a"); ctx.restore();
  }
  app.field = Object.freeze({
    sizeMm,
    toMillimeters(value) { return value * sizeMm / 1000; },
    routeLengthMeters(points) {
      let distance = 0;
      for (let i = 1; i < points.length; i++) {
        distance += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      }
      return distance * sizeMm / 1000000;
    },
    draw(ctx) {
      ctx.save();
      // 场外联队站位区不纳入可打点的场地范围。
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 6; col++) {
          ctx.fillStyle = (row + col) % 2 ? "#7d8587" : "#757d80";
          ctx.fillRect(col * tile, row * tile, tile, tile);
        }
      }
      for (let n = 1; n < 6; n++) {
        line(ctx, [[n * tile, 0], [n * tile, 1000]], "#c3ccca24", 1.5);
        line(ctx, [[0, n * tile], [1000, n * tile]], "#c3ccca24", 1.5);
      }
      ctx.fillStyle = "#d3dfd318"; ctx.beginPath();
      ctx.moveTo(500, tile * 2); ctx.lineTo(tile * 4, 500);
      ctx.lineTo(500, tile * 4); ctx.lineTo(tile * 2, 500); ctx.closePath(); ctx.fill();
      // 分区胶带、中场菱形和自动时段分界双线。
      const inner = 1000 * 5 / 12, outer = 1000 * 7 / 12;
      line(ctx, [[85, 915], [inner, outer]], "#e8eeeb", 5);
      line(ctx, [[outer, inner], [915, 85]], "#e8eeeb", 5);
      for (const offset of [-5, 5]) {
        line(ctx, [[85 + offset, 85], [inner + offset, inner]], "#e8eeeb", 4);
        line(ctx, [[outer + offset, outer], [915 + offset, 915]], "#e8eeeb", 4);
      }
      line(ctx, [[500, tile * 2], [tile * 4, 500], [500, tile * 4], [tile * 2, 500], [500, tile * 2]], "#f3f5ee", 5);
      for (const right of [false, true]) {
        const x = right ? 915 : 85, edge = right ? 1000 : 0;
        line(ctx, [[x, 0], [x, tile], [edge, tile]], right ? blue : red, 5);
        line(ctx, [[x, 1000], [x, tile * 5], [edge, tile * 5]], right ? blue : red, 5);
      }
      // 九个得分座：仅中场得分座预放黄/黄锥。
      for (const [x, y] of [[2, 1], [1, 2], [5, 4], [4, 5]]) goal(ctx, x * tile, y * tile, "#263236", false);
      for (const [x, y] of [[1, 4], [2, 5]]) goal(ctx, x * tile, y * tile, red, false);
      for (const [x, y] of [[4, 1], [5, 2]]) goal(ctx, x * tile, y * tile, blue, false);
      goal(ctx, 500, 500, "#263236", true);
      for (const n of [1, 2, 4, 5]) horizontalPins(ctx, n * tile, n * tile);
      for (const [x, y, color] of [
        [5, 1, yellow], [4, 2, yellow], [2, 4, yellow], [1, 5, yellow],
        [3, 2, blue], [4, 3, blue], [2, 3, red], [3, 4, red]
      ]) pin(ctx, x * tile, y * tile, color);
      for (const n of [2, 4]) {
        for (const [x, y, vertical] of [[n * tile, 20, false], [n * tile, 980, false], [20, n * tile, true], [980, n * tile, true]]) {
          circle(ctx, x + (vertical ? 0 : -23), y + (vertical ? -23 : 0), 12, "#344044", "#a4ada9");
          circle(ctx, x + (vertical ? 0 : 23), y + (vertical ? 23 : 0), 12, "#344044", "#a4ada9");
          pin(ctx, x, y, yellow);
        }
      }
      // 四角导入桶的俯视轮廓，不作碰撞判断。
      for (const right of [false, true]) {
        for (const y of [65, 935]) {
          const x = right ? 990 : 10;
          ctx.fillStyle = "#203033"; ctx.fillRect(x - 10, y - 17, 20, 34);
          ctx.strokeStyle = right ? blue : red; ctx.lineWidth = 3;
          ctx.strokeRect(x - 10, y - 17, 20, 34);
        }
      }
      // 三色筒位于四边中点。图 VEXU-1 起始为中立黄色面；长度见术语表第 121 页。
      const rollerLength = 656.2 / sizeMm * 1000;
      for (const [x, y, angle] of [[500, 8, 0], [500, 992, 0], [8, 500, Math.PI / 2], [992, 500, Math.PI / 2]]) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
        ctx.fillStyle = "#263236"; ctx.fillRect(-rollerLength / 2 - 6, -8, rollerLength + 12, 16);
        ctx.fillStyle = yellow; ctx.fillRect(-rollerLength / 2, -6, rollerLength, 12);
        line(ctx, [[-rollerLength / 2, -4], [rollerLength / 2, -4]], "#fff5be", 2);
        ctx.restore();
      }
      ctx.font = "500 16px system-ui, sans-serif"; ctx.textAlign = "center";
      ctx.fillStyle = "#eaf0eab0"; ctx.fillText("中场", 500, 559); ctx.restore();
    }
  });
}());
