import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
function load() {
  const sandbox = vm.createContext({ window: {} });
  for (const name of ["store", "field", "curves", "plans", "sharing"]) vm.runInContext(readFileSync(new URL(`../src/${name}.js`, import.meta.url), "utf8"), sandbox);
  return sandbox.window.RoutePainter;
}
const plain = value => JSON.parse(JSON.stringify(value));
const points = [{ x: 100, y: 700 }, { x: 800, y: 700 }, { x: 900, y: 200 }];
const curve = { type: "bezier", c1: { x: 100, y: 200 }, c2: { x: 800, y: 200 } };

test("clear undo restores all curve geometry without changing the other vehicle", () => {
  const { store } = load();
  store.setState({ points, segments: [curve, { type: "line" }] });
  store.setState({ activeVehicle: "2", points: points.slice(0, 2) });
  store.setState({ activeVehicle: "1", selectedSegment: 1 });
  const before = store.getState();
  store.setState({ points: [] });
  assert.equal(store.getState().points.length, 0);
  assert.equal(store.undo(), true);
  assert.deepEqual(plain(store.getState()), plain(before));
  assert.equal(before.points.length, 3);
});

test("add, coordinate edit, curve change and clear undo in reverse order", () => {
  const { store } = load();
  const snapshots = [store.getState()];
  for (const patch of [
    { points },
    { points: [{ x: 200, y: 600 }, ...points.slice(1)] },
    { segments: [curve, { type: "line" }] },
    { points: [] },
  ]) { store.setState(patch); snapshots.push(store.getState()); }
  snapshots.pop();
  for (const before of snapshots.reverse()) {
    assert.equal(store.undo(), true);
    assert.deepEqual(plain(store.getState().routes), plain(before.routes));
    assert.deepEqual(plain(store.getState().segmentRoutes), plain(before.segmentRoutes));
  }
  assert.equal(store.canUndo(), false);
  assert.equal(store.undo(), false);
});

test("cross-vehicle undo focuses the edited vehicle and skips later view changes", () => {
  const { store } = load();
  store.setState({ points });
  store.setState({ activeVehicle: "2", points: points.slice(0, 2) });
  store.setState({ activeVehicle: "1", team: "blue", coordinateMode: "relative", showCoordinates: false, showControlPoints: true });
  store.undo();
  const state = store.getState();
  assert.equal(state.activeVehicle, "2");
  assert.equal(state.points.length, 0);
  assert.equal(state.routes["1"].length, 3);
  assert.equal(state.team, "blue");
  assert.equal(state.coordinateMode, "relative");
  assert.equal(state.showCoordinates, false);
  assert.equal(state.showControlPoints, true);
  store.undo();
  assert.equal(store.getState().activeVehicle, "1");
  assert.equal(store.getState().points.length, 0);
  assert.equal(store.canUndo(), false);
});

test("view-only, unchanged geometry and rejected edits create no undo entries", () => {
  const { store } = load();
  assert.equal(store.getState().showControlPoints, false);
  store.setState({ team: "blue", coordinateMode: "relative", showControlPoints: true });
  assert.equal(store.canUndo(), false);
  store.setState({ points, segments: [curve, { type: "line" }] });
  store.setState({ points: plain(points), segments: plain([curve, { type: "line" }]) });
  assert.throws(() => store.setState({ points: [{ x: -1, y: 0 }] }));
  store.undo();
  assert.equal(store.getState().points.length, 0);
  assert.equal(store.getState().showControlPoints, true);
  assert.equal(store.canUndo(), false);
});

test("manual import is one undoable transaction restoring both cars and prior view", () => {
  const { store, plans } = load();
  store.setState({ points, segments: [curve, { type: "line" }], coordinateMode: "relative" });
  const before = store.getState();
  const plan = plans.snapshot(before);
  plan.vehicles["1"] = { points: [], segments: [] };
  plan.vehicles["2"] = { points: points.slice(0, 2), segments: [{ type: "line" }] };
  plan.view.activeVehicle = "2"; plan.view.team = "blue"; plan.view.coordinateMode = "global"; plan.view.selectedSegment = 0;
  store.replacePlan(plan);
  store.setState({ showControlPoints: true });
  store.undo();
  assert.deepEqual(plain(store.getState().routes), plain(before.routes));
  assert.deepEqual(plain(store.getState().segmentRoutes), plain(before.segmentRoutes));
  assert.equal(store.getState().activeVehicle, "1");
  assert.equal(store.getState().coordinateMode, "relative");
  assert.equal(store.getState().team, "red");
  assert.equal(store.getState().showControlPoints, true);
});

test("autosave restoration starts a fresh history and undo results are saved", () => {
  const { store, plans, sharing } = load();
  store.setState({ points, segments: [curve, { type: "line" }] });
  const data = new Map([["route-painter:plan:v1:workspace", JSON.stringify(plans.snapshot(store.getState()))]]);
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const session = sharing.createSession(store, () => storage);
  session.restore();
  assert.equal(store.canUndo(), false);
  store.subscribe(() => session.save());
  store.setState({ points: [] });
  store.undo();
  assert.equal(plans.parse(data.get("route-painter:plan:v1:workspace")).vehicles["1"].points.length, 3);
  assert.equal(store.canUndo(), false);
});

test("history is capped at the most recent 100 operations", () => {
  const { store } = load();
  for (let x = 0; x < 105; x++) store.setState({ points: [{ x, y: 0 }] });
  let count = 0;
  while (store.undo()) count++;
  assert.equal(count, 100);
  assert.equal(store.getState().points[0].x, 4);
});
