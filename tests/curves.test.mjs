import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
function load() {
  const sandbox = vm.createContext({ window: {} });
  for (const name of ["store", "field", "curves", "controls"]) vm.runInContext(readFileSync(new URL(`../src/${name}.js`, import.meta.url), "utf8"), sandbox);
  const app = sandbox.window.RoutePainter;
  const buttons = { undoButton: new EventTarget(), clearButton: new EventTarget() };
  app.controls.init({ store: app.store, elements: buttons });
  return { ...app, buttons };
}
const path = [{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1000, y: 1000 }];
const arch = { c1: { x: 0, y: 3657.6 }, c2: { x: 3657.6, y: 3657.6 } };
const close = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

test("new segments default to lines and selection follows available segments", () => {
  const { store } = load();
  assert.equal(store.getState().selectedSegment, null);
  store.setState({ points: path });
  assert.deepEqual(Array.from(store.getState().segments, s => s.type), ["line", "line"]);
  assert.equal(store.getState().selectedSegment, 0);
  store.setState({ activeVehicle: "2" });
  assert.equal(store.getState().segments.length, 0); assert.equal(store.getState().selectedSegment, null);
});
test("a route can mix curves and lines with immutable independent vehicle data", () => {
  const { store, curves } = load();
  store.setState({ points: path });
  const before = store.getState();
  store.setState({ segments: curves.makeSegments(before, 0, "bezier", arch) });
  assert.equal(store.getState().segments[0].type, "bezier"); assert.equal(store.getState().segments[1].type, "line");
  assert.equal(before.segments[0].type, "line");
  assert.ok(Object.isFrozen(store.getState().segments[0].c1));
  const saved = store.getState().segmentRoutes["1"];
  store.setState({ activeVehicle: "2", points: path.slice(0, 2) });
  assert.equal(store.getState().segmentRoutes["1"], saved);
  assert.equal(store.getState().segments[0].type, "line");
});
test("switching to a line retains saved controls for later curve restoration", () => {
  const { store, curves } = load();
  store.setState({ points: path });
  store.setState({ segments: curves.makeSegments(store.getState(), 0, "bezier", arch) });
  store.setState({ segments: curves.makeSegments(store.getState(), 0, "line") });
  assert.equal(store.getState().segments[0].type, "line");
  assert.equal(store.getState().segments[0].c1.y, 1000);
  close(curves.routeLengthMeters(store.getState().points, store.getState().segments), 7.3152);
  store.setState({ segments: curves.makeSegments(store.getState(), 0, "bezier", arch) });
  close(curves.routeLengthMeters(store.getState().points, store.getState().segments), 10.9728, 1e-4);
});
test("relative controls use the vehicle first point and can have negative offsets", () => {
  const { store, curves } = load();
  store.setState({ coordinateMode: "relative", points: [{ x: 500, y: 500 }, { x: 800, y: 700 }] });
  store.setState({ segments: curves.makeSegments(store.getState(), 0, "bezier", { c1: { x: -365.76, y: 0 }, c2: { x: 365.76, y: 731.52 } }) });
  close(store.getState().segments[0].c1.x, 400); close(store.getState().segments[0].c2.y, 700);
  const control = store.getState().segments[0].c1;
  store.setState({ coordinateMode: "global", team: "blue", showCoordinates: false, showControlPoints: false });
  assert.equal(store.getState().segments[0].c1, control);
});
test("point edits keep curve controls at their global field positions", () => {
  const { store, curves } = load();
  store.setState({ points: path });
  store.setState({ segments: curves.makeSegments(store.getState(), 0, "bezier", arch) });
  const control = store.getState().segments[0].c1;
  store.setState({ points: [{ x: 200, y: 200 }, ...path.slice(1)] });
  assert.equal(store.getState().segments[0].c1, control);
  assert.equal(store.getState().segments[0].type, "bezier");
});
test("undo and clear discard removed segments, and new segments do not resurrect old curves", () => {
  const { store, curves, buttons } = load();
  store.setState({ points: path });
  store.setState({ segments: curves.makeSegments(store.getState(), 1, "bezier", arch), selectedSegment: 1 });
  buttons.undoButton.dispatchEvent(new Event("click"));
  assert.equal(store.getState().segments.length, 1); assert.equal(store.getState().selectedSegment, 0);
  store.setState({ points: path });
  assert.equal(store.getState().segments[1].type, "line");
  buttons.clearButton.dispatchEvent(new Event("click"));
  assert.equal(store.getState().segments.length, 0); assert.equal(store.getState().selectedSegment, null);
});
test("invalid controls or segment counts are rejected atomically", () => {
  const { store, curves } = load();
  store.setState({ points: path }); const before = store.getState();
  assert.throws(() => store.setState({ segments: [] }));
  assert.throws(() => store.setState({ segments: [{ type: "bezier", c1: { x: NaN, y: 0 }, c2: { x: 0, y: 0 } }, { type: "line" }] }));
  assert.throws(() => curves.makeSegments(before, 2, "bezier", arch));
  assert.throws(() => curves.makeSegments(before, 0, "bezier", { ...arch, c1: { x: -1, y: 0 } }));
  assert.equal(store.getState(), before);
});
test("cubic geometry reaches both endpoints, and curve lengths include the curved path", () => {
  const { curves } = load();
  const p0 = { x: 0, y: 0 }, c1 = { x: 0, y: 1000 }, c2 = { x: 1000, y: 1000 }, p3 = { x: 1000, y: 0 };
  close(curves.bezierPoint(p0, c1, c2, p3, 0).x, 0);
  close(curves.bezierPoint(p0, c1, c2, p3, 1).x, 1000);
  close(curves.bezierPoint(p0, c1, c2, p3, 0.5).x, 500);
  close(curves.bezierPoint(p0, c1, c2, p3, 0.5).y, 750);
  close(curves.bezierLength(p0, c1, c2, p3), 2000, 0.01);
  assert.ok(curves.bezierLength(p0, c1, c2, p0) > 0);
  const defaults = curves.defaultControls(p0, p3);
  close(curves.bezierLength(p0, defaults.c1, defaults.c2, p3), 1000);
});
test("renderer path tracing uses cubic and straight Canvas commands for mixed segments", () => {
  const { curves } = load(); const calls = [];
  const ctx = { moveTo: (...args) => calls.push(["move", ...args]), lineTo: (...args) => calls.push(["line", ...args]), bezierCurveTo: (...args) => calls.push(["curve", ...args]) };
  curves.trace(ctx, path, [{ type: "bezier", c1: { x: 0, y: 1000 }, c2: { x: 1000, y: 1000 } }, { type: "line" }]);
  assert.deepEqual(calls, [["move", 0, 0], ["curve", 0, 1000, 1000, 1000, 1000, 0], ["line", 1000, 1000]]);
});
