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
function seed(app) {
  app.store.setState({ points: [{ x: 100, y: 700 }, { x: 800, y: 700 }, { x: 900, y: 200 }] });
  app.store.setState({ segments: app.curves.makeSegments(app.store.getState(), 0, "bezier", { c1: { x: 365.76, y: 731.52 }, c2: { x: 2926.08, y: 731.52 } }) });
  app.store.setState({ activeVehicle: "2", points: [{ x: 200, y: 200 }, { x: 600, y: 300 }], team: "blue", coordinateMode: "relative", showCoordinates: false, showControlPoints: false });
}
function memoryStorage() {
  const data = new Map();
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}
test("JSON round-trip restores both vehicles, curves, controls and display settings", () => {
  const source = load(); seed(source);
  const saved = source.plans.snapshot(source.store.getState());
  const target = load();
  target.store.replacePlan(target.plans.parse(JSON.stringify(saved)));
  assert.deepEqual(plain(target.plans.snapshot(target.store.getState())), plain(saved));
  assert.equal(target.store.getState().segmentRoutes["1"][0].type, "bezier");
  assert.equal(target.store.getState().activeVehicle, "2");
});
test("empty and single-point plans can be imported and publish only one state update", () => {
  const app = load(); let updates = 0;
  app.store.subscribe(() => updates++);
  const empty = app.plans.snapshot(app.store.getState());
  app.store.replacePlan(empty);
  assert.equal(updates, 1); assert.equal(app.store.getState().selectedSegment, null);
  empty.vehicles["1"].points.push({ x: 100, y: 100 });
  app.store.replacePlan(empty);
  assert.equal(updates, 2); assert.equal(app.store.getState().routes["1"].length, 1);
});
test("a failed second-vehicle import leaves the complete previous state untouched", () => {
  const app = load(); seed(app); const before = app.store.getState(); let updates = 0;
  app.store.subscribe(() => updates++);
  const data = app.plans.snapshot(before);
  data.vehicles["1"].points[0].x = 500;
  data.vehicles["2"].points[0].x = -100;
  assert.throws(() => app.store.replacePlan(data));
  assert.equal(app.store.getState(), before); assert.equal(updates, 0);
});
test("invalid schema, map, units, coordinate data and view settings are rejected", () => {
  const app = load(); seed(app); const valid = plain(app.plans.snapshot(app.store.getState()));
  for (const change of [
    d => d.schemaVersion = 2, d => d.fieldId = "another-field", d => d.coordinateUnits = "mm",
    d => d.vehicles["1"].points[0].x = 1001, d => d.vehicles["1"].segments.pop(),
    d => d.vehicles["1"].segments[0].c1.y = NaN, d => d.view.activeVehicle = "3",
    d => d.view.selectedSegment = 999, d => d.view.showCoordinates = "true",
  ]) {
    const data = plain(valid); change(data); assert.throws(() => app.plans.validate(data));
  }
  assert.throws(() => app.plans.parse("not JSON"));
  assert.deepEqual(plain(app.plans.parse("\uFEFF" + JSON.stringify(valid))), valid);
});
test("saved line-control caches are preserved, and exported objects cannot mutate the store", () => {
  const app = load(); seed(app);
  app.store.setState({ activeVehicle: "1" });
  app.store.setState({ segments: app.curves.makeSegments(app.store.getState(), 0, "line") });
  const plan = app.plans.snapshot(app.store.getState());
  assert.equal(plan.vehicles["1"].segments[0].c1.y, 200);
  plan.vehicles["1"].segments[0].c1.y = 999;
  plan.vehicles["1"].points[0].x = 999;
  assert.equal(app.store.getState().points[0].x, 100);
  assert.equal(app.store.getState().segments[0].c1.y, 200);
});
test("local autosave restores a fresh app with all route geometry", () => {
  const storage = memoryStorage(), app = load(); seed(app);
  const session = app.sharing.createSession(app.store, () => storage);
  session.restore(); assert.equal(session.save().ok, true);
  const fresh = load();
  const restored = fresh.sharing.createSession(fresh.store, () => storage);
  assert.equal(restored.restore().ok, true);
  assert.deepEqual(plain(restored.snapshot()), plain(session.snapshot()));
});
test("shared HTML plans use isolated autosave keys and restore recipient edits on reload", () => {
  const storage = memoryStorage(), personal = load(); seed(personal);
  const workspace = personal.sharing.createSession(personal.store, () => storage);
  workspace.restore(); workspace.save();
  const personalBackup = storage.getItem("route-painter:plan:v1:workspace");
  const embedded = personal.plans.snapshot(personal.store.getState(), "share-test");
  const recipient = load();
  const shared = recipient.sharing.createSession(recipient.store, () => storage, JSON.stringify(embedded));
  assert.equal(shared.restore().ok, true);
  recipient.store.setState({ points: [...recipient.store.getState().points, { x: 700, y: 500 }] });
  shared.save();
  assert.equal(storage.getItem("route-painter:plan:v1:workspace"), personalBackup);
  const reopen = load();
  reopen.sharing.createSession(reopen.store, () => storage, JSON.stringify(embedded)).restore();
  assert.equal(reopen.store.getState().routes["2"].length, 3);
});
test("corrupt autosave is not overwritten, and import can explicitly resume saving", () => {
  const storage = memoryStorage(); storage.setItem("route-painter:plan:v1:workspace", "broken");
  const app = load(); const session = app.sharing.createSession(app.store, () => storage);
  assert.equal(session.restore().ok, false); assert.equal(session.save().ok, false);
  assert.equal(storage.getItem("route-painter:plan:v1:workspace"), "broken");
  session.enableSaving(); assert.equal(session.save().ok, true);
});
test("blocked storage still allows embedded routes to load and report autosave unavailable", () => {
  const source = load(); seed(source);
  const embedded = source.plans.snapshot(source.store.getState(), "offline-share");
  const app = load();
  const session = app.sharing.createSession(app.store, () => { throw new Error("storage unavailable"); }, JSON.stringify(embedded));
  assert.equal(session.restore().ok, false); assert.equal(session.save().ok, false);
  assert.equal(app.store.getState().routes["1"].length, 3);
});
test("malformed embedded data does not load an unrelated personal autosave", () => {
  const storage = memoryStorage(), app = load(); seed(app);
  const source = app.sharing.createSession(app.store, () => storage); source.restore(); source.save();
  const fresh = load();
  assert.equal(fresh.sharing.createSession(fresh.store, () => storage, "invalid").restore().ok, false);
  assert.equal(fresh.store.getState().points.length, 0);
});
test("JSON embedded into HTML cannot terminate its data script", () => {
  const { sharing } = load();
  const escaped = sharing.escapedJson({ text: "</script><script>bad()</script>" });
  assert.equal(escaped.includes("<"), false);
  assert.equal(JSON.parse(escaped).text, "</script><script>bad()</script>");
});

