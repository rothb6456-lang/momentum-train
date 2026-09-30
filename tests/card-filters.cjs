const assert = require('node:assert/strict');
const { matches, metadata } = require('../card-filters.js');
const bw = { id: 'bw', name: 'Bodyweight' }, db = { id: 'db', name: 'Dumbbell' }, cable = { id: 'cable', name: 'Cable' };
const catalog = [
 { id: 'squat', canonical_name: 'Squat', equipment: bw, body_structures: [{ id: 'quads' }] },
 { id: 'press', canonical_name: 'Dumbbell Press', equipment: db, name_maps: [{original_name:'DB Press'}] },
 { id: 'row', canonical_name: 'Cable Row', equipment: cable },
];
const card = names => ({ exerciseBlocks: names.map(exerciseName => ({ exerciseName })) });
assert(matches(card(['Squat']), catalog, { equipment:'bodyweight' }));
assert(!matches(card(['Unknown']), catalog, { equipment:'bodyweight' }));
assert(!matches(card(['Squat','DB Press']), catalog, { equipment:'bodyweight' }));
assert(matches(card(['Squat','DB Press']), catalog, { equipment:'db' }));
assert(!matches(card(['DB Press','Cable Row']), catalog, { equipment:'db' }));
assert(matches(card(['Squat','DB Press']), catalog, { equipment:'profile',equipmentIds:['db'] }));
assert(matches(card(['Squat']), catalog, {structureId:'quads'}));
assert(!matches(card(['Squat']), catalog, {structureId:'biceps'}));
const optional = card(['Squat']); optional.exerciseBlocks.push({ exerciseName:'Cable Row',optional:true });
assert(matches(optional,catalog,{equipment:'bodyweight'}));
assert.equal(metadata(card(['DB Press']),catalog).unknown.length,0);
assert(!matches(card([]),catalog,{equipment:'bodyweight'}));
console.log('Card filters: 11 assertions passed.');
