/* Derive card metadata from canonical catalog records; unknown never means bodyweight. */
(function (root) {
  const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const bodyweight = equipment => /^(body ?weight|none|no equipment)$/.test(normalize(equipment?.name));
  function metadata(card, catalog) {
    const equipment = new Map(), structures = new Map(), unknown = [];
    const required = (card.exerciseBlocks || []).filter(block => !block.optional);
    for (const block of required) {
      const name = normalize(block.exerciseName || block.name);
      const exercise = catalog.find(ex => (block.exerciseId && ex.id === block.exerciseId)
        || normalize(ex.canonical_name) === name
        || (ex.aliases || ex.name_maps || []).some(alias => normalize(typeof alias === 'string' ? alias : alias.original_name) === name));
      if (!exercise || !exercise.equipment) { unknown.push(block.exerciseName || block.name); continue; }
      equipment.set(exercise.equipment.id, exercise.equipment);
      for (const structure of (exercise.bodyStructures || exercise.body_structures || [])) structures.set(structure.id, structure);
    }
    return { equipment: [...equipment.values()], structures: [...structures.values()], unknown,
      complete: required.length > 0 && unknown.length === 0 };
  }
  function matches(card, catalog, filters = {}) {
    const meta = metadata(card, catalog);
    if (filters.structureId && !meta.structures.some(s => s.id === filters.structureId)) return false;
    if (filters.equipment === 'bodyweight') return meta.complete && meta.equipment.every(bodyweight);
    if (filters.equipment === 'profile') {
      const allowed = new Set(filters.equipmentIds || []);
      return meta.complete && meta.equipment.every(e => bodyweight(e) || allowed.has(e.id));
    }
    if (filters.equipment && filters.equipment !== 'all') {
      return meta.complete && meta.equipment.every(e => bodyweight(e) || e.id === filters.equipment);
    }
    return true;
  }
  root.MomentumCardFilters = { metadata, matches };
  if (typeof module !== 'undefined') module.exports = root.MomentumCardFilters;
})(typeof window === 'undefined' ? globalThis : window);
