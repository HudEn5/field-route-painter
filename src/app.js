/* A 维护启动顺序及公共 DOM 接口。各功能通过 context 接入。 */
(function () {
  "use strict";
  const app = window.RoutePainter;
  const elements = {
    canvas: document.getElementById("route-canvas"),
    undoButton: document.getElementById("undo-button"),
    deleteLastButton: document.getElementById("delete-last-button"),
    clearButton: document.getElementById("clear-button"),
    teamSelect: document.getElementById("team-select"),
    vehicleSelect: document.getElementById("vehicle-select"),
    coordinateModeSelect: document.getElementById("coordinate-mode"),
    coordinateOrigin: document.getElementById("coordinate-origin"),
    coordinateModeNote: document.getElementById("coordinate-mode-note"),
    fieldRuler: document.getElementById("field-ruler"),
    coordinatesToggle: document.getElementById("coordinates-toggle"),
    pointerCoordinates: document.getElementById("pointer-coordinates"),
    coordinateList: document.getElementById("coordinate-list"),
    coordinatesEmpty: document.getElementById("coordinates-empty")
  };
  const context = { store: app.store, renderer: app.renderer, elements };
  app.showEditor = panel => {
    const curves = panel === "curves";
    document.getElementById("point-panel").hidden = curves;
    document.getElementById("curve-panel").hidden = !curves;
    document.getElementById("point-panel-button").setAttribute("aria-pressed", String(!curves));
    document.getElementById("curve-panel-button").setAttribute("aria-pressed", String(curves));
  };
  document.getElementById("point-panel-button").addEventListener("click", () => app.showEditor("points"));
  document.getElementById("curve-panel-button").addEventListener("click", () => app.showEditor("curves"));
  const render = (state) => {
    document.body.dataset.team = state.team;
    document.getElementById("route-heading").textContent = `${state.activeVehicle}号车路线`;
    document.getElementById("vehicle-1-count").textContent = String(state.routes["1"].length);
    document.getElementById("vehicle-2-count").textContent = String(state.routes["2"].length);
    document.getElementById("point-count").textContent = String(state.points.length);
    document.getElementById("route-length").textContent = app.curves.routeLengthMeters(state.points, state.segments).toFixed(2);
    app.renderer.draw(state);
  };
  try {
    app.sharing.restore();
    app.renderer.init(elements.canvas);
    app.store.subscribe(render);
    render(app.store.getState());
    app.interactions.init(context);
    app.controls.init(context);
    app.coordinates.init(context);
    app.pointEditor.init(context);
    app.curveEditor.init(context);
    app.sharing.init(context);
    app.library.init(context);
    document.getElementById("app-status").textContent = "VEX U 场地已就绪 · 点击场地规划路线";
  } catch (error) {
    document.getElementById("app-status").textContent = "初始化失败：" + error.message;
    console.error(error);
  }
}());
