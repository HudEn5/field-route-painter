/* 拆分三次曲线使用 De Casteljau，保持原来的形状。 */
(function () {
  "use strict";
  const app = window.RoutePainter = window.RoutePainter || {};
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  function check(state, index) {
    if (!Number.isInteger(index) || index < 0 || index >= state.points.length) throw new RangeError("请先选中当前车的路径点。");
  }
  app.routeEdit = {
    insertAfter(state, index) {
      check(state, index);
      if (index === state.points.length - 1) throw new RangeError("请选择非末尾点；末尾新增可切回打点模式。");
      const start = state.points[index], end = state.points[index + 1], s = state.segments[index];
      let point = mid(start, end), split = [{ type: "line" }, { type: "line" }];
      if (s.type === "bezier") {
        const a = mid(start, s.c1), b = mid(s.c1, s.c2), c = mid(s.c2, end), d = mid(a, b), e = mid(b, c);
        point = mid(d, e);
        split = [{ type: "bezier", c1: a, c2: d }, { type: "bezier", c1: e, c2: c }];
      }
      const points = [...state.points], segments = [...state.segments];
      points.splice(index + 1, 0, point); segments.splice(index, 1, ...split);
      return { points, segments };
    },
    remove(state, index) {
      check(state, index);
      const points = [...state.points], segments = [...state.segments];
      points.splice(index, 1);
      if (index === 0) segments.shift();
      else if (index === state.points.length - 1) segments.pop();
      else segments.splice(index - 1, 2, { type: "line" });
      return { points, segments };
    },
    move(state, target, point) {
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 1000 || point.y < 0 || point.y > 1000) throw new RangeError("拖动位置须位于场地内。");
      if (target.kind === "point") {
        check(state, target.index);
        const points = [...state.points]; points[target.index] = point;
        return { points };
      }
      if (!["c1", "c2"].includes(target.kind) || state.segments[target.index]?.type !== "bezier") throw new RangeError("控制点已不存在。");
      const segments = [...state.segments]; segments[target.index] = { ...segments[target.index], [target.kind]: point };
      return { segments };
    },
    preview(state, patch) {
      const points = patch.points || state.points, segments = patch.segments || state.segments;
      return { ...state, points, segments, routes: { ...state.routes, [state.activeVehicle]: points }, segmentRoutes: { ...state.segmentRoutes, [state.activeVehicle]: segments } };
    }
  };
}());
