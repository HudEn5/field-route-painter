import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const sandbox = vm.createContext({ window: {} });
for (const name of ["field", "renderer"]) {
  vm.runInContext(readFileSync(new URL(`../src/${name}.js`, import.meta.url), "utf8"), sandbox);
}
const { field, renderer } = sandbox.window.RoutePainter;

test("nominal field converts origin, center and far edge to millimeters", () => {
  assert.equal(field.toMillimeters(0), 0);
  assert.equal(field.toMillimeters(500), 1828.8);
  assert.equal(field.toMillimeters(1000), 3657.6);
  assert.ok(Math.abs(field.toMillimeters(1000 / 6) - 609.6) < 1e-9);
});

test("route length uses every segment and does not mutate stored points", () => {
  const points = Object.freeze([
    Object.freeze({ x: 0, y: 0 }), Object.freeze({ x: 1000, y: 0 }),
    Object.freeze({ x: 1000, y: 1000 }),
  ]);
  assert.equal(field.routeLengthMeters([]), 0);
  assert.equal(field.routeLengthMeters(points.slice(0, 1)), 0);
  assert.ok(Math.abs(field.routeLengthMeters(points) - 7.3152) < 1e-9);
  assert.ok(Math.abs(field.routeLengthMeters([{ x: 0, y: 0 }, { x: 1000, y: 1000 }]) - Math.SQRT2 * 3.6576) < 1e-9);
});

test("canvas clicks stay aligned at desktop and mobile sizes and clamp to field edges", () => {
  for (const size of [780, 292]) {
    renderer.init({ getContext: () => ({}), getBoundingClientRect: () => ({ left: 48, top: 200, width: size, height: size }) });
    const center = renderer.canvasToPoint({ clientX: 48 + size / 2, clientY: 200 + size / 2 });
    assert.equal(field.toMillimeters(center.x), 1828.8);
    assert.equal(field.toMillimeters(center.y), 1828.8);
    const outside = renderer.canvasToPoint({ clientX: -20, clientY: 200 + size + 30 });
    assert.equal(outside.x, 0);
    assert.equal(outside.y, 1000);
  }
});
