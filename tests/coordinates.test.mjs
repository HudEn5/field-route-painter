import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
function load() {
  const sandbox = vm.createContext({ window: {} });
  for (const name of ["store", "field", "coordinates"]) {
    vm.runInContext(readFileSync(new URL(`../src/${name}.js`, import.meta.url), "utf8"), sandbox);
  }
  return sandbox.window.RoutePainter;
}
const route = [{ x: 300, y: 400 }, { x: 100, y: 500 }, { x: 600, y: 50 }];
function closePoint(actual, x, y) {
  assert.ok(Math.abs(actual.x - x) < 1e-8, `X: ${actual.x} != ${x}`);
  assert.ok(Math.abs(actual.y - y) < 1e-8, `Y: ${actual.y} != ${y}`);
}
test("global coordinates use the field origin, regardless of the first route point", () => {
  const { coordinates, store } = load();
  store.setState({ points: route });
  closePoint(coordinates.toDisplayPoint(route[0], store.getState()), 1097.28, 1463.04);
});
test("relative coordinates subtract the unrounded first point, allowing both negative axes", () => {
  const { coordinates, store } = load();
  store.setState({ points: route, coordinateMode: "relative" });
  const state = store.getState();
  closePoint(coordinates.toDisplayPoint(route[0], state), 0, 0);
  closePoint(coordinates.toDisplayPoint(route[1], state), -731.52, 365.76);
  // Third point is measured from the first point, not the previous point.
  closePoint(coordinates.toDisplayPoint(route[2], state), 1097.28, -1280.16);
  const fractional = [{ x: 300.11, y: 400.11 }, { x: 300.22, y: 400.22 }];
  store.setState({ points: fractional });
  closePoint(coordinates.toDisplayPoint(fractional[1], store.getState()), 0.402336, 0.402336);
});
test("each vehicle uses its own first point and empty routes have no relative origin", () => {
  const { coordinates, store } = load();
  store.setState({ points: route, coordinateMode: "relative" });
  store.setState({ activeVehicle: "2" });
  assert.equal(coordinates.toDisplayPoint({ x: 500, y: 500 }, store.getState()), null);
  store.setState({ points: [{ x: 800, y: 600 }] });
  closePoint(coordinates.toDisplayPoint({ x: 800, y: 600 }, store.getState()), 0, 0);
  store.setState({ activeVehicle: "1" });
  closePoint(coordinates.toDisplayPoint(route[0], store.getState()), 0, 0);
  store.setState({ points: [] });
  assert.equal(coordinates.toDisplayPoint(route[0], store.getState()), null);
  store.setState({ points: [route[2]] });
  closePoint(coordinates.toDisplayPoint(route[2], store.getState()), 0, 0);
});
test("switching coordinate modes leaves both routes, route length and selection unchanged", () => {
  const { coordinates, field, store } = load();
  store.setState({ points: route });
  store.setState({ activeVehicle: "2", points: [{ x: 700, y: 800 }] });
  const before = store.getState();
  const length = field.routeLengthMeters(before.points);
  for (const coordinateMode of ["relative", "global", "relative"]) {
    store.setState({ coordinateMode });
    const state = store.getState();
    assert.equal(state.routes["1"], before.routes["1"]);
    assert.equal(state.routes["2"], before.routes["2"]);
    assert.equal(state.activeVehicle, "2");
    assert.equal(field.routeLengthMeters(state.points), length);
    coordinates.toDisplayPoint(state.points[0], state);
  }
});
test("invalid coordinate mode does not change stored data", () => {
  const { store } = load();
  const before = store.getState();
  assert.throws(() => store.setState({ coordinateMode: "invalid" }));
  assert.equal(store.getState(), before);
});
