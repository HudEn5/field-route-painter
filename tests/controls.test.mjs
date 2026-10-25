import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

class Button extends EventTarget {
  constructor() {
    super();
    this.disabled = true;
  }
  click() {
    if (!this.disabled) this.dispatchEvent(new Event("click"));
  }
}

function loadControls(seed) {
  const sandbox = vm.createContext({ window: {} });
  for (const name of ["store", "controls"]) {
    const source = readFileSync(new URL(`../src/${name}.js`, import.meta.url), "utf8");
    vm.runInContext(source, sandbox, { filename: `${name}.js` });
  }
  const { store, controls } = sandbox.window.RoutePainter;
  if (seed) store.setState(seed);
  const elements = { undoButton: new Button(), clearButton: new Button() };
  const context = { store, elements };
  controls.init(context);
  return { store, controls, elements, context };
}

const threePoints = [{ x: 100, y: 100 }, { x: 500, y: 500 }, { x: 900, y: 200 }];

function assertButtons(elements, disabled) {
  assert.equal(elements.undoButton.disabled, disabled);
  assert.equal(elements.clearButton.disabled, disabled);
}

test("buttons reflect empty and populated state at initialization", () => {
  assertButtons(loadControls().elements, true);
  assertButtons(loadControls({ points: threePoints }).elements, false);
});

test("consecutive undo removes only the last point and preserves old snapshots", () => {
  const { store, elements } = loadControls({ points: threePoints });
  const original = store.getState();
  const remaining = [];
  store.subscribe(state => remaining.push(state.points.length));
  for (const length of [2, 1, 0]) {
    elements.undoButton.click();
    assert.deepEqual(Array.from(store.getState().points, p => [p.x, p.y]),
      threePoints.slice(0, length).map(p => [p.x, p.y]));
    assertButtons(elements, length === 0);
  }
  assert.deepEqual(remaining, [2, 1, 0]);
  assert.equal(original.points.length, 3);
  assert.equal(Object.isFrozen(original.points), true);
});

test("clear removes all points; new points enable the buttons again", () => {
  const { store, elements } = loadControls({ points: threePoints });
  elements.clearButton.click();
  assert.equal(store.getState().points.length, 0);
  assertButtons(elements, true);
  store.setState({ points: [threePoints[0]] });
  assertButtons(elements, false);
  elements.undoButton.click();
  assert.equal(store.getState().points.length, 0);
  assertButtons(elements, true);
});

test("undo and clear preserve blue team and hidden coordinates", () => {
  const { store, elements } = loadControls({
    points: threePoints, team: "blue", showCoordinates: false,
  });
  for (const button of [elements.undoButton, elements.clearButton]) {
    button.click();
    assert.equal(store.getState().team, "blue");
    assert.equal(store.getState().showCoordinates, false);
  }
});

test("synthetic empty actions do not change state or notify subscribers", () => {
  const { store, elements } = loadControls();
  const before = store.getState();
  let updates = 0;
  store.subscribe(() => updates++);
  for (let i = 0; i < 5; i++) {
    elements.undoButton.dispatchEvent(new Event("click"));
    elements.clearButton.dispatchEvent(new Event("click"));
  }
  assert.equal(store.getState(), before);
  assert.equal(updates, 0);
});

test("reinitialization still removes exactly one point per click", () => {
  const { store, controls, elements, context } = loadControls({ points: threePoints });
  controls.init(context);
  let updates = 0;
  store.subscribe(() => updates++);
  elements.undoButton.click();
  assert.equal(store.getState().points.length, 2);
  assert.equal(updates, 1);
});

test("replacing buttons removes actions and subscriptions from the old buttons", () => {
  const { store, controls, elements } = loadControls({ points: threePoints });
  const replacement = { undoButton: new Button(), clearButton: new Button() };
  controls.init({ store, elements: replacement });
  const before = store.getState();
  elements.undoButton.dispatchEvent(new Event("click"));
  elements.clearButton.dispatchEvent(new Event("click"));
  assert.equal(store.getState(), before);
  replacement.clearButton.click();
  assertButtons(replacement, true);
  // Detached buttons must stop receiving state updates.
  assertButtons(elements, false);
});

test("switching stores unsubscribes from the previous store", () => {
  const first = loadControls({ points: threePoints });
  const second = loadControls({ points: [threePoints[0]] });
  first.controls.init({ store: second.store, elements: first.elements });
  first.store.setState({ points: [] });
  assertButtons(first.elements, false);
  first.elements.undoButton.click();
  assert.equal(second.store.getState().points.length, 0);
  assertButtons(first.elements, true);
});

test("destroy is safe to repeat; it removes events and state subscriptions", () => {
  const { store, controls, elements, context } = loadControls({ points: threePoints });
  controls.destroy();
  controls.destroy();
  const before = store.getState();
  elements.undoButton.dispatchEvent(new Event("click"));
  elements.clearButton.dispatchEvent(new Event("click"));
  assert.equal(store.getState(), before);
  store.setState({ points: [] });
  assertButtons(elements, false);
  controls.init(context);
  assertButtons(elements, true);
  store.setState({ points: threePoints });
  elements.undoButton.click();
  assert.equal(store.getState().points.length, 2);
});
