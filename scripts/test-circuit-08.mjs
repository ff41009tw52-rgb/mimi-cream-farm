import assert from 'node:assert/strict';
import { evaluateCircuit } from '../games/08/circuit.js';

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
