/* 三次贝塞尔几何。控制点、端点统一保存为全局逻辑坐标。 */
(function () {
  "use strict";
  const app = window.RoutePainter = window.RoutePainter || {};
  const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  function bezierPoint(start, c1, c2, end, t) {
    const u = 1 - t;
    return {
      x: u ** 3 * start.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t ** 3 * end.x,
      y: u ** 3 * start.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t ** 3 * end.y
    };
  }
  function bezierLength(start, c1, c2, end, depth = 0) {
    const chord = distance(start, end), polygon = distance(start, c1) + distance(c1, c2) + distance(c2, end);
    if (polygon - chord <= 0.01 || depth >= 14) return (polygon + chord) / 2;
    const a = midpoint(start, c1), b = midpoint(c1, c2), c = midpoint(c2, end);
    const d = midpoint(a, b), e = midpoint(b, c), m = midpoint(d, e);
    return bezierLength(start, a, d, m, depth + 1) + bezierLength(m, e, c, end, depth + 1);
  }
  function defaultControls(start, end) {
    return { c1: { x: start.x + (end.x - start.x) / 3, y: start.y + (end.y - start.y) / 3 }, c2: { x: start.x + (end.x - start.x) * 2 / 3, y: start.y + (end.y - start.y) * 2 / 3 } };
  }
  function makeSegments(state, index, type, controls) {
    if (!Number.isInteger(index) || index < 0 || index >= state.points.length - 1) throw new RangeError("请先建立至少两个路径点，并选择有效路线段。");
    if (!["line", "bezier"].includes(type)) throw new TypeError("请选择直线或三次贝塞尔曲线。");
    const segments = [...state.segments];
    const segment = { ...segments[index], type };
    if (type === "bezier") {
      const origin = state.coordinateMode === "relative" ? state.points[0] : { x: 0, y: 0 };
      for (const name of ["c1", "c2"]) {
        const input = controls?.[name];
        if (!input || !Number.isFinite(input.x) || !Number.isFinite(input.y)) throw new TypeError("请填写 C1、C2 的有效 X、Y 坐标。");
        const p = { x: origin.x + input.x / app.field.sizeMm * 1000, y: origin.y + input.y / app.field.sizeMm * 1000 };
        if (p.x < -1e-9 || p.x > 1000 + 1e-9 || p.y < -1e-9 || p.y > 1000 + 1e-9) throw new RangeError("控制点超出场地，请检查坐标系；本版控制点须位于场地内。");
        segment[name] = { x: Math.max(0, Math.min(1000, p.x)), y: Math.max(0, Math.min(1000, p.y)) };
      }
    }
    segments[index] = segment;
    return segments;
  }
  app.curves = {
    bezierPoint, bezierLength, defaultControls, makeSegments,
    trace(ctx, points, segments) {
      if (!points.length) return;
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const s = segments[i - 1];
        if (s?.type === "bezier") ctx.bezierCurveTo(s.c1.x, s.c1.y, s.c2.x, s.c2.y, points[i].x, points[i].y);
        else ctx.lineTo(points[i].x, points[i].y);
      }
    },
    routeLengthMeters(points, segments) {
      let length = 0;
      for (let i = 1; i < points.length; i++) {
        const s = segments[i - 1];
        length += s?.type === "bezier" ? bezierLength(points[i - 1], s.c1, s.c2, points[i]) : distance(points[i - 1], points[i]);
      }
      return length * app.field.sizeMm / 1000000;
    }
  };
}());
