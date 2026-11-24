import assert from 'node:assert/strict';
import { evaluateCircuit } from '../games/08/circuit.js';
import { distanceToWire, routeWire } from '../games/08/wire-route.js';

const battery = (id) => ({ id, type: 'battery' });
const bulb = (id) => ({ id, type: 'bulb' });
const wire = (a, left, b, right) => ({
  start: { compId: a, pointType: left },
  end: { compId: b, pointType: right }
});
const positive = wire('B1', 'pos', 'L1', 'tip');
const negative = wire('B1', 'neg', 'L1', 'thread');

function expectPower(name, components, wires, expected, short = false) {
  const result = evaluateCircuit(components, wires);
  assert.equal(result.directShort, short, name);
  assert.deepEqual([...result.bulbPower], Object.entries(expected), name);
  assert.deepEqual([...result.litBulbIds], Object.keys(expected).filter((id) => expected[id] > 0), name);
}

expectPower('guided circuit with a wire removed', [battery('B1'), bulb('L1')], [positive], { L1: 0 });
expectPower('guided closed circuit', [battery('B1'), bulb('L1')], [positive, negative], { L1: 1 });
expectPower('swapping bulb contacts still lights a filament bulb', [battery('B1'), bulb('L1')], [
  wire('B1', 'pos', 'L1', 'thread'), wire('L1', 'tip', 'B1', 'neg')
], { L1: 1 });
expectPower('an unattached battery cannot increase brightness', [battery('B1'), battery('B2'), bulb('L1')], [
  positive, negative
], { L1: 1 });
expectPower('two identical batteries in series', [battery('B1'), battery('B2'), bulb('L1')], [
  positive, wire('B1', 'neg', 'B2', 'pos'), wire('L1', 'thread', 'B2', 'neg')
], { L1: 4 });
expectPower('two identical batteries in parallel', [battery('B1'), battery('B2'), bulb('L1')], [
  positive, negative, wire('B1', 'neg', 'B2', 'neg'), wire('B1', 'pos', 'B2', 'pos')
], { L1: 1 });
expectPower('two equivalent series bulbs are dimmer', [battery('B1'), bulb('L1'), bulb('L2')], [
  positive, wire('L1', 'thread', 'L2', 'tip'), wire('L2', 'thread', 'B1', 'neg')
], { L1: 0.25, L2: 0.25 });
expectPower('two equivalent parallel bulbs have independent paths', [battery('B1'), bulb('L1'), bulb('L2')], [
  positive, negative, wire('B1', 'pos', 'L2', 'tip'), wire('B1', 'neg', 'L2', 'thread')
], { L1: 1, L2: 1 });
expectPower('a bulb wired to one net on both contacts stays dark', [battery('B1'), bulb('L1'), bulb('L2')], [
  positive, negative, wire('B1', 'pos', 'L2', 'tip'), wire('B1', 'pos', 'L2', 'thread')
], { L1: 1, L2: 0 });
expectPower('wire directly across a battery shorts that circuit', [battery('B1'), bulb('L1')], [
  positive, negative, wire('B1', 'pos', 'B1', 'neg')
], { L1: 0 }, true);
expectPower('short in an independent circuit preserves the working lamp', [battery('B1'), battery('B2'), bulb('L1')], [
  positive, negative, wire('B2', 'pos', 'B2', 'neg')
], { L1: 1 }, true);
expectPower('opposed identical batteries connected in parallel constitute a short', [
  battery('B1'), battery('B2'), bulb('L1')
], [positive, negative, wire('B1', 'pos', 'B2', 'neg'), wire('B1', 'neg', 'B2', 'pos')], { L1: 0 }, true);

console.log('Circuit 08 passed all 12 regression cases.');

