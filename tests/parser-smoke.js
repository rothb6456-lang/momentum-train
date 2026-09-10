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

const markdownCard = `# Phase 11 · Week 1 · Day 2

## Chest + Shoulder Performance + Triceps

### Warm-up

**Treadmill Walking**

5:00 | 4.8 mph | 5% incline

**Band External Rotation**

1 × 15 | 2-1-2 | RIR 4+

## Primary Chest

**Single-Arm Cable Press**

**3 × 10–12/side | 25 lb | 2-1-3 | RIR 2 | 90 sec**`;
const markdownParsed = vm.runInContext(`MomentumPlanner.parse(${JSON.stringify(markdownCard)})`, context);
const [warmup, , cablePress] = markdownParsed.exerciseBlocks;

if (markdownParsed.phaseId !== '11' || markdownParsed.week !== '1' || markdownParsed.day !== '2' ||
    markdownParsed.title !== 'Chest + Shoulder Performance + Triceps' ||
    warmup.exerciseName !== 'Treadmill Walking' || warmup.targetRepsOrDuration !== '5:00' ||
    cablePress.exerciseName !== 'Single-arm Cable Press' || cablePress.targetSets !== '3' ||
    cablePress.targetRepsOrDuration !== '10-12/side' || cablePress.targetWeightOrLoad !== '25 lb' ||
    cablePress.tempo !== '2-1-3' || cablePress.rir !== '2' || cablePress.rest !== '90 sec') {
  throw new Error(`Unexpected Markdown card result: ${JSON.stringify(markdownParsed)}`);
}

console.log('Markdown card parser smoke test passed');
