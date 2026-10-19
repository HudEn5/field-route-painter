/* A 维护启动顺序及公共 DOM 接口。各功能通过 context 接入。 */
(function () {
  "use strict";
  const app = window.RoutePainter;
  const elements = {
    canvas: document.getElementById("route-canvas"),
    undoButton: document.getElementById("undo-button"),
    clearButton: document.getElementById("clear-button"),
    teamSelect: document.getElementById("team-select"),
    coordinatesToggle: document.getElementById("coordinates-toggle"),
    pointerCoordinates: document.getElementById("pointer-coordinates"),
    coordinateList: document.getElementById("coordinate-list"),
    coordinatesEmpty: document.getElementById("coordinates-empty")
  };
  const context = { store: app.store, renderer: app.renderer, elements };
  const render = (state) => {
    document.body.dataset.team = state.team;
    document.getElementById("point-count").textContent = String(state.points.length);
    app.renderer.draw(state);
  };
  try {
    app.renderer.init(elements.canvas);
    app.store.subscribe(render);
    render(app.store.getState());
    app.interactions.init(context);
    app.controls.init(context);
    app.coordinates.init(context);
    document.getElementById("app-status").textContent = "框架初始化完成 · 打点、工具栏操作与坐标显示待实现";
  } catch (error) {
    document.getElementById("app-status").textContent = "初始化失败：" + error.message;
    console.error(error);
  }
}());
