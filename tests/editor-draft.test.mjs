import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
class Element extends EventTarget {
  value = "";
  children = [];
  appendChild(child) { this.children.push(child); }
  replaceChildren(fragment) { this.children = fragment.children; }
  focus() {}
}
function load() {
  const elements = new Map();
  const document = {
    getElementById(id) { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); },
    createElement: () => new Element(), createDocumentFragment: () => new Element()
  };
  document.getElementById("point-target").value = "new";
  const sandbox = vm.createContext({ window: {}, document });
  for (const name of ["store", "field", "coordinates", "point-editor"]) vm.runInContext(readFileSync(new URL(`../src/${name}.js`, import.meta.url), "utf8"), sandbox);
  const app = sandbox.window.RoutePainter;
  app.store.setState({ points: [{ x: 200, y: 500 }, { x: 400, y: 600 }] });
  app.pointEditor.init({ store: app.store });
  return { ...app, el: id => document.getElementById(id) };
}
test("display changes preserve the unfinished coordinate edit", () => {
  const { store, el } = load();
  el("point-target").value = "1";
  el("point-target").dispatchEvent(new Event("change"));
  el("point-x").value = "900";
  store.setState({ team: "blue", showCoordinates: false, showControlPoints: true });
  assert.equal(el("point-x").value, "900");
  assert.equal(store.getState().points[1].x, 400);
  store.setState({ coordinateMode: "relative" });
  assert.equal(Number(el("point-x").value), 731.52);
});