test("a stale window refuses to overwrite another window's newer autosave", () => {
  const storage = memoryStorage(), a = load(), b = load();
  const first = a.sharing.createSession(a.store, () => storage);
  first.restore(); first.save();
  const second = b.sharing.createSession(b.store, () => storage);
  second.restore();
  a.store.setState({ points: [{ x: 100, y: 100 }] });
  assert.equal(first.save().ok, true);
  const latest = storage.getItem("route-painter:plan:v1:workspace");
  b.store.setState({ team: "blue" });
  assert.equal(second.save().ok, false);
  assert.equal(second.save().message.includes("其他窗口"), true);
  assert.equal(storage.getItem("route-painter:plan:v1:workspace"), latest);
  assert.equal(second.snapshot().view.team, "blue");
});

test("a transient storage error is retried on the next save", () => {
  const app = load(), storage = memoryStorage();
  let fail = true;
  const session = app.sharing.createSession(app.store, () => ({
    getItem: storage.getItem,
    setItem(key, value) { if (fail) throw Error("temporary quota failure"); storage.setItem(key, value); }
  }));
  session.restore(); assert.equal(session.save().ok, false);
  fail = false; assert.equal(session.save().ok, true);
});

test("both vehicles share a 5000-point limit and a rejected addition leaves autosave healthy", () => {
  const app = load(), storage = memoryStorage();
  const session = app.sharing.createSession(app.store, () => storage); session.restore();
  app.store.setState({ points: Array.from({ length: 4999 }, (_, x) => ({ x: x % 1000, y: 100 })) });
  app.store.setState({ activeVehicle: "2", points: [{ x: 100, y: 100 }] });
  const before = app.store.getState();
  assert.throws(() => app.store.setState({ points: [...before.points, { x: 200, y: 200 }] }), /5000/);
  assert.equal(app.store.getState(), before);
  assert.equal(session.save().ok, true);
});
