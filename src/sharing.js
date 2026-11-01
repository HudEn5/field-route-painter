/* 路线文件、带路线 HTML 与本机自动保存。无服务器依赖。 */
(function () {
  "use strict";
  const app = window.RoutePainter = window.RoutePainter || {};
  function createSession(store, getStorage, embeddedText = null) {
    let documentId = "workspace", storage = null, blocked = false;
    const key = () => `route-painter:plan:v1:${documentId}`;
    const snapshot = () => app.plans.snapshot(store.getState(), documentId);
    return {
      snapshot,
      restore() {
        let embedded = null;
        if (embeddedText !== null) {
          try { embedded = app.plans.parse(embeddedText); documentId = embedded.documentId; }
          catch { blocked = true; return { ok: false, message: "分享文件内置路线无法读取，已暂停自动保存。" }; }
        }
        try {
          storage = getStorage();
          const saved = storage.getItem(key());
          if (saved !== null) {
            const plan = app.plans.parse(saved);
            if (plan.documentId !== documentId) throw new TypeError("文档标识不匹配");
            store.replacePlan(plan);
            return { ok: true, message: "已恢复此文档在本机的路线。" };
          }
        } catch {
          blocked = true;
          if (embedded) store.replacePlan(embedded);
          return { ok: false, message: "本机保存不可用或记录无法读取；旧记录未覆盖，请导出文件保存。" };
        }
        if (embedded) store.replacePlan(embedded);
        return { ok: true, message: embedded ? "已载入分享文件中的双车路线。" : "本机自动保存已启用。" };
      },
      enableSaving() { blocked = false; },
      save() {
        if (blocked) return { ok: false, message: "本机自动保存不可用，请导出路线文件保存。" };
        try {
          storage ||= getStorage();
          storage.setItem(key(), JSON.stringify(snapshot()));
          return { ok: true, message: "已自动保存到本机 · 仅当前浏览器" };
        } catch { blocked = true; return { ok: false, message: "本机自动保存失败，请导出路线文件保存。" }; }
      }
    };
  }
  const escapedJson = value => JSON.stringify(value).replace(/</g, "\\u003c");
  let session, restored;
  function download(content, type, name) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = name;
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  async function makeHtml(plan) {
    const root = document.documentElement.cloneNode(true);
    root.querySelector("#route-plan-data")?.remove();
    const embedded = document.createElement("script"); embedded.id = "route-plan-data"; embedded.type = "application/json";
    embedded.textContent = escapedJson(plan); root.querySelector("head").appendChild(embedded);
    const assets = [...root.querySelectorAll('link[rel="stylesheet"], script[src]')];
    await Promise.all(assets.map(async node => {
      const script = node.tagName === "SCRIPT";
      const url = new URL(node.getAttribute(script ? "src" : "href"), document.baseURI);
      if (url.origin !== location.origin) throw new Error("页面包含外部资源，请使用打包后的独立 HTML 导出。");
      let response;
      try { response = await fetch(url.href); } catch { throw new Error("请打开独立版本 HTML 后再导出带路线 HTML；路线文件导出仍可使用。"); }
      if (!response.ok) throw new Error("无法读取页面资源，请使用独立版本 HTML 导出。");
      const inline = document.createElement(script ? "script" : "style");
      const source = await response.text();
      inline.textContent = script ? source.replace(/<\/script/gi, "<\\/script") : source.replace(/<\/style/gi, "<\\/style");
      node.replaceWith(inline);
    }));
    root.querySelector("#plan-import-undo").disabled = true;
    root.querySelector("#plan-export-html").disabled = false;
    root.querySelector("#plan-message").textContent = "";
    root.querySelector("#plan-save-status").textContent = "正在读取分享路线…";
    root.querySelector("title").textContent = "VEX U 路线规划 · v1.6 · 含路线";
    return "<!doctype html>\n" + root.outerHTML;
  }
  app.sharing = {
    createSession, escapedJson, makeHtml,
    restore() {
      const embedded = document.getElementById("route-plan-data");
      session = createSession(app.store, () => window.localStorage, embedded ? embedded.textContent : null);
      restored = session.restore();
    },
    init({ store }) {
      const status = document.getElementById("plan-save-status"), message = document.getElementById("plan-message");
      const input = document.getElementById("plan-import-file"), undo = document.getElementById("plan-import-undo");
      const exportHtml = document.getElementById("plan-export-html");
      let beforeImport = null;
      input.value = ""; undo.disabled = true;
      message.textContent = document.getElementById("route-plan-data") ? restored.message : "";
      const announce = (text, error = false) => { message.textContent = text; message.className = error ? "editor-message error" : "editor-message"; };
      const save = () => { status.textContent = session.save().message; };
      status.textContent = restored.message;
      if (restored.ok) save();
      store.subscribe(save);
      window.addEventListener("pagehide", save);
      document.getElementById("plan-export-json").addEventListener("click", () => {
        try {
          download(JSON.stringify(session.snapshot(), null, 2), "application/json;charset=utf-8", "route-plan-v1.json");
          announce("已导出两辆车的完整路线。接收方打开画板后选择“导入路线”即可继续编辑。");
        } catch (error) { announce("导出失败：" + error.message, true); }
      });
      document.getElementById("plan-import").addEventListener("click", () => input.click());
      input.addEventListener("change", async () => {
        const file = input.files[0]; if (!file) return;
        try {
          if (file.size > 5 * 1024 * 1024) throw new RangeError("路线文件不能超过 5 MB。");
          const plan = app.plans.parse(await file.text());
          const previous = session.snapshot();
          store.replacePlan(plan);
          beforeImport = previous; undo.disabled = false;
          session.enableSaving(); save();
          announce("已导入双车路线及控制点。可点击“撤销本次导入”恢复导入前的规划。");
        } catch (error) { announce("导入失败，当前路线未改变：" + error.message, true); }
        input.value = "";
      });
      undo.addEventListener("click", () => {
        if (!beforeImport) return;
        store.replacePlan(beforeImport); beforeImport = null; undo.disabled = true;
        announce("已恢复导入前的双车规划。");
      });
      exportHtml.addEventListener("click", async () => {
        exportHtml.disabled = true; announce("正在生成带路线的独立 HTML…");
        try {
          const plan = session.snapshot();
          plan.documentId = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `share-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const html = await makeHtml(plan);
          download(html, "text/html;charset=utf-8", "field-route-plan-v1.6.html");
          announce("已导出带路线的 HTML。发给别人后，双击即可查看和继续编辑；导出仅包含已应用的参数。");
        } catch (error) { announce(error.message, true); }
        finally { exportHtml.disabled = false; }
      });
    }
  };
}());
