function computeReorder(currentHabits, newOrderIds) {
  if (newOrderIds.length !== currentHabits.length) {
    throw new Error(`Expected ${currentHabits.length} IDs, got ${newOrderIds.length}`);
  }
  const currentIds = new Set(currentHabits.map(h => h.id));
  const seen = new Set();
  for (const id of newOrderIds) {
    if (!currentIds.has(id)) throw new Error(`ID ${id} not found in current habits`);
    if (seen.has(id)) throw new Error(`Duplicate ID ${id}`);
    seen.add(id);
  }
  return newOrderIds.map((id, index) => ({ id, order_index: index }));
}

module.exports = { computeReorder };
