const fs = require('fs');
const vm = require('vm');

const context = {
  console,
  window: {},
  localStorage: { getItem: () => '[]', setItem() {} }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('planner.js', 'utf8'), context);

const card = `Phase 10 - Week 1 Day 1

| Exercise | Sets | Reps | Load |
| --- | --- | --- | --- |
| Goblet Squat | 3 | 8-10 | 60 lbs |
`;
const parsed = vm.runInContext(`MomentumPlanner.parse(${JSON.stringify(card)})`, context);
const [exercise] = parsed.exerciseBlocks;

if (exercise.exerciseName !== 'Goblet Squat' ||
    exercise.targetSets !== '3' ||
    exercise.targetRepsOrDuration !== '8-10' ||
    exercise.targetWeightOrLoad !== '60 lbs') {
  throw new Error(`Unexpected parser result: ${JSON.stringify(exercise)}`);
}

console.log('Parser smoke test passed');
