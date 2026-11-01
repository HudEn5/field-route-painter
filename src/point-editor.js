/* 坐标输入先转换并校验，再一次性更新当前车路线。 */
(function () {
  "use strict";
  const app = window.RoutePainter = window.RoutePainter || {};
  function makePoints(state, input, index = null) {
    if (!Number.isFinite(input.x) || !Number.isFinite(input.y)) throw new TypeError("请输入有效的 X、Y 数值。");
    if (index !== null && (!Number.isInteger(index) || index < 0 || index >= state.points.length)) throw new RangeError("请选择仍然存在的路径点。");
    const relative = state.coordinateMode === "relative";
    if (relative && !state.points.length) throw new RangeError("尚无相对原点，请先用全局坐标输入首点，或点击场地建立首点。");
    if (relative && index === 0) throw new RangeError("首点是相对坐标原点，请切换到全局坐标修改它的位置。");
    const origin = relative ? state.points[0] : { x: 0, y: 0 };
    const point = { x: origin.x + input.x / app.field.sizeMm * 1000, y: origin.y + input.y / app.field.sizeMm * 1000 };
    const epsilon = 1e-9;
    if (point.x < -epsilon || point.x > 1000 + epsilon || point.y < -epsilon || point.y > 1000 + epsilon) {
      throw new RangeError(`坐标超出场地；换算后的全局 X、Y 均须在 0～${app.field.sizeMm} mm 内。`);
    }
    point.x = Math.max(0, Math.min(1000, point.x));
    point.y = Math.max(0, Math.min(1000, point.y));
    const points = [...state.points];
    if (index === null) points.push(point); else points[index] = point;
    return points;
  }
  let editPoint = null;
  app.pointEditor = {
    makePoints,
    edit(index) { if (editPoint) editPoint(index); },
    init({ store }) {
      const form = document.getElementById("point-editor");
      const target = document.getElementById("point-target");
      const xInput = document.getElementById("point-x"), yInput = document.getElementById("point-y");
      const basis = document.getElementById("point-editor-basis"), hint = document.getElementById("point-editor-hint");
      const submit = document.getElementById("point-submit"), globalButton = document.getElementById("point-use-global");
      const message = document.getElementById("point-editor-message");
      let previous = null, original = null;
      function refresh(state) {
        const contextChanged = previous && (previous.activeVehicle !== state.activeVehicle || previous.coordinateMode !== state.coordinateMode);
        let selection = contextChanged && previous.activeVehicle !== state.activeVehicle ? "new" : target.value;
        const selectionInvalid = selection !== "new" && (!selection || Number(selection) >= state.points.length);
        if (selectionInvalid) selection = "new";
        const options = document.createDocumentFragment();
        for (let i = -1; i < state.points.length; i++) {
          const option = document.createElement("option");
          option.value = i < 0 ? "new" : String(i);
          option.textContent = i < 0 ? "添加新点（末尾）" : `修改第 ${i + 1} 点`;
          options.appendChild(option);
        }
        target.replaceChildren(options); target.value = selection;
        const index = selection === "new" ? null : Number(selection);
        const relative = state.coordinateMode === "relative";
        const locked = relative && (!state.points.length || index === 0);
        basis.textContent = `${state.activeVehicle}号车 · ${relative ? "相对首点坐标" : "全局坐标"} · 单位 mm`;
        submit.textContent = index === null ? "添加路径点" : "保存坐标";
        xInput.disabled = yInput.disabled = submit.disabled = locked;
        globalButton.hidden = !locked;
        hint.textContent = locked
          ? index === 0 ? "首点固定为相对原点 (0, 0)。如需移动它，请改用全局坐标。" : "还没有相对原点，请用全局坐标输入首点，或直接点击场地。"
          : relative ? "输入相对当前车首点的 X、Y，可为负数。" : `X、Y 范围为 0～${app.field.sizeMm} mm。${index === 0 ? "移动首点后，相对原点随之更新，其余点不移动。" : ""}`;
        if (index !== null) {
          const value = app.coordinates.toDisplayPoint(state.points[index], state);
          xInput.value = String(Number(value.x.toFixed(6))); yInput.value = String(Number(value.y.toFixed(6)));
          original = { x: xInput.value, y: yInput.value };
        } else {
          original = null;
          if (contextChanged || !previous || locked || selectionInvalid) { xInput.value = ""; yInput.value = ""; }
        }
        message.textContent = "";
        previous = state;
      }
      target.addEventListener("change", () => {
        if (target.value === "new") { xInput.value = ""; yInput.value = ""; }
        refresh(store.getState());
      });
      globalButton.addEventListener("click", () => store.setState({ coordinateMode: "global" }));
      editPoint = index => {
        target.value = String(index); refresh(store.getState()); xInput.focus();
      };
      form.addEventListener("submit", event => {
        event.preventDefault();
        try {
          if (xInput.value.trim() === "" || yInput.value.trim() === "") throw new TypeError("请填写 X 和 Y 坐标。");
          const state = store.getState();
          const index = target.value === "new" ? null : Number(target.value);
          if (index !== null && original && original.x === xInput.value && original.y === yInput.value) {
            message.className = "editor-message"; message.textContent = "坐标未改变。"; return;
          }
          const points = makePoints(state, { x: Number(xInput.value), y: Number(yInput.value) }, index);
          store.setState({ points });
          if (index === null) { xInput.value = ""; yInput.value = ""; }
          message.className = "editor-message";
          message.textContent = index === null ? `已为${state.activeVehicle}号车添加第 ${points.length} 点。` : `已更新${state.activeVehicle}号车第 ${index + 1} 点。`;
        } catch (error) {
          message.className = "editor-message error"; message.textContent = error.message;
        }
      });
      refresh(store.getState()); store.subscribe(refresh);
    }
  };
}());
