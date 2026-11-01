/* 单段直线 / 三次贝塞尔曲线编辑。参数仅在点击应用后保存。 */
(function () {
  "use strict";
  const app = window.RoutePainter = window.RoutePainter || {};
  app.curveEditor = {
    init({ store }) {
      const form = document.getElementById("curve-editor");
      const segmentSelect = document.getElementById("curve-segment"), typeSelect = document.getElementById("curve-type");
      const controls = document.getElementById("curve-controls"), submit = document.getElementById("curve-submit");
      const basis = document.getElementById("curve-editor-basis"), hint = document.getElementById("curve-hint"), message = document.getElementById("curve-message");
      const startNote = document.getElementById("curve-start"), endNote = document.getElementById("curve-end");
      const startEdit = document.getElementById("curve-start-edit"), endEdit = document.getElementById("curve-end-edit");
      const showControls = document.getElementById("curve-show-controls");
      const inputs = ["curve-c1-x", "curve-c1-y", "curve-c2-x", "curve-c2-y"].map(id => document.getElementById(id));
      let originalValues = [];
      let previous = null;
      function fillControls(state) {
        const i = state.selectedSegment, exists = i !== null;
        const curved = typeSelect.value === "bezier";
        controls.hidden = !curved; controls.disabled = !exists || !curved;
        if (exists) {
          const segment = state.segments[i];
          const controlPoints = segment.c1 ? segment : app.curves.defaultControls(state.points[i], state.points[i + 1]);
          const c1 = app.coordinates.toDisplayPoint(controlPoints.c1, state), c2 = app.coordinates.toDisplayPoint(controlPoints.c2, state);
          [c1.x, c1.y, c2.x, c2.y].forEach((n, index) => { inputs[index].value = String(Number(n.toFixed(6))); });
        } else inputs.forEach(input => { input.value = ""; });
        originalValues = inputs.map(input => input.value);
        hint.textContent = !exists ? "先输入或点击建立起点、终点，再选择路线段。"
          : curved ? "C1、C2 引导曲线形状，路线不必经过控制点。本版控制点须在场地内；默认值共线，可调整坐标使其弯曲。"
          : "默认使用直线。选择三次贝塞尔曲线并填写两个控制点，再点击应用；切回直线会保留已保存的控制点。";
      }
      function refresh(state) {
        const i = state.selectedSegment;
        showControls.checked = state.showControlPoints;
        // 配色、辅助线显隐等纯显示操作不清掉尚未应用的控制点输入。
        if (previous && previous.vehicle === state.activeVehicle && previous.mode === state.coordinateMode && previous.index === i
          && previous.segment === state.segments[i] && previous.start === state.points[i] && previous.end === state.points[i + 1]) return;
        previous = { vehicle: state.activeVehicle, mode: state.coordinateMode, index: i, segment: state.segments[i], start: state.points[i], end: state.points[i + 1] };
        const options = document.createDocumentFragment();
        state.segments.forEach((segment, i) => {
          const option = document.createElement("option"); option.value = String(i);
          option.textContent = `第 ${i + 1} 段：点 ${i + 1} → ${i + 2} · ${segment.type === "bezier" ? "曲线" : "直线"}`;
          options.appendChild(option);
        });
        const exists = state.selectedSegment !== null;
        if (!exists) {
          const option = document.createElement("option"); option.textContent = "至少需要两个路径点"; option.value = ""; options.appendChild(option);
        }
        segmentSelect.replaceChildren(options); segmentSelect.value = exists ? String(state.selectedSegment) : "";
        segmentSelect.disabled = typeSelect.disabled = submit.disabled = startEdit.disabled = endEdit.disabled = !exists;
        typeSelect.value = exists ? state.segments[state.selectedSegment].type : "line";
        basis.textContent = `${state.activeVehicle}号车 · ${state.coordinateMode === "relative" ? "相对首点坐标" : "全局坐标"} · 单位 mm`;
        const describe = index => {
          const p = app.coordinates.toDisplayPoint(state.points[index], state);
          return `点 ${index + 1}：(${Math.round(p.x)}, ${Math.round(p.y)}) mm`;
        };
        startNote.textContent = exists ? `起点 ${describe(state.selectedSegment)}` : "尚无路线段";
        endNote.textContent = exists ? `终点 ${describe(state.selectedSegment + 1)}` : "";
        fillControls(state); message.textContent = "";
      }
      segmentSelect.addEventListener("change", () => store.setState({ selectedSegment: Number(segmentSelect.value) }));
      typeSelect.addEventListener("change", () => { fillControls(store.getState()); message.textContent = ""; });
      showControls.addEventListener("change", () => store.setState({ showControlPoints: showControls.checked }));
      startEdit.addEventListener("click", () => app.pointEditor.edit(store.getState().selectedSegment));
      endEdit.addEventListener("click", () => app.pointEditor.edit(store.getState().selectedSegment + 1));
      form.addEventListener("submit", event => {
        event.preventDefault();
        try {
          const state = store.getState(), i = state.selectedSegment, type = typeSelect.value;
          if (i === null) throw new RangeError("请先建立至少两个路径点。");
          if (type === "bezier" && inputs.some(input => input.value.trim() === "")) throw new TypeError("请填写两个控制点的四个坐标值。");
          if (state.segments[i].type === type && (type === "line" || inputs.every((input, index) => input.value === originalValues[index]))) {
            message.className = "editor-message"; message.textContent = "本段设置未改变。"; return;
          }
          const values = inputs.map(input => Number(input.value));
          const segments = app.curves.makeSegments(state, i, type, { c1: { x: values[0], y: values[1] }, c2: { x: values[2], y: values[3] } });
          store.setState({ segments });
          message.className = "editor-message"; message.textContent = `已将${state.activeVehicle}号车第 ${i + 1} 段设为${type === "bezier" ? "贝塞尔曲线" : "直线"}。`;
        } catch (error) { message.className = "editor-message error"; message.textContent = error.message; }
      });
      refresh(store.getState()); store.subscribe(refresh);
    }
  };
}());
