/* 命名方案库：独立持久化，单条/整库可移植；导入合并不覆盖已有方案。 */
(function () {
  "use strict";
  const app = window.RoutePainter = window.RoutePainter || {};
  const key = "route-painter:library:v1", kind = "field-route-painter-library";
  const uuid = () => typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `plan-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  function entry(value) {
    if (!value || typeof value.id !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(value.id)) throw new TypeError("方案标识无效。");
    if (typeof value.name !== "string" || !value.name.trim() || value.name.trim().length > 80) throw new TypeError("方案名称须为 1～80 个字符。");
    if (typeof value.notes !== "string" || value.notes.length > 1000) throw new TypeError("方案备注最多 1000 个字符。");
    if (typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt))) throw new TypeError("方案日期无效。");
    const plan = app.plans.validate(value.plan); plan.documentId = "workspace";
    return { id: value.id, name: value.name.trim(), notes: value.notes, updatedAt: new Date(value.updatedAt).toISOString(), plan };
  }
  function validate(value) {
    if (value?.kind !== kind || value.libraryVersion !== 1 || !Array.isArray(value.items)) throw new TypeError("不支持的方案库文件格式。");
    if (value.items.length > 100) throw new RangeError("方案库最多支持 100 个方案。");
    const items = value.items.map(entry), ids = new Set();
    let points = 0;
    for (const item of items) {
      if (ids.has(item.id)) throw new TypeError("方案库包含重复标识。"); ids.add(item.id);
      points += item.plan.vehicles["1"].points.length + item.plan.vehicles["2"].points.length;
    }
    if (points > 50000) throw new RangeError("方案库合计最多保存 50000 个路径点，请拆分文件。");
    return { kind, libraryVersion: 1, appVersion: app.plans.version, items };
  }
  function parse(text, makeId = uuid) {
    if (typeof text !== "string" || text.length > 10 * 1024 * 1024) throw new RangeError("方案库文件不能超过 10 MB。");
    let value;
    try { value = JSON.parse(text.replace(/^\uFEFF/, "")); } catch { throw new TypeError("方案库文件不是有效 JSON。"); }
    if (value?.kind === kind) return validate(value);
    const plan = app.plans.validate(value);
    return validate({ kind, libraryVersion: 1, items: [{ id: makeId(), name: "导入的路线", notes: "从路线 JSON 导入", updatedAt: new Date().toISOString(), plan }] });
  }
  const pack = items => validate({ kind, libraryVersion: 1, items });
  const fingerprint = item => JSON.stringify({ name: item.name, notes: item.notes, plan: item.plan });
  function createController(getStorage, makeId = uuid) {
    let items = [], seen = null, storage, blocked = false;
    const history = [];
    function write(next, remember = true) {
      if (blocked) throw new Error("本机方案库记录无法读取，旧记录已保留。请先备份文件并刷新检查。");
      const checked = pack(next).items;
      storage ||= getStorage();
      if (storage.getItem(key) !== seen) throw new Error("其他窗口已更新方案库；当前操作未覆盖记录，请刷新载入最新方案库。");
      const serialized = JSON.stringify(pack(checked));
      // 持久化成功后才改变列表，配额失败不会假装已经保存。
      try { storage.setItem(key, serialized); }
      catch { throw new Error("方案库未保存：浏览器存储不可用或空间不足，请先导出备份。当前方案库未改变。"); }
      if (remember) { history.push(items); if (history.length > 20) history.shift(); }
      seen = serialized; items = checked;
    }
    return {
      restore() {
        try {
          storage = getStorage(); seen = storage.getItem(key);
          if (seen !== null) items = parse(seen, makeId).items;
          return { ok: true, message: "方案库已载入；存于当前浏览器，分享请导出文件。" };
        } catch { blocked = true; return { ok: false, message: "本机方案库无法读取，旧记录未覆盖；当前画布仍可导出路线文件。" }; }
      },
      list() { return pack(items).items; },
      canUndo() { return history.length > 0; },
      save(name, notes, plan, id = null) {
        if (id !== null && !items.some(item => item.id === id)) throw new RangeError("所选方案已不存在。");
        const saved = entry({ id: id || makeId(), name, notes, plan, updatedAt: new Date().toISOString() });
        if (id === null && items.some(item => item.id === saved.id)) throw new Error("无法生成唯一方案标识，请重试。");
        write(id === null ? [...items, saved] : items.map(item => item.id === id ? saved : item));
        return saved.id;
      },
      remove(id) {
        if (!items.some(item => item.id === id)) throw new RangeError("请选择方案。");
        write(items.filter(item => item.id !== id));
      },
      undo() {
        if (!history.length) return false;
        write(history.at(-1), false); history.pop(); return true;
      },
      merge(text) {
        const incoming = parse(text, makeId).items, next = [...items];
        let added = 0, skipped = 0;
        for (const item of incoming) {
          if (next.some(existing => fingerprint(existing) === fingerprint(item))) { skipped++; continue; }
          const collision = next.some(existing => existing.id === item.id || existing.name === item.name);
          if (collision) {
            let id;
            for (let tries = 0; tries < 10; tries++) { id = makeId(); if (!next.some(existing => existing.id === id)) break; }
            if (next.some(existing => existing.id === id)) throw new Error("无法生成唯一方案标识。");
            item.id = id;
          }
          next.push(item); added++;
        }
        if (added) write(next);
        return { added, skipped };
      },
      exportFile(id = null) {
        const selected = id === null ? items : items.filter(item => item.id === id);
        if (id !== null && !selected.length) throw new RangeError("请选择方案。");
        return JSON.stringify(pack(selected), null, 2);
      }
    };
  }
  app.library = {
    validate, parse, createController,
    init({ store }) {
      const controller = createController(() => window.localStorage);
      const select = document.getElementById("library-select"), name = document.getElementById("library-name"), notes = document.getElementById("library-notes");
      const message = document.getElementById("library-message"), file = document.getElementById("library-file");
      const byId = id => document.getElementById(id);
      const announce = (text, error = false) => { message.textContent = text; message.className = error ? "editor-message error" : "editor-message"; };
      function selected() { return controller.list().find(item => item.id === select.value); }
      function refresh(wanted = select.value) {
        const items = controller.list(), fragment = document.createDocumentFragment();
        if (!items.length) {
          const option = document.createElement("option"); option.value = ""; option.textContent = "暂无方案，请为当前画布命名保存"; fragment.appendChild(option);
        }
        items.forEach(item => {
          const option = document.createElement("option"); option.value = item.id;
          const twins = items.filter(other => other.name === item.name);
          const suffix = twins.length > 1 ? `（同名 ${twins.findIndex(other => other.id === item.id) + 1}/${twins.length}）` : "";
          option.textContent = `${item.name}${suffix} · 两车 ${item.plan.vehicles["1"].points.length} / ${item.plan.vehicles["2"].points.length} 点`;
          fragment.appendChild(option);
        });
        select.replaceChildren(fragment);
        select.value = items.some(item => item.id === wanted) ? wanted : items[0]?.id || "";
        const item = selected();
        name.value = item?.name || ""; notes.value = item?.notes || "";
        byId("library-count").textContent = String(items.length);
        byId("library-detail").textContent = item ? `所选方案最后保存：${new Date(item.updatedAt).toLocaleString()}。选中列表不会改变画布，点击载入后才切换。` : "每个方案保存两辆车及已应用的曲线；请先填写名称，再另存为新方案。";
        for (const id of ["library-load", "library-update", "library-delete", "library-export-one"]) byId(id).disabled = !item;
        byId("library-export-all").disabled = !items.length;
        byId("library-undo").disabled = !controller.canUndo();
      }
      // Web Locks 将同源窗口的检查和写入放在同一个临界区。
      async function mutate(action, success) {
        try {
          const result = window.navigator?.locks ? await window.navigator.locks.request("route-painter-library", action) : action();
          refresh(typeof result === "string" ? result : select.value); announce(typeof success === "function" ? success(result) : success);
        } catch (error) { announce(error.message, true); }
      }
      select.addEventListener("change", () => { refresh(); announce("已选择方案。点击“载入所选方案”切换画布；载入后可撤销恢复原规划。"); });
      for (const [id, update] of [["library-save-new", false], ["library-update", true]]) byId(id).addEventListener("click", () => {
        try {
          const title = name.value, memo = notes.value, plan = app.plans.snapshot(store.getState()), selectedId = update ? select.value : null;
          mutate(() => controller.save(title, memo, plan, selectedId), "已将当前双车画布保存到方案库。");
        } catch (error) { announce(error.message, true); }
      });
      byId("library-load").addEventListener("click", () => {
        const item = selected(); if (!item) return;
        item.plan.view.showControlPoints = store.getState().showControlPoints;
        store.replacePlan(item.plan); announce(`已载入“${item.name}”，可用顶部“撤销上一步”恢复之前的画布。`);
      });
      byId("library-delete").addEventListener("click", () => { const id = select.value; mutate(() => controller.remove(id), "已删除方案，当前画布保留；可撤销方案库操作。"); });
      byId("library-undo").addEventListener("click", () => mutate(() => controller.undo(), "已撤销上一次方案库操作。"));
      for (const [id, all] of [["library-export-one", false], ["library-export-all", true]]) byId(id).addEventListener("click", () => {
        try {
          const item = selected(), title = all ? "route-library" : (item?.name || "route-plan").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_");
          app.sharing.download(controller.exportFile(all ? null : select.value), "application/json;charset=utf-8", `${title}.route-library.json`);
          announce(all ? "已导出整库。队友在方案库中导入该文件即可获得所有方案。" : "已导出所选方案，包含名称、备注、双车路线及曲线。请在方案库中导入。");
        } catch (error) { announce(error.message, true); }
      });
      byId("library-import").addEventListener("click", () => file.click());
      file.addEventListener("change", async () => {
        const chosen = file.files[0]; if (!chosen) return;
        try {
          if (chosen.size > 10 * 1024 * 1024) throw new RangeError("方案库文件不能超过 10 MB。");
          const text = await chosen.text();
          await mutate(() => controller.merge(text), result => `导入完成：新增 ${result.added} 个，跳过 ${result.skipped} 个完全相同的方案。当前画布保留。`);
        } catch (error) { announce(error.message, true); }
        file.value = "";
      });
      const restored = controller.restore(); refresh(); announce(restored.message, !restored.ok);
    }
  };
}());
