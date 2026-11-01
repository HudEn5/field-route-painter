import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
function load() {
  const sandbox = vm.createContext({ window: {} });
  for (const name of ["store", "controls"]) vm.runInContext(readFileSync(new URL(`../src/${name}.js`, import.meta.url), "utf8"), sandbox);
  const { store, controls } = sandbox.window.RoutePainter;
  const elements = { undoButton: new EventTarget(), deleteLastButton: new EventTarget(), clearButton: new EventTarget() };
  controls.init({ store, elements });
  return { store, elements };
}
const first = [{ x: 100, y: 200 }, { x: 300, y: 400 }];
const second = [{ x: 600, y: 700 }, { x: 800, y: 900 }];
const plain = points => Array.from(points, p => [p.x, p.y]);
test("switching vehicles preserves independent routes and read-only snapshots", () => {
  const { store } = load();
  store.setState({ points: first });
  const snapshot = store.getState();
  store.setState({ activeVehicle: "2" });
  assert.equal(store.getState().points.length, 0);
  store.setState({ points: second });
  assert.deepEqual(plain(store.getState().routes["1"]), [[100, 200], [300, 400]]);
  store.setState({ activeVehicle: "1" });
  assert.equal(store.getState().points, store.getState().routes["1"]);
  assert.deepEqual(plain(store.getState().points), plain(first));
  assert.equal(snapshot.routes["2"].length, 0);
  assert.ok(Object.isFrozen(snapshot.routes));
  assert.ok(Object.isFrozen(snapshot.routes["1"][0]));
});
test("delete-last and clear affect only the selected vehicle", () => {
  const { store, elements } = load();
  store.setState({ points: first });
  store.setState({ activeVehicle: "2", points: second });
  elements.deleteLastButton.dispatchEvent(new Event("click"));
  assert.equal(store.getState().routes["2"].length, 1);
  assert.equal(store.getState().routes["1"].length, 2);
  store.setState({ activeVehicle: "1" });
  elements.clearButton.dispatchEvent(new Event("click"));
  assert.equal(store.getState().routes["1"].length, 0);
  assert.equal(store.getState().routes["2"].length, 1);
  store.setState({ activeVehicle: "2" });
  assert.deepEqual(plain(store.getState().points), [[600, 700]]);
});
test("buttons follow the selected vehicle even when the other route has points", () => {
  const { store, elements } = load();
  store.setState({ points: first });
  assert.equal(elements.undoButton.disabled, false);
  store.setState({ activeVehicle: "2" });
  assert.equal(elements.undoButton.disabled, false);
  assert.equal(elements.deleteLastButton.disabled, true);
  assert.equal(elements.clearButton.disabled, true);
  const before = store.getState();
  elements.clearButton.dispatchEvent(new Event("click"));
  assert.equal(store.getState(), before);
  store.setState({ activeVehicle: "1" });
  assert.equal(elements.clearButton.disabled, false);
});
test("team and coordinate changes retain both vehicles and active selection", () => {
  const { store } = load();
  store.setState({ points: first });
  store.setState({ activeVehicle: "2", points: second });
  const routes = store.getState().routes;
  store.setState({ team: "blue", showCoordinates: false });
  assert.equal(store.getState().routes["1"], routes["1"]);
  assert.equal(store.getState().routes["2"], routes["2"]);
  assert.equal(store.getState().activeVehicle, "2");
});
test("invalid vehicle or point data does not overwrite either route", () => {
  const { store } = load();
  store.setState({ points: first });
  const before = store.getState();
  assert.throws(() => store.setState({ activeVehicle: "3" }));
  assert.throws(() => store.setState({ activeVehicle: "2", points: [{ x: -1, y: 0 }] }));
  assert.equal(store.getState(), before);
});
