import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
function setup(shared = null) {
  const sandbox = vm.createContext({ window: {} });
  for (const name of ["store", "field", "curves", "plans", "library"]) vm.runInContext(readFileSync(new URL(`../src/${name}.js`, import.meta.url), "utf8"), sandbox);
  const app = sandbox.window.RoutePainter, data = shared || new Map();
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v) };
  let seq = 0;
  const controller = app.library.createController(() => storage, () => `id-${++seq}`);
  controller.restore();
  app.store.setState({ points: [{x:100,y:700},{x:800,y:700}], segments: [{type:"bezier",c1:{x:100,y:100},c2:{x:800,y:100}}] });
  app.store.setState({ activeVehicle:"2",points:[{x:200,y:200},{x:600,y:300}],coordinateMode:"relative",team:"blue" });
  return { ...app, controller, storage, data, plan: () => app.plans.snapshot(app.store.getState()) };
}
const plain = value => JSON.parse(JSON.stringify(value));
test("single and whole-library export preserve names, notes, both cars and curves", () => {
  const a = setup(), first = a.controller.save("双车 A","备注：先取物",a.plan());
  a.controller.save("双车 B","等待另一辆车",a.plan());
  const single = a.library.parse(a.controller.exportFile(first));
  assert.equal(single.items.length,1); assert.equal(single.items[0].notes,"备注：先取物");
  assert.equal(single.items[0].plan.vehicles["1"].segments[0].type,"bezier");
  const b = setup(); assert.equal(b.controller.merge(a.controller.exportFile()).added,2);
  assert.deepEqual(plain(b.controller.list()),plain(a.controller.list()));
  b.store.replacePlan(b.controller.list()[0].plan);
  assert.equal(b.store.getState().points.length,2);
  const fresh = setup(a.data);
  assert.equal(fresh.controller.list().length,2);
});
test("legacy route JSON imports as a named editable plan", () => {
  const a = setup();
  assert.equal(a.controller.merge(JSON.stringify(a.plan())).added,1);
  assert.equal(a.controller.list()[0].name,"导入的路线");
  assert.equal(a.controller.list()[0].plan.vehicles["2"].points.length,2);
});
test("same-name different plans remain separate; repeated imports are deduplicated", () => {
  const a = setup(), b = setup();
  a.controller.save("方案 A","旧内容",a.plan());
  b.controller.save("方案 A","队友新内容",b.plan());
  const file = b.controller.exportFile();
  assert.equal(a.controller.merge(file).added,1);
  assert.equal(a.controller.list().length,2);
  assert.notEqual(a.controller.list()[0].id,a.controller.list()[1].id);
  assert.equal(a.controller.merge(file).skipped,1);
  assert.equal(a.controller.list().length,2);
});
test("a malformed later entry never partially imports or overwrites existing storage", () => {
  const a = setup(); a.controller.save("现有","",a.plan());
  const file = JSON.parse(a.controller.exportFile());
  file.items.push({...file.items[0],id:"bad",name:"坏方案",plan:plain(file.items[0].plan)});
  file.items[1].plan.vehicles["2"].points[0].x = -1;
  const before = a.controller.exportFile(), storage = [...a.data.values()][0];
  assert.throws(()=>a.controller.merge(JSON.stringify(file)));
  assert.equal(a.controller.exportFile(),before); assert.equal([...a.data.values()][0],storage);
});
test("delete and update can be undone independently of canvas history", () => {
  const a = setup(), id = a.controller.save("原名","",a.plan());
  a.controller.save("新名","改备注",a.plan(),id); a.controller.undo();
  assert.equal(a.controller.list()[0].name,"原名");
  a.controller.remove(id); assert.equal(a.controller.list().length,0);
  a.controller.undo(); assert.equal(a.controller.list()[0].id,id);
  assert.equal(a.store.getState().routes["1"].length,2);
  const copy = a.controller.list(); copy[0].plan.vehicles["1"].points[0].x = 900;
  assert.equal(a.controller.list()[0].plan.vehicles["1"].points[0].x,100);
});
test("stale-window and quota failures leave the in-memory and persisted library unchanged", () => {
  const a = setup(), b = setup(a.data);
  a.controller.save("新方案","",a.plan());
  assert.throws(()=>b.controller.save("旧窗口","",b.plan()),/其他窗口/);
  assert.equal(b.controller.list().length,0);
  const before = a.controller.exportFile();
  a.storage.setItem = () => {throw Error("quota")};
  assert.throws(()=>a.controller.save("失败","",a.plan()),/未保存/);
  assert.equal(a.controller.exportFile(),before);
});
test("bad names, duplicate IDs, incompatible maps and future formats are rejected", () => {
  const a = setup();
  assert.throws(()=>a.controller.save("  ","",a.plan()));
  a.controller.save("合法","",a.plan());
  const base = JSON.parse(a.controller.exportFile());
  for (const change of [v=>v.libraryVersion=99,v=>v.items.push(v.items[0]),v=>v.items[0].plan.fieldId="other",v=>v.items[0].name="a".repeat(81)]) {
    const value=plain(base);change(value);assert.throws(()=>a.library.validate(value));
  }
  assert.throws(()=>a.library.parse("broken"));
});
