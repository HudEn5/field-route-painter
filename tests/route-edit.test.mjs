import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
function load(extra = {}) {
  const sandbox = vm.createContext({ window: {}, ...extra });
  for (const name of ["store", "field", "curves", "plans", "route-edit", "interactions"]) vm.runInContext(readFileSync(new URL(`../src/${name}.js`, import.meta.url), "utf8"), sandbox);
  return sandbox.window.RoutePainter;
}
const plain = value => JSON.parse(JSON.stringify(value));
const points = [{ x: 100, y: 800 }, { x: 800, y: 800 }, { x: 900, y: 100 }];
const curve = { type: "bezier", c1: { x: 100, y: 100 }, c2: { x: 800, y: 100 } };
test("splitting a cubic exactly preserves both halves of its shape", () => {
  const { store, routeEdit, curves } = load();
  store.setState({ points, segments: [curve, { type: "line" }] });
  const original = store.getState(), patch = routeEdit.insertAfter(original, 0);
  for (let i = 0; i <= 100; i++) {
    const t = i / 100, s = patch.segments[t <= .5 ? 0 : 1], j = t <= .5 ? 0 : 1;
    const a = curves.bezierPoint(points[0], curve.c1, curve.c2, points[1], t);
    const b = curves.bezierPoint(patch.points[j], s.c1, s.c2, patch.points[j + 1], t <= .5 ? t * 2 : t * 2 - 1);
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 1e-8);
  }
  store.setState(patch); store.undo();
  assert.deepEqual(plain(store.getState().segments), plain(original.segments));
});
test("deleting any endpoint or middle point yields valid segments and can be undone", () => {
  for (const index of [0, 1, 2]) {
    const { store, routeEdit } = load();
    store.setState({ points, segments: [curve, { type: "line" }] });
    const before = store.getState();
    store.setState(routeEdit.remove(before, index));
    assert.equal(store.getState().points.length, 2);
    assert.equal(store.getState().segments.length, 1);
    if (index === 1) assert.equal(store.getState().segments[0].type, "line");
    store.undo(); assert.deepEqual(plain(store.getState()), plain(before));
  }
});
class Element extends EventTarget {
  value = "draw"; dataset = {}; captured = new Set();
  focus() {} removeAttribute() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 1000 }; }
  setPointerCapture(id) { this.captured.add(id); } hasPointerCapture(id) { return this.captured.has(id); } releasePointerCapture(id) { this.captured.delete(id); }
  click() { if (!this.disabled) this.dispatchEvent(new Event("click")); }
}
function setup() {
  const elements = new Map(), document = { getElementById(id) { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); } };
  const app = load({ document }), canvas = new Element(), drawn = [];
  const renderer = { draw: state => drawn.push(state), canvasToPoint: e => ({ x: Math.max(0,Math.min(1000,e.clientX)), y: Math.max(0,Math.min(1000,e.clientY)) }) };
  app.store.setState({ points, segments: [curve, { type: "line" }] });
  app.store.replacePlan(app.plans.snapshot(app.store.getState()), { recordHistory: false });
  app.interactions.init({ store: app.store, elements: { canvas }, renderer });
  const mode = document.getElementById("edit-mode"); mode.value = "edit"; mode.dispatchEvent(new Event("change"));
  const fire = (type, x, y) => { const e = new Event(type,{cancelable:true}); Object.assign(e,{clientX:x,clientY:y,pointerId:1,button:0}); canvas.dispatchEvent(e); };
  return { ...app, canvas, fire, drawn, el: id => document.getElementById(id) };
}
test("a drag previews without changing the store, then commits one undoable operation", () => {
  const { store, fire, drawn } = setup();
  fire("pointerdown",100,800); fire("pointermove",200,700); fire("pointermove",250,600);
  assert.equal(store.getState().points[0].x,100); assert.equal(store.canUndo(),false);
  assert.equal(drawn.at(-1).points[0].x,250);
  fire("pointerup",300,600);
  assert.equal(store.getState().points[0].x,300);
  store.undo(); assert.equal(store.getState().points[0].x,100); assert.equal(store.canUndo(),false);
});
test("cancelled drag and empty edit-mode click never add points or history", () => {
  const { store, fire, canvas } = setup();
  fire("pointerdown",100,800); fire("pointermove",250,600); fire("pointercancel",250,600);
  fire("pointerdown",500,500); fire("pointerup",500,500);
  canvas.dispatchEvent(new Event("click"));
  assert.equal(store.getState().points.length,3); assert.equal(store.getState().points[0].x,100); assert.equal(store.canUndo(),false);
});
test("only shown control handles can be dragged and selection actions reject stale points", () => {
  const { store, fire, el } = setup();
  store.setState({ showControlPoints: true });
  fire("pointerdown",100,100); fire("pointermove",200,200); fire("pointerup",200,200);
  assert.equal(store.getState().segments[0].c1.x,200);
  assert.equal(el("remove-point").disabled,true);
  store.undo(); assert.equal(store.getState().segments[0].c1.x,100);
  fire("pointerdown",100,800); fire("pointerup",100,800);
  assert.equal(el("remove-point").disabled,false);
  store.setState({ activeVehicle: "2" });
  assert.equal(el("remove-point").disabled,true);
});
