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
window.MomentumWorkoutCards = window.MomentumWorkoutCards || {};

Object.assign(window.MomentumWorkoutCards, {  
  starterCards: [  
    {  
      key: 'control',  
      title: 'Control',  
      descriptor: 'Learn movement quality and controlled reps.',  
      purpose: 'Learn what controlled resistance training feels like.',  
      equipment: 'Dumbbells + cable',  
      duration: '35–45 min',  
      sourceType: 'starter',  
      lesson: 'Learn the movement.',  
      coachFocus: 'Do not increase weight because the exercise feels easy. Your first objective is consistent movement.',  
      loadGuidance: 'Choose a weight that allows you to complete every prescribed repetition with clean technique while feeling you could perform approximately 2-4 additional repetitions.',  
      exerciseBlocks: [  
        {  
          exerciseName: 'Goblet Squat',  
          targetSets: '3',  
          targetRepsOrDuration: '8 reps',  
          targetWeightOrLoad: 'Light',  
          tempo: '3-1-2',  
          rir: '4',  
          notes: 'Intent: Learn the squat pattern. Cues: Hold the dumbbell close. Sit between your hips. Keep the whole foot planted. Stand smoothly.',  
          checkpoints: 'Could you stop the movement at any point without losing position?'  
        },  
        {  
          exerciseName: 'Neutral-Grip Dumbbell Floor Press',  
          targetSets: '3',  
          targetRepsOrDuration: '8 reps',  
          targetWeightOrLoad: 'Light',  
          tempo: '3-1-2',  
          rir: '4',  
          notes: 'Intent: Learn controlled pressing. Cues: Lower slowly. Pause gently. Press without bouncing.',  
          checkpoints: 'Feel the chest and triceps working rather than simply moving the dumbbells.'  
        },  
        {  
          exerciseName: 'Seated Neutral-Grip Cable Row',  
          targetSets: '3',  
          targetRepsOrDuration: '10 reps',  
          targetWeightOrLoad: 'Light-moderate',  
          tempo: '2-1-3',  
          rir: '3-4',  
          notes: 'Intent: Learn to pull with the upper back. Cues: Keep the torso stable. Pull toward the lower ribs. Pause. Return slowly.',  
          checkpoints: 'Your torso should not rock backward to finish repetitions.'  
        },  
        {  
          exerciseName: 'Cable Triceps Pushdown',  
          targetSets: '2',  
          targetRepsOrDuration: '12 reps',  
          targetWeightOrLoad: 'Light',  
          tempo: '2-1-3',  
          rir: '3',  
          notes: 'Intent: Learn isolated elbow extension. Cues: Keep elbows relatively fixed. Extend completely without swinging.',  
          checkpoints: ''  
        },  
        {  
          exerciseName: 'Seated Alternating Dumbbell Curl',  
          targetSets: '2',  
          targetRepsOrDuration: '10 reps/arm',  
          targetWeightOrLoad: 'Light',  
          tempo: '2-1-3',  
          rir: '3',  
          notes: 'Intent: Learn to identify biceps contraction. Cues: Keep upper arm quiet. Curl smoothly. Squeeze briefly. Lower under control.',  
          checkpoints: ''  
        }  
      ]  
    },  
    {  
      key: 'strength',  
      title: 'Strength',  
      descriptor: 'Learn to produce force safely.',  
      purpose: 'Introduce heavier resistance without turning the session into a testing session.',  
      equipment: 'Machines + dumbbells',  
      duration: '40–50 min',  
      sourceType: 'starter',  
      lesson: 'Learn to produce force.',  
      coachFocus: 'Strength training does not mean lifting the heaviest weight you see. For a novice, strength starts with learning to produce force repeatedly while maintaining technique.',  
      loadGuidance: 'Choose a weight that allows you to complete every prescribed repetition with clean technique while feeling you could perform approximately 2-4 additional repetitions.',  
      exerciseBlocks: [  
        {  
          exerciseName: 'Leg Press',  
          targetSets: '3',  
          targetRepsOrDuration: '6-8 reps',  
          targetWeightOrLoad: 'Moderate',  
          tempo: '2-1-2',  
          rir: '2-3',  
          notes: 'Intent: Build lower-body strength with a stable machine. Cues: Control the descent. Keep your feet planted. Drive evenly through the foot.',  
          checkpoints: ''  
        },  
        {  
          exerciseName: 'Machine Row',  
          targetSets: '3',  
          targetRepsOrDuration: '6-8 reps',  
          targetWeightOrLoad: 'Moderate',  
          tempo: '2-1-2',  
          rir: '2',  
          notes: 'Intent: Develop upper-back pulling strength. Cues: Establish your chest position first. Pull smoothly. Do not use momentum.',  
          checkpoints: ''  
        },  
        {  
          exerciseName: 'Neutral-Grip Dumbbell Floor Press',  
          targetSets: '3',  
          targetRepsOrDuration: '6-8 reps',  
          targetWeightOrLoad: 'Moderate',  
          tempo: '2-1-2',  
          rir: '2',  
          notes: 'Intent: Develop horizontal pressing strength. Cues: Set your shoulders. Lower under control. Press evenly.',  
          checkpoints: ''  
        },  
        {  
          exerciseName: 'Bulgarian Split Squat',  
          targetSets: '2',  
          targetRepsOrDuration: '8 reps/side',  
          targetWeightOrLoad: 'Light-moderate',  
          tempo: '2-1-2',  
          rir: '2-3',  
          notes: 'Intent: Introduce unilateral strength and balance. Cues: Descend under control. Keep the front foot stable. Drive through the front leg.',  
          checkpoints: ''  
        },  
        {  
          exerciseName: 'Rope Pushdown',  
          targetSets: '2',  
          targetRepsOrDuration: '8-10 reps',  
          targetWeightOrLoad: 'Moderate',  
          tempo: '2-1-2',  
          rir: '2',  
          notes: 'Intent: Basic arm strength.',  
          checkpoints: ''  
        }  
      ]  
    },  
    {  
      key: 'endurance',  
      title: 'Endurance',  
      descriptor: 'Learn to sustain useful work.',  
      purpose: 'Teach the novice to sustain useful work without chasing exhaustion.',  
      equipment: 'Cable + dumbbells + treadmill',  
      duration: '35–45 min',  
      sourceType: 'starter',  
      lesson: 'Learn to sustain work.',  
      coachFocus: 'Endurance means maintaining output and movement quality. It does not require leaving the gym exhausted.',  
      loadGuidance: 'Choose a weight that allows you to complete every prescribed repetition with clean technique while feeling you could perform approximately 2-4 additional repetitions.',  
      exerciseBlocks: [  
        {  
          exerciseName: 'Treadmill Walk',  
          targetSets: '1',  
          targetRepsOrDuration: '8 min',  
          targetWeightOrLoad: 'Easy-moderate',  
          tempo: '',  
          rir: '',  
          notes: 'Intent: Raise body temperature and begin cardiovascular work. Target: Conversational pace.',  
          checkpoints: ''  
        },  
        {  
          exerciseName: 'Goblet Squat',  
          targetSets: '2',  
          targetRepsOrDuration: '12 reps',  
          targetWeightOrLoad: 'Light',  
          tempo: '2-1-2',  
          rir: '3',  
          notes: '',  
          checkpoints: ''  
        },  
        {  
          exerciseName: 'Cable Row',  
          targetSets: '2',  
          targetRepsOrDuration: '12-15 reps',  
          targetWeightOrLoad: 'Light-moderate',  
          tempo: '2-1-2',  
          rir: '3',  
          notes: '',  
          checkpoints: ''  
        },  
        {  
          exerciseName: 'Dumbbell Floor Press',  
          targetSets: '2',  
          targetRepsOrDuration: '12 reps',  
          targetWeightOrLoad: 'Light',  
          tempo: '2-1-2',  
          rir: '3',  
          notes: '',  
          checkpoints: ''  
        },  
        {  
          exerciseName: "Farmer's Hold",  
          targetSets: '3',  
          targetRepsOrDuration: '30-45 sec',  
          targetWeightOrLoad: 'Moderate',  
          tempo: '',  
          rir: '',  
          notes: 'Intent: Grip and whole-body endurance. Stop before grip failure. Cues: Stand tall. Crush the handles. Keep the shoulders organized. Breathe normally.',  
          checkpoints: ''  
        },  
        {  
          exerciseName: 'Treadmill or Rower',  
          targetSets: '1',  
          targetRepsOrDuration: '10 min',  
          targetWeightOrLoad: 'Moderate',  
          tempo: '',  
          rir: '',  
          notes: 'Intent: Build aerobic capacity without sprinting. Effort: Approximately 5-6/10.',  
          checkpoints: ''  
        }  
      ]  
    },  
    {  
      key: 'longevity',  
      title: 'Longevity',  
      descriptor: 'Build a broad physical base.',  
      purpose: 'Build the movement patterns and physical capacities that remain useful over decades.',  
      equipment: 'Dumbbells + machine + cable + cardio',  
      duration: '40–55 min',  
      sourceType: 'starter',  
      lesson: 'Build a broad physical base.',  
      coachFocus: 'Longevity training is not a collection of corrective exercises. It is exposure to major movement patterns, resistance training, grip, control, and aerobic work.',  
      loadGuidance: 'Choose a weight that allows you to complete every prescribed repetition with clean technique while feeling you could perform approximately 2-4 additional repetitions.',  
      exerciseBlocks: [  
        {  
          exerciseName: 'Treadmill Walk',  
          targetSets: '1',  
          targetRepsOrDuration: '5-8 min',  
          targetWeightOrLoad: 'Easy-moderate',  
          tempo: '',  
          rir: '',  
          notes: 'Intent: General warm-up and aerobic exposure.',  
          checkpoints: ''  
        },  
        {  
          exerciseName: 'Romanian Dumbbell Deadlift',  
          targetSets: '3',  
          targetRepsOrDuration: '8 reps',  
          targetWeightOrLoad: 'Light-moderate',  
          tempo: '3-1-2',  
          rir: '3',  
          notes: 'Intent: Learn the hip-hinge pattern and train the posterior chain. Cues: Push the hips backward. Keep the dumbbells close to your legs. Maintain a neutral spine. Stand by driving the hips forward.',  
          checkpoints: 'You should feel the hamstrings lengthen during the descent.'  
        },  
        {  
          exerciseName: 'Goblet Squat',  
          targetSets: '3',  
          targetRepsOrDuration: '8-10 reps',  
          targetWeightOrLoad: 'Light-moderate',  
          tempo: '3-1-2',  
          rir: '3',  
          notes: 'Intent: Build knee-dominant lower-body strength.',  
          checkpoints: ''  
        },  
        {  
          exerciseName: 'Machine Row',  
          targetSets: '2',  
          targetRepsOrDuration: '10-12 reps',  
          targetWeightOrLoad: 'Moderate',  
          tempo: '2-1-2',  
          rir: '3',  
          notes: 'Intent: Upper-back strength and posture-supporting musculature.',  
          checkpoints: ''  
        },  
        {  
          exerciseName: 'Cable Pallof Press',  
          targetSets: '2',  
          targetRepsOrDuration: '10 reps/side',  
          targetWeightOrLoad: 'Light',  
          tempo: '2-1-2',  
          rir: '3',  
          notes: 'Intent: Develop trunk stability and resistance to rotation.',  
          checkpoints: ''  
        },  
        {  
          exerciseName: "Farmer's Carry",  
          targetSets: '3',  
          targetRepsOrDuration: '30-45 sec',  
          targetWeightOrLoad: 'Moderate',  
          tempo: '',  
          rir: '2',  
          notes: 'Intent: Grip, trunk stability, and loaded locomotion. Cues: Tall torso. Controlled steps. Do not allow the weight to pull you sideways.',  
          checkpoints: ''  
        },  
        {  
          exerciseName: 'Easy Cardio',  
          targetSets: '1',  
          targetRepsOrDuration: '10-15 min',  
          targetWeightOrLoad: 'Easy-moderate',  
          tempo: '',  
          rir: '',  
          notes: 'Intent: Aerobic capacity and recovery. Treadmill, bike, or rower.',  
          checkpoints: ''  
        }  
      ]  
    },
{  
  key: 'upper-push',  
  title: 'Upper Body — Push Focus',  
  descriptor: 'Chest, shoulders, triceps. Machine + dumbbell friendly.',  
  equipment: 'Dumbbells, cable machine, bench',  
  duration: '40–50 min',  
  lesson: 'Pressing patterns and overhead stability',  
  exerciseBlocks: [  
    { id: 'up1', order: 1, exerciseName: 'Flat Dumbbell Press', targetSets: '3', targetRepsOrDuration: '8-12', targetWeightOrLoad: '', tempo: '3-1-2', rir: '2', rest: '2 min', notes: '', section: 'primary', timed: false, optional: false },  
    { id: 'up2', order: 2, exerciseName: 'Incline Dumbbell Press', targetSets: '3', targetRepsOrDuration: '8-12', targetWeightOrLoad: '', tempo: '3-1-2', rir: '2', rest: '90 sec', notes: '', section: 'primary', timed: false, optional: false },  
    { id: 'up3', order: 3, exerciseName: 'Cable Lateral Raise', targetSets: '3', targetRepsOrDuration: '12-15', targetWeightOrLoad: '', tempo: '2-1-2', rir: '2', rest: '60 sec', notes: '', section: 'primary', timed: false, optional: false },  
    { id: 'up4', order: 4, exerciseName: 'Overhead Dumbbell Press', targetSets: '3', targetRepsOrDuration: '8-10', targetWeightOrLoad: '', tempo: '3-1-2', rir: '2-3', rest: '2 min', notes: 'Seated or standing', section: 'primary', timed: false, optional: false },  
    { id: 'up5', order: 5, exerciseName: 'Rope Triceps Pushdown', targetSets: '3', targetRepsOrDuration: '10-15', targetWeightOrLoad: '', tempo: '2-1-2', rir: '1-2', rest: '60 sec', notes: '', section: 'primary', timed: false, optional: false }  
  ]  
},  
{  
  key: 'upper-pull',  
  title: 'Upper Body — Pull Focus',  
  descriptor: 'Back, biceps, rear delts. Row and curl variations.',  
  equipment: 'Cable machine, dumbbells, pull-up bar optional',  
  duration: '40–50 min',  
  lesson: 'Pulling patterns and scapular control',  
  exerciseBlocks: [  
    { id: 'upl1', order: 1, exerciseName: 'Lat Pulldown', targetSets: '3', targetRepsOrDuration: '8-12', targetWeightOrLoad: '', tempo: '3-1-2', rir: '2', rest: '2 min', notes: '', section: 'primary', timed: false, optional: false },  
    { id: 'upl2', order: 2, exerciseName: 'Chest-Supported DB Row', targetSets: '3', targetRepsOrDuration: '8-12', targetWeightOrLoad: '', tempo: '3-1-2', rir: '2', rest: '90 sec', notes: '', section: 'primary', timed: false, optional: false },  
    { id: 'upl3', order: 3, exerciseName: 'Reverse Pec Deck', targetSets: '3', targetRepsOrDuration: '12-15', targetWeightOrLoad: '', tempo: '2-1-2', rir: '2', rest: '60 sec', notes: '', section: 'primary', timed: false, optional: false },  
    { id: 'upl4', order: 4, exerciseName: 'Standing Cable Curl', targetSets: '3', targetRepsOrDuration: '10-12', targetWeightOrLoad: '', tempo: '2-1-2', rir: '1-2', rest: '60 sec', notes: '', section: 'primary', timed: false, optional: false },  
    { id: 'upl5', order: 5, exerciseName: 'Hammer Curl', targetSets: '2', targetRepsOrDuration: '10-12', targetWeightOrLoad: '', tempo: '2-1-2', rir: '2', rest: '60 sec', notes: 'Optional finisher', section: 'optional', timed: false, optional: true }  
  ]  
},  
{  
  key: 'lower-body',  
  title: 'Lower Body — Strength',  
  descriptor: 'Quads, hamstrings, glutes. Squat and hinge patterns.',  
  equipment: 'Barbell or dumbbells, leg press optional',  
  duration: '45–55 min',  
  lesson: 'Hip hinge and squat mechanics under load',  
  exerciseBlocks: [  
    { id: 'lb1', order: 1, exerciseName: 'Goblet Squat', targetSets: '3', targetRepsOrDuration: '8-12', targetWeightOrLoad: '', tempo: '3-1-2', rir: '2', rest: '2 min', notes: 'Focus on depth and upright torso', section: 'primary', timed: false, optional: false },  
    { id: 'lb2', order: 2, exerciseName: 'Romanian Deadlift', targetSets: '3', targetRepsOrDuration: '8-10', targetWeightOrLoad: '', tempo: '3-1-2', rir: '2-3', rest: '2 min', notes: 'DB or barbell', section: 'primary', timed: false, optional: false },  
    { id: 'lb3', order: 3, exerciseName: 'Walking Lunge', targetSets: '3', targetRepsOrDuration: '10-12/side', targetWeightOrLoad: '', tempo: '2-1-2', rir: '2', rest: '90 sec', notes: '', section: 'primary', timed: false, optional: false },  
    { id: 'lb4', order: 4, exerciseName: 'Leg Curl Machine', targetSets: '3', targetRepsOrDuration: '10-15', targetWeightOrLoad: '', tempo: '2-1-2', rir: '1-2', rest: '60 sec', notes: '', section: 'primary', timed: false, optional: false },  
    { id: 'lb5', order: 5, exerciseName: 'Calf Raise', targetSets: '3', targetRepsOrDuration: '12-15', targetWeightOrLoad: '', tempo: '2-2-1', rir: '1', rest: '45 sec', notes: '', section: 'primary', timed: false, optional: false }  
  ]  
},  
{  
  key: 'full-body-express',  
  title: 'Full Body — Express',  
  descriptor: 'Time-efficient full body session. One push, one pull, one lower.',  
  equipment: 'Dumbbells, bench, cable machine',  
  duration: '30–35 min',  
  lesson: 'Efficient compound selection under time constraints',  
  exerciseBlocks: [  
    { id: 'fb1', order: 1, exerciseName: 'Dumbbell Bench Press', targetSets: '3', targetRepsOrDuration: '8-12', targetWeightOrLoad: '', tempo: '3-1-2', rir: '2', rest: '90 sec', notes: '', section: 'primary', timed: false, optional: false },  
    { id: 'fb2', order: 2, exerciseName: 'Cable Row', targetSets: '3', targetRepsOrDuration: '8-12', targetWeightOrLoad: '', tempo: '3-1-2', rir: '2', rest: '90 sec', notes: '', section: 'primary', timed: false, optional: false },  
    { id: 'fb3', order: 3, exerciseName: 'Goblet Squat', targetSets: '3', targetRepsOrDuration: '8-12', targetWeightOrLoad: '', tempo: '3-1-2', rir: '2', rest: '90 sec', notes: '', section: 'primary', timed: false, optional: false },  
    { id: 'fb4', order: 4, exerciseName: "Farmer's Carry", targetSets: '2', targetRepsOrDuration: '40 sec', targetWeightOrLoad: '', tempo: '', rir: '', rest: '60 sec', notes: 'Grip and core finisher', section: 'finisher', timed: true, optional: false }  
  ]  
}  	
  ]  
});  