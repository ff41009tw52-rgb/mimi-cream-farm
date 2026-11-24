const TERMINALS = {
  battery: ['pos', 'neg'],
  bulb: ['tip', 'thread'],
  switch: ['in', 'out']
};

const keyOf = ({ compId, pointType }) => compId + ':' + pointType;
const EPSILON = 1e-8;

function solve(matrix, constants) {
  const size = matrix.length;
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(matrix[row][column]) > Math.abs(matrix[pivot][column])) pivot = row;
    }
    [matrix[column], matrix[pivot]] = [matrix[pivot], matrix[column]];
    [constants[column], constants[pivot]] = [constants[pivot], constants[column]];
    const divisor = matrix[column][column];
    for (let j = column; j < size; j += 1) matrix[column][j] /= divisor;
    constants[column] /= divisor;
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = matrix[row][column];
      for (let j = column; j < size; j += 1) matrix[row][j] -= factor * matrix[column][j];
      constants[row] -= factor * constants[column];
    }
  }
  return constants;
}

export function evaluateCircuit(components, wires) {
  const parents = new Map();
  const terminal = (component, pointType) => keyOf({ compId: component.id, pointType });
  for (const component of components) {
    for (const pointType of TERMINALS[component.type]) {
      const key = terminal(component, pointType);
      parents.set(key, key);
    }
  }

  function net(key) {
    const parent = parents.get(key);
    if (parent === key) return key;
    const root = net(parent);
    parents.set(key, root);
    return root;
  }

  for (const wire of wires) {
    const start = keyOf(wire.start);
    const end = keyOf(wire.end);
    if (parents.has(start) && parents.has(end)) parents.set(net(start), net(end));
  }

  for (const component of components) {
    if (component.type !== 'switch' || !component.closed) continue;
    const input = terminal(component, 'in');
    const output = terminal(component, 'out');
    parents.set(net(input), net(output));
  }

  // Wires join terminals at the same voltage. Each ideal battery adds one
  // relative unit from its negative net to its positive net.
  const sources = new Map();
  for (const key of parents.keys()) sources.set(net(key), []);
  for (const battery of components.filter(({ type }) => type === 'battery')) {
    const positive = net(terminal(battery, 'pos'));
    const negative = net(terminal(battery, 'neg'));
    sources.get(negative).push({ to: positive, change: 1 });
    sources.get(positive).push({ to: negative, change: -1 });
  }

  const netVoltage = new Map();
  const groups = [];
  for (const key of sources.keys()) {
    if (netVoltage.has(key)) continue;
    const group = { shorted: false, neighbours: new Set(), bulbs: new Set() };
    groups.push(group);
    netVoltage.set(key, { group, offset: 0 });
    const queue = [key];
    for (const from of queue) {
      for (const { to, change } of sources.get(from)) {
        const expected = netVoltage.get(from).offset + change;
        const existing = netVoltage.get(to);
        if (!existing) {
          netVoltage.set(to, { group, offset: expected });
          queue.push(to);
        } else if (Math.abs(existing.offset - expected) > EPSILON) {
          group.shorted = true;
        }
      }
    }
  }

  const bulbPower = new Map();
  for (const bulb of components.filter(({ type }) => type === 'bulb')) {
    bulbPower.set(bulb.id, 0);
    const a = netVoltage.get(net(terminal(bulb, 'tip')));
    const b = netVoltage.get(net(terminal(bulb, 'thread')));
    const branch = { id: bulb.id, a, b };
    a.group.bulbs.add(branch);
    b.group.bulbs.add(branch);
    a.group.neighbours.add(b.group);
    b.group.neighbours.add(a.group);
  }

  const visited = new Set();
  for (const ground of groups) {
    if (visited.has(ground)) continue;
    const region = [ground];
    const branches = new Set();
    visited.add(ground);
    for (const group of region) {
      for (const branch of group.bulbs) branches.add(branch);
      for (const neighbour of group.neighbours) {
        if (visited.has(neighbour)) continue;
        visited.add(neighbour);
        region.push(neighbour);
      }
    }
    if (region.some((group) => group.shorted)) continue;

    // All bulbs have the same resistance. Sum currents at each group and use
    // one reference voltage per connected circuit, including isolated circuits.
    const unknowns = region.slice(1);
    const index = new Map(unknowns.map((group, i) => [group, i]));
    const matrix = unknowns.map(() => Array(unknowns.length).fill(0));
    const constants = Array(unknowns.length).fill(0);
    for (const { a, b } of branches) {
      if (a.group === b.group) continue;
      const left = index.get(a.group);
      const right = index.get(b.group);
      const difference = a.offset - b.offset;
      if (left !== undefined) {
        matrix[left][left] += 1;
        constants[left] -= difference;
      }
      if (right !== undefined) {
        matrix[right][right] += 1;
        constants[right] += difference;
      }
      if (left !== undefined && right !== undefined) {
        matrix[left][right] -= 1;
        matrix[right][left] -= 1;
      }
    }

    const baseVoltage = solve(matrix, constants);
    const voltage = ({ group, offset }) => (baseVoltage[index.get(group)] ?? 0) + offset;
    for (const { id, a, b } of branches) {
      const difference = voltage(a) - voltage(b);
      bulbPower.set(id, Math.abs(difference) > EPSILON ? difference ** 2 : 0);
    }
  }

  return {
    bulbPower,
    litBulbIds: new Set([...bulbPower].filter(([, power]) => power > 0).map(([id]) => id)),
    directShort: groups.some((group) => group.shorted)
  };
}
