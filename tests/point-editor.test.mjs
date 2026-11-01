import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
function load() {
  const sandbox = vm.createContext({ window: {} });
  for (const name of ["store", "field", "coordinates", "point-editor"]) {
    vm.runInContext(readFileSync(new URL(`../src/${name}.js`, import.meta.url), "utf8"), sandbox);
  }
  return sandbox.window.RoutePainter;
}
function close(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`); }

test("global input adds points at both exact field boundaries", () => {
  const { store, pointEditor } = load();
  store.setState({ points: pointEditor.makePoints(store.getState(), { x: 0, y: 3657.6 }) });
  assert.equal(store.getState().points[0].x, 0);
  assert.equal(store.getState().points[0].y, 1000);
  store.setState({ points: pointEditor.makePoints(store.getState(), { x: 3657.6, y: 0 }) });
  assert.equal(store.getState().points[1].x, 1000);
  assert.equal(store.getState().points[1].y, 0);
});
test("relative input adds from the first point without modifying the other vehicle", () => {
  const { store, pointEditor } = load();
  store.setState({ points: [{ x: 400, y: 500 }] });
  store.setState({ activeVehicle: "2", points: [{ x: 900, y: 900 }] });
  store.setState({ activeVehicle: "1", coordinateMode: "relative" });
  const previous = store.getState();
  store.setState({ points: pointEditor.makePoints(previous, { x: -365.76, y: 731.52 }) });
  close(store.getState().points[1].x, 300); close(store.getState().points[1].y, 700);
  assert.equal(store.getState().routes["2"], previous.routes["2"]);
  assert.equal(previous.points.length, 1);
});
test("editing a global point changes only the selected point and preserves the old snapshot", () => {
  const { store, pointEditor } = load();
  store.setState({ points: [{ x: 100, y: 200 }, { x: 300, y: 400 }, { x: 500, y: 600 }] });
  const previous = store.getState();
  const next = pointEditor.makePoints(previous, { x: 1828.8, y: 1828.8 }, 1);
  assert.equal(next.length, 3); assert.equal(next[0], previous.points[0]); assert.equal(next[2], previous.points[2]);
  close(next[1].x, 500); close(next[1].y, 500);
  assert.equal(previous.points[1].x, 300);
});
test("relative edit measures from the first point rather than the previous point", () => {
  const { store, pointEditor } = load();
  store.setState({ coordinateMode: "relative", points: [{ x: 500, y: 500 }, { x: 200, y: 200 }, { x: 700, y: 700 }] });
  const next = pointEditor.makePoints(store.getState(), { x: -365.76, y: 731.52 }, 2);
  close(next[2].x, 400); close(next[2].y, 700);
  assert.equal(next[0].x, 500); assert.equal(next[1].x, 200);
});
test("relative mode requires an origin and first-point relocation uses global mode", () => {
  const { store, pointEditor } = load();
  store.setState({ coordinateMode: "relative" });
  assert.throws(() => pointEditor.makePoints(store.getState(), { x: 0, y: 0 }));
  store.setState({ points: [{ x: 500, y: 500 }] });
  assert.throws(() => pointEditor.makePoints(store.getState(), { x: 10, y: 10 }, 0));
});
test("moving the first point globally rebases relative readings but keeps remaining field positions", () => {
  const { store, pointEditor, coordinates } = load();
  store.setState({ points: [{ x: 300, y: 300 }, { x: 600, y: 600 }] });
  store.setState({ points: pointEditor.makePoints(store.getState(), { x: 1828.8, y: 1828.8 }, 0) });
  store.setState({ coordinateMode: "relative" });
  assert.equal(store.getState().points[1].x, 600);
  const relative = coordinates.toDisplayPoint(store.getState().points[1], store.getState());
  close(relative.x, 365.76); close(relative.y, 365.76);
});
test("invalid numbers, out-of-field coordinates and stale selections never change stored routes", () => {
  const { store, pointEditor } = load();
  store.setState({ points: [{ x: 200, y: 300 }] });
  const before = store.getState();
  for (const x of [NaN, Infinity, "", -1, 3657.6001]) {
    assert.throws(() => pointEditor.makePoints(before, { x, y: 0 }));
  }
  for (const index of [-1, 1, 0.5]) assert.throws(() => pointEditor.makePoints(before, { x: 0, y: 0 }, index));
  assert.equal(store.getState(), before);
  store.setState({ coordinateMode: "relative" });
  assert.throws(() => pointEditor.makePoints(store.getState(), { x: -3657.6, y: 0 }));
});
