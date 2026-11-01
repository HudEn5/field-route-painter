/* A 维护共享接口；其他成员需要改变字段或接口时，先协商。 */
(function () {
  "use strict";
  const app = window.RoutePainter = window.RoutePainter || {};
  const listeners = new Set();
  const initialRoutes = Object.freeze({ "1": Object.freeze([]), "2": Object.freeze([]) });
  const initialSegments = Object.freeze({ "1": Object.freeze([]), "2": Object.freeze([]) });
  const initialState = Object.freeze({ routes: initialRoutes, activeVehicle: "1", points: initialRoutes["1"], segmentRoutes: initialSegments, segments: initialSegments["1"], selectedSegment: null, showControlPoints: false, team: "red", showCoordinates: true, coordinateMode: "global" });
  let state = initialState;
  const history = [];
  const samePoint = (a, b) => a === b || Boolean(a && b && a.x === b.x && a.y === b.y);
  function sameGeometry(a, b) {
    return ["1", "2"].every(id => {
      const x = a.routes[id], y = b.routes[id], s = a.segmentRoutes[id], t = b.segmentRoutes[id];
      return x.length === y.length && s.length === t.length && x.every((p, i) => samePoint(p, y[i]))
        && s.every((p, i) => p.type === t[i].type && samePoint(p.c1, t[i].c1) && samePoint(p.c2, t[i].c2));
    });
  }
  function commit(candidate, { recordHistory = true, restoreView = false } = {}) {
    const changed = !sameGeometry(state, candidate) || (restoreView && ["activeVehicle", "team", "coordinateMode", "showCoordinates", "showControlPoints", "selectedSegment"].some(key => state[key] !== candidate[key]));
    if (!recordHistory) history.length = 0;
    else if (changed) {
      history.push({ state, vehicle: candidate.activeVehicle, restoreView });
      if (history.length > 100) history.shift();
    }
    state = candidate;
    listeners.forEach(listener => listener(state));
  }
  function deriveState(state, patch) {
    const next = { ...state, ...patch };
    if (!["1", "2"].includes(next.activeVehicle) || !["red", "blue"].includes(next.team) || typeof next.showCoordinates !== "boolean" || typeof next.showControlPoints !== "boolean" || !["global", "relative"].includes(next.coordinateMode)) {
      throw new TypeError("共享状态格式不正确，请检查 README 接口约定。");
    }
    const routes = { ...state.routes };
    // points 始终代表当前车，兼容原有打点、撤销和清空接口。
    if (Object.hasOwn(patch, "points")) {
      if (!Array.isArray(patch.points)) throw new TypeError("路径点必须是数组。");
      const points = patch.points.map(({ x, y }) => {
        if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1000 || y < 0 || y > 1000) {
          throw new RangeError("路径点必须使用 0 到 1000 的逻辑坐标。");
        }
        return Object.freeze({ x, y });
      });
      routes[next.activeVehicle] = Object.freeze(points);
    }
    const segmentRoutes = { ...state.segmentRoutes };
    const count = Math.max(0, routes[next.activeVehicle].length - 1);
    let segments = [...segmentRoutes[next.activeVehicle].slice(0, count)];
    while (segments.length < count) segments.push(Object.freeze({ type: "line" }));
    if (Object.hasOwn(patch, "segments")) {
      if (!Array.isArray(patch.segments) || patch.segments.length !== count) throw new TypeError("路线段数量必须等于路径点数减一。");
      segments = patch.segments.map(segment => {
        if (!segment || !["line", "bezier"].includes(segment.type)) throw new TypeError("路线段类型必须为直线或贝塞尔曲线。");
        const result = { type: segment.type };
        if (segment.type === "bezier" || segment.c1 || segment.c2) {
          for (const name of ["c1", "c2"]) {
            const p = segment[name];
            if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.x > 1000 || p.y < 0 || p.y > 1000) throw new RangeError("两个控制点均须位于场地内。");
            result[name] = Object.freeze({ x: p.x, y: p.y });
          }
        }
        return Object.freeze(result);
      });
    }
    segmentRoutes[next.activeVehicle] = Object.freeze(segments);
    let selectedSegment = state.activeVehicle === next.activeVehicle ? state.selectedSegment : 0;
    if (Object.hasOwn(patch, "selectedSegment")) {
      if (!Number.isInteger(patch.selectedSegment) || patch.selectedSegment < 0 || patch.selectedSegment >= count) throw new RangeError("请选择有效的路线段。");
      selectedSegment = patch.selectedSegment;
    }
    selectedSegment = count ? Math.min(Math.max(0, selectedSegment ?? 0), count - 1) : null;
    return Object.freeze({ routes: Object.freeze(routes), activeVehicle: next.activeVehicle, points: routes[next.activeVehicle], segmentRoutes: Object.freeze(segmentRoutes), segments: segmentRoutes[next.activeVehicle], selectedSegment, showControlPoints: next.showControlPoints, team: next.team, showCoordinates: next.showCoordinates, coordinateMode: next.coordinateMode });
  }
  app.store = {
    getState() { return state; },
    canUndo() { return history.length > 0; },
    setState(patch) {
      commit(deriveState(state, patch));
    },
    replacePlan(plan, { recordHistory = true } = {}) {
      // 先构造完整候选状态，全部通过后仅发布一次，避免部分导入。
      let candidate = initialState;
      for (const id of ["1", "2"]) {
        candidate = deriveState(candidate, { activeVehicle: id, points: plan.vehicles[id].points, segments: plan.vehicles[id].segments });
      }
      const { selectedSegment, ...settings } = plan.view;
      candidate = deriveState(candidate, { ...settings, ...(selectedSegment === null ? {} : { selectedSegment }) });
      commit(candidate, { recordHistory, restoreView: true });
    },
    undo() {
      if (!history.length) return false;
      const previous = history.pop();
      const current = state;
      state = deriveState(previous.state, previous.restoreView
        ? { showControlPoints: current.showControlPoints }
        : { activeVehicle: previous.vehicle, team: current.team, coordinateMode: current.coordinateMode, showCoordinates: current.showCoordinates, showControlPoints: current.showControlPoints });
      listeners.forEach(listener => listener(state));
      return true;
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  };
}());
