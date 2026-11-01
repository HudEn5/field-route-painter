/* 拖动仅预览，松开后提交一次，撤销一步恢复。 */
(function () {
  "use strict";
  const app = window.RoutePainter = window.RoutePainter || {};
  let selection = null;
  app.interactions = {
    drawOverlay(ctx, state) {
      if (!selection || selection.vehicle !== state.activeVehicle) return;
      const p = selection.kind === "point" ? state.points[selection.index] : state.segments[selection.index]?.[selection.kind];
      if (!p) return;
      ctx.save(); ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffd65a"; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    },
    init({ elements: { canvas }, store, renderer }) {
      const mode = document.getElementById("edit-mode"), insert = document.getElementById("insert-point"), remove = document.getElementById("remove-point");
      const note = document.getElementById("edit-selection"), status = document.getElementById("app-status");
      let gesture = null, ownChange = false, previous = store.getState();
      const announce = text => { status.textContent = text; };
      function refresh() {
        const state = store.getState(), point = selection?.kind === "point" && selection.vehicle === state.activeVehicle && selection.index < state.points.length;
        insert.disabled = !point || selection.index === state.points.length - 1;
        remove.disabled = !point;
        note.textContent = mode.value === "draw" ? "打点模式：点击场地在末尾添加点。"
          : point ? `已选中${state.activeVehicle}号车第 ${selection.index + 1} 点，可拖动、插入或删除。`
          : selection ? "已选中曲线控制点，可拖动调整。" : "编辑模式：点击或拖动当前车的点；勾选控制点后可拖动 C1/C2。";
        canvas.dataset.mode = mode.value;
      }
      function cancel() {
        const old = gesture; gesture = null;
        if (old && canvas.hasPointerCapture(old.id)) canvas.releasePointerCapture(old.id);
        renderer.draw(store.getState());
      }
      function apply(patch, nextSelection, message) {
        const old = selection;
        selection = nextSelection; ownChange = true;
        try {
          store.setState(patch); announce(message);
          if (nextSelection?.kind === "point") app.pointEditor?.edit(nextSelection.index, { focus: false });
        }
        catch (error) { selection = old; announce(error.message); }
        finally { ownChange = false; refresh(); renderer.draw(store.getState()); }
      }
      mode.addEventListener("change", () => { cancel(); selection = null; refresh(); renderer.draw(store.getState()); });
      canvas.addEventListener("click", event => {
        if (mode.value !== "draw") return;
        apply({ points: [...store.getState().points, renderer.canvasToPoint(event)] }, null, "已添加路径点。");
      });
      function hit(event, state) {
        const p = renderer.canvasToPoint(event), rect = canvas.getBoundingClientRect();
        const near = q => Math.hypot((q.x - p.x) * rect.width / 1000, (q.y - p.y) * rect.height / 1000) <= 12;
        const i = state.selectedSegment, segment = state.segments[i];
        if (state.showControlPoints && segment?.type === "bezier") {
          for (const kind of ["c1", "c2"]) if (near(segment[kind])) return { kind, index: i, vehicle: state.activeVehicle };
        }
        let closest = null, distance = Infinity;
        state.points.forEach((q, index) => { const d = Math.hypot(q.x - p.x, q.y - p.y); if (near(q) && d < distance) { distance = d; closest = { kind: "point", index, vehicle: state.activeVehicle }; } });
        return closest;
      }
      canvas.addEventListener("pointerdown", event => {
        if (mode.value !== "edit" || event.button !== 0 || gesture) return;
        event.preventDefault(); canvas.focus({ preventScroll: true });
        const state = store.getState(); selection = hit(event, state); refresh(); renderer.draw(state);
        if (!selection) return;
        gesture = { id: event.pointerId, state, target: selection, x: event.clientX, y: event.clientY, patch: null };
        canvas.setPointerCapture(event.pointerId);
      });
      canvas.addEventListener("pointermove", event => {
        if (!gesture || event.pointerId !== gesture.id) return;
        if (!gesture.patch && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < 3) return;
        gesture.patch = app.routeEdit.move(gesture.state, gesture.target, renderer.canvasToPoint(event));
        renderer.draw(app.routeEdit.preview(gesture.state, gesture.patch));
      });
      canvas.addEventListener("pointerup", event => {
        if (!gesture || gesture.id !== event.pointerId) return;
        const finished = gesture; gesture = null;
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
        if (finished.patch) apply(app.routeEdit.move(finished.state, finished.target, renderer.canvasToPoint(event)), finished.target, "已保存拖动位置，可撤销上一步。");
        else {
          renderer.draw(store.getState());
          if (finished.target.kind === "point") app.pointEditor?.edit(finished.target.index, { focus: false });
        }
      });
      canvas.addEventListener("pointercancel", cancel);
      canvas.addEventListener("lostpointercapture", () => { if (gesture) cancel(); });
      canvas.addEventListener("keydown", event => {
        if (event.key === "Escape") { cancel(); selection = null; refresh(); renderer.draw(store.getState()); }
        if (event.key === "Delete" && mode.value === "edit" && !remove.disabled) { event.preventDefault(); remove.click(); }
      });
      insert.addEventListener("click", () => {
        if (insert.disabled) return;
        const state = store.getState(), index = selection.index;
        apply(app.routeEdit.insertAfter(state, index), { ...selection, index: index + 1 }, "已插入中点；曲线拆分保持原形，可继续拖动调整。");
      });
      remove.addEventListener("click", () => {
        if (remove.disabled) return;
        const state = store.getState(), index = selection.index;
        apply(app.routeEdit.remove(state, index), null, "已删除所选点；删除中间点时相邻段合并为直线，可撤销恢复。");
      });
      store.subscribe(state => {
        const changed = previous.activeVehicle !== state.activeVehicle || previous.points !== state.points || previous.segments.some((s, i) => s !== state.segments[i]) || previous.segments.length !== state.segments.length;
        if (!ownChange && (changed || gesture)) { selection = null; cancel(); }
        if (selection && selection.kind !== "point" && !state.showControlPoints) { selection = null; renderer.draw(state); }
        previous = state; refresh();
      });
      refresh(); canvas.removeAttribute("aria-describedby");
    }
  };
}());
