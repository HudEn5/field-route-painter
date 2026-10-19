/* A 维护共享接口；其他成员需要改变字段或接口时，先协商。 */
(function () {
  "use strict";
  const app = window.RoutePainter = window.RoutePainter || {};
  const listeners = new Set();
  let state = Object.freeze({ points: Object.freeze([]), team: "red", showCoordinates: true });
  app.store = {
    getState() { return state; },
    setState(patch) {
      const next = { ...state, ...patch };
      if (!Array.isArray(next.points) || !["red", "blue"].includes(next.team) || typeof next.showCoordinates !== "boolean") {
        throw new TypeError("共享状态格式不正确，请检查 README 接口约定。");
      }
      const points = next.points.map(({ x, y }) => {
        if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1000 || y < 0 || y > 1000) {
          throw new RangeError("路径点必须使用 0 到 1000 的逻辑坐标。");
        }
        return Object.freeze({ x, y });
      });
      state = Object.freeze({ points: Object.freeze(points), team: next.team, showCoordinates: next.showCoordinates });
      listeners.forEach((listener) => listener(state));
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  };
}());
