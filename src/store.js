/* A 维护共享接口；其他成员需要改变字段或接口时，先协商。 */
(function () {
  "use strict";
  const app = window.RoutePainter = window.RoutePainter || {};
  const listeners = new Set();
  const initialRoutes = Object.freeze({ "1": Object.freeze([]), "2": Object.freeze([]) });
  let state = Object.freeze({ routes: initialRoutes, activeVehicle: "1", points: initialRoutes["1"], team: "red", showCoordinates: true, coordinateMode: "global" });
  app.store = {
    getState() { return state; },
    setState(patch) {
      const next = { ...state, ...patch };
      if (!["1", "2"].includes(next.activeVehicle) || !["red", "blue"].includes(next.team) || typeof next.showCoordinates !== "boolean" || !["global", "relative"].includes(next.coordinateMode)) {
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
      state = Object.freeze({ routes: Object.freeze(routes), activeVehicle: next.activeVehicle, points: routes[next.activeVehicle], team: next.team, showCoordinates: next.showCoordinates, coordinateMode: next.coordinateMode });
      listeners.forEach((listener) => listener(state));
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  };
}());
