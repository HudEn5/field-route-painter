/* 坐标系切换只影响显示。所有路线仍保存全局逻辑坐标。 */
(function () {
  "use strict";
  const app = window.RoutePainter = window.RoutePainter || {};
  function toDisplayPoint(point, state) {
    const origin = state.coordinateMode === "relative" ? state.points[0] : { x: 0, y: 0 };
    if (!origin) return null;
    return { x: app.field.toMillimeters(point.x - origin.x), y: app.field.toMillimeters(point.y - origin.y) };
  }
  app.coordinates = {
    toDisplayPoint,
    init(context) {
      const { store, renderer, elements } = context;
      const { teamSelect, vehicleSelect, coordinateModeSelect, coordinateOrigin,
        coordinateModeNote, fieldRuler, coordinatesToggle, pointerCoordinates,
        coordinateList, coordinatesEmpty, canvas } = elements;
      let pointer = null;
      for (const element of [teamSelect, vehicleSelect, coordinateModeSelect, coordinatesToggle]) element.disabled = false;
      teamSelect.addEventListener("change", e => store.setState({ team: e.target.value }));
      vehicleSelect.addEventListener("change", e => store.setState({ activeVehicle: e.target.value }));
      coordinateModeSelect.addEventListener("change", e => store.setState({ coordinateMode: e.target.value }));
      coordinatesToggle.addEventListener("change", e => store.setState({ showCoordinates: e.target.checked }));

      function updatePointer(state) {
        if (state.coordinateMode === "relative" && state.points.length === 0) {
          pointerCoordinates.textContent = `先为${state.activeVehicle}号车添加首点以建立原点`;
          return;
        }
        const point = pointer && toDisplayPoint(pointer, state);
        pointerCoordinates.textContent = point
          ? `X: ${Math.round(point.x)} · Y: ${Math.round(point.y)} mm`
          : "移入场地查看毫米坐标";
      }
      canvas.addEventListener("mousemove", e => {
        pointer = renderer.canvasToPoint(e);
        updatePointer(store.getState());
      });
      canvas.addEventListener("mouseleave", () => {
        pointer = null;
        updatePointer(store.getState());
      });
      function updateUI(state) {
        teamSelect.value = state.team;
        vehicleSelect.value = state.activeVehicle;
        coordinateModeSelect.value = state.coordinateMode;
        coordinatesToggle.checked = state.showCoordinates;
        const relative = state.coordinateMode === "relative";
        const origin = state.points[0];
        coordinateModeNote.textContent = relative
          ? `${state.activeVehicle}号车相对首点坐标 · 单位 mm${origin ? "" : " · 等待首点"}`
          : "全局坐标 · 单位 mm";
        Array.from(fieldRuler.children).forEach((label, i) => {
          const x = relative && !origin ? null : app.field.toMillimeters(i * 1000 / 6 - (relative ? origin.x : 0)) / 1000;
          label.textContent = x === null ? "—" : `${Number(x.toFixed(2)).toFixed(2)}${i === 6 ? " m" : ""}`;
        });
        coordinateOrigin.textContent = relative
          ? origin
            ? `${state.activeVehicle}号车原点：首点 (0, 0) · 全局位置 (${Math.round(app.field.toMillimeters(origin.x))}, ${Math.round(app.field.toMillimeters(origin.y))}) mm · X 向右 · Y 向下`
            : `${state.activeVehicle}号车尚未建立原点 · 点击场地添加首点`
          : "全局原点：场地左上角 · X 向右 · Y 向下";
        coordinateOrigin.hidden = !state.showCoordinates;
        pointerCoordinates.hidden = !state.showCoordinates;
        coordinateList.hidden = !state.showCoordinates;
        coordinatesEmpty.hidden = !state.showCoordinates || state.points.length > 0;
        coordinatesEmpty.textContent = `${state.activeVehicle}号车暂无路径点，请点击场地添加${relative ? "并建立原点" : ""}。`;
        updatePointer(state);
        const fragment = document.createDocumentFragment();
        if (state.showCoordinates) {
          state.points.forEach(p => {
            const point = toDisplayPoint(p, state);
            const li = document.createElement("li");
            li.textContent = `(${Math.round(point.x)}, ${Math.round(point.y)}) mm`;
            fragment.appendChild(li);
          });
        }
        coordinateList.replaceChildren(fragment);
      }
      updateUI(store.getState());
      store.subscribe(updateUI);
    }
  };
}());