const switched = [
  wire('B1', 'pos', 'S', 'in'), wire('S', 'out', 'SA', 'in'), wire('S', 'out', 'SB', 'in'),
  wire('SA', 'out', 'L1', 'tip'), negative,
  wire('SB', 'out', 'L2', 'tip'), wire('L2', 'thread', 'B1', 'neg')
];
function expectSwitches(name, main, a, b, expected) {
  expectPower(name, [
    battery('B1'), bulb('L1'), bulb('L2'),
    ...[['S', main], ['SA', a], ['SB', b]].map(([id, closed]) => ({ id, type: 'switch', closed }))
  ], switched, expected);
}
expectSwitches('closed master switch supplies both parallel branches', true, true, true, { L1: 1, L2: 1 });
expectSwitches('room A switch controls only its own branch', true, false, true, { L1: 0, L2: 1 });
expectSwitches('room B switch controls only its own branch', true, true, false, { L1: 1, L2: 0 });
expectSwitches('open master switch interrupts both branches', false, true, true, { L1: 0, L2: 0 });
console.log('Campus repair passed all four switch regression cases.');


const size = { width: 700, height: 350 };
const coordinates = ({ x, y }) => [x, y];
function expectOrthogonal(route, start, end) {
  assert.deepEqual(coordinates(route.points[0]), coordinates(start), 'fixed starting terminal');
  assert.deepEqual(coordinates(route.points.at(-1)), coordinates(end), 'fixed ending terminal');
  for (let i = 1; i < route.points.length; i += 1) {
    assert.ok(route.points[i - 1].x === route.points[i].x || route.points[i - 1].y === route.points[i].y);
  }
  assert.ok(distanceToWire(route.handle, route.points) < 0.001);
}

const start = { x: 100, y: 160, dx: 1, dy: 0 };
const end = { x: 500, y: 160, dx: -1, dy: 0 };
const straight = routeWire(start, end, size);
expectOrthogonal(straight, start, end);
assert.equal(straight.axis, 'y', 'move a horizontal segment up or down');
assert.deepEqual(straight.points.map(coordinates), [[100, 160], [500, 160]]);
const movedHorizontal = routeWire(start, end, size, [], { axis: straight.axis, track: 235 });
expectOrthogonal(movedHorizontal, start, end);
assert.equal(movedHorizontal.handle.y, 235);
assert.ok(movedHorizontal.points.length > 2);

const top = { x: 260, y: 45, dx: 0, dy: 1 };
const bottom = { x: 260, y: 290, dx: 0, dy: -1 };
const vertical = routeWire(top, bottom, size);
assert.equal(vertical.axis, 'x', 'move a vertical segment left or right');
const movedVertical = routeWire(top, bottom, size, [], { axis: vertical.axis, track: 375 });
expectOrthogonal(movedVertical, top, bottom);
assert.equal(movedVertical.handle.x, 375);

const batteryBox = { left: 100, top: 110, right: 247, bottom: 175 };
const bulbBox = { left: 490, top: 100, right: 558, bottom: 205 };
const positivePort = { x: 101, y: 140, dx: -1, dy: 0, box: batteryBox };
const bulbPort = { x: 525, y: 205, dx: 0, dy: 1, box: bulbBox };
const bent = routeWire(positivePort, bulbPort, size, [batteryBox, bulbBox]);
expectOrthogonal(bent, positivePort, bulbPort);
assert.equal(bent.blocked, 0, 'avoid crossing the battery casing or reversing at a contact');
assert.ok(bent.points[1].x < positivePort.x);

const stackedSize = { width: 296, height: 344 };
const rotatedPort = { x: 148, y: 194, dx: 0.707, dy: 0.707 };
const stackedPort = { x: 126, y: 284, dx: -1, dy: 0 };
const stacked = routeWire(rotatedPort, stackedPort, stackedSize);
expectOrthogonal(stacked, rotatedPort, stackedPort);
assert.ok(stacked.points.every(({ x, y }) => x >= 0 && y >= 0 && x <= stackedSize.width && y <= stackedSize.height));
console.log('Wire routing passed: straight and right-angle routes, dragged tracks, fixed metal terminals, and narrow-board bounds.');
