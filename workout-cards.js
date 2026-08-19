/* Prescribed cards are separate from performed session logs. */
const WorkoutCards = {
  phase9week3day2: {
    phase: 9, week: 3, day: 2, name: 'Heavy Push + Shoulder Performance',
    shoulderPrompts: ['Pre-session', 'Floor press', 'Supine press', 'Overhead press', 'Post-session'],
    exercises: [
      {name:'Treadmill Walking',type:'time',target:'5:00 / 4.6 mph / 5% incline',intent:'General warm-up.'},
      {name:'Shoulder Preparation',type:'reps',target:'2 rounds: pull-aparts 15; external rotations 12; wall slides 8; scap push-ups 8-10',intent:'Cuff endurance + scapular control.',checkpoint:'Shoulders organized and ready for pressing.',stoplight:'Red: pain or altered mechanics.'},
      {name:'Single-Arm Cable Press',type:'reps',target:'1 x 10/side / 15-20 lb / 2-1-3 / RIR 4+ / 90 sec',tempo:'2-1-3',rir:'4+',intent:'Pressing primer and symptom checkpoint.',checkpoint:'Compare right vs left before heavy loading.',stoplight:'Stop if right anterior/biceps sensation escalates.'},
      {name:'Neutral-Grip DB Floor Press',type:'reps',target:'110 x 10; 130 x 10; 140 x 6-8; 150 x 5-6 x 2 / 2-1-3 / 3-4 min',tempo:'2-1-3',intent:'Primary horizontal pressing strength; consolidate 150 lb.',checkpoint:'Compare right anterior/biceps awareness against Week 2.',stoplight:'Red: pain, weakness, altered path, or loss of control.'},
      {name:'Supine Plate-Loaded Press',type:'reps',target:'50 x 10; 90 x 10; 100 x 8-10 / 2-1-3 / 2-3 min',tempo:'2-1-3',intent:'Secondary bilateral pressing volume; consolidate 100 lb.',checkpoint:'Week 2 biceps-tendon awareness at 90 lb.',stoplight:'Do not chase reps if awareness progressively increases.'},
      {name:'Cable High-to-Mid Fly',type:'reps',target:'30 x 12; 40 x 10-12; 50 x 8-10 / 2-2-3',tempo:'2-2-3',rir:'2 to 1-2',intent:'Chest hypertrophy through controlled adduction.',checkpoint:'Maintain established ROM and cable path.',stoplight:'No shoulder-driven compensation.'},
      {name:'Seated Neutral-Grip DB Overhead Press',type:'reps',target:'50 x 10-12; 60 x 8-10 x 2 / 2-1-3',tempo:'2-1-3',rir:'1-2',intent:'Overhead performance + reintegration; consolidate 60 lb total.',checkpoint:'Week 2: 50 x 12, 60 x 10, 60 x 8.',stoplight:'No forced lockout.'},
      {name:'Single-Arm Overhead Cable Extension',type:'reps',target:'25 x 10; 25 x 9; 25 x 8-10 / 2-1-3',tempo:'2-1-3',rir:'1-2',intent:'Triceps hypertrophy.',checkpoint:'Match Week 2 before load increase.',stoplight:'Avoid compensatory shoulder movement.'},
      {name:'High Cable Triceps Pushdown',type:'reps',target:'80 x 8; 80 x 7-8; 80 x 6-8 / 3-1-2',tempo:'3-1-2',rir:'1-2',intent:'High-tension triceps hypertrophy.',checkpoint:'Improve third set at 80 lb.',stoplight:'Maintain 3-second eccentric.'},
      {name:'Cable Lateral Raise / Elbow Strap',type:'reps',target:'10-15 x 12-15 / 2-1-2',tempo:'2-1-2',intent:'Deltoid hypertrophy with low grip demand.',checkpoint:'Maintain consistent arc.',stoplight:'Avoid trunk compensation.'},
      {name:'Internal Cable Rotation',type:'reps',target:'12.5 x 12-15 x 3 / 2-1-2',tempo:'2-1-2',rir:'2',intent:'Rotator-cuff capacity.',checkpoint:'5-lb plate between elbow and torso.',stoplight:'Controlled effort only.'},
      {name:'Dead Hang',type:'time',target:'60 sec; 43-60 sec / bodyweight / 2 min+',intent:'Grip endurance + hanging tolerance.',checkpoint:'Record exact duration and onset of grip deterioration.',stoplight:'End when grip mechanics meaningfully deteriorate.'}
    ]
  }
};
