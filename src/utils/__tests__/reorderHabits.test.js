const { computeReorder } = require('../reorderHabits');

const habits = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

describe('computeReorder', () => {
  test('move forward: habit at index 0 moves to index 3', () => {
    const result = computeReorder(habits, [2, 3, 4, 1]);
    expect(result).toEqual([
      { id: 2, order_index: 0 },
      { id: 3, order_index: 1 },
      { id: 4, order_index: 2 },
      { id: 1, order_index: 3 },
    ]);
  });

  test('move backward: habit at index 3 moves to index 0', () => {
    const result = computeReorder(habits, [4, 1, 2, 3]);
    expect(result).toEqual([
      { id: 4, order_index: 0 },
      { id: 1, order_index: 1 },
      { id: 2, order_index: 2 },
      { id: 3, order_index: 3 },
    ]);
  });

  test('no-op: same order produces sequential 0-based indices', () => {
    const result = computeReorder(habits, [1, 2, 3, 4]);
    expect(result).toEqual([
      { id: 1, order_index: 0 },
      { id: 2, order_index: 1 },
      { id: 3, order_index: 2 },
      { id: 4, order_index: 3 },
    ]);
  });

  test('result always produces sequential 0-based order_index values', () => {
    const result = computeReorder(habits, [3, 1, 4, 2]);
    expect(result.map(r => r.order_index)).toEqual([0, 1, 2, 3]);
  });

  test('throws when IDs are incomplete (missing one)', () => {
    expect(() => computeReorder(habits, [1, 2, 3])).toThrow();
  });

  test('throws when IDs contain a foreign ID', () => {
    expect(() => computeReorder(habits, [1, 2, 3, 99])).toThrow();
  });

  test('throws when IDs contain duplicates', () => {
    expect(() => computeReorder(habits, [1, 2, 3, 3])).toThrow();
  });
});
