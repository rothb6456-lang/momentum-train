# Training Reference Database  
# Exercise definitions, safety notes, equipment, and name mappings

## SECTION 1: Exercise Lookup Table

| ExerciseName | MuscleGroup | MovementPattern | Category | EquipmentType | IsUnilateral | IsTimed |  
|---|---|---|---|---|---|---|  

MarkdownRow
# Training Reference Database
# Exercise definitions, safety notes, equipment, and name mappings

## Column Key
- SectionName: Which reference table this row belongs to
- Col1/ExerciseName: Exercise name or equipment name
- Col2/MuscleGroup: Primary muscle group (Lookup) or primary muscle (Library)
- Col3/MovementPattern: Movement pattern classification
- Col4/Category: Exercise or equipment category
- Col5/EquipmentType: Equipment used
- Col6/IsUnilateral_or_Laterality: Unilateral flag or laterality description
- Col7/IsTimed: Whether exercise is time-based
- Col8/ID: ExerciseID or EquipmentID
- Col9/SecondaryDetail: Secondary muscles or manufacturer
- Col10/SafetyNotes: Shoulder safety notes or gym location
- Col11/Notes: General notes
- Col12/StandardName: Canonical exercise name (NameMap only)
- Col13/Extra: Reserved

| SectionName | Col1 | Col2 | Col3 | Col4 | Col5 | Col6 | Col7 | Col8 | Col9 | Col10 | Col11 | Col12 | Col13 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

## --- SECTION: Lookup_Exercises ---

| Lookup_Exercises | Alternate Seated DB Curl |  | Curl | Arms_Biceps |  | true | false | | | | | | |
| Lookup_Exercises | Anchored Single Arm Dumbbell Curl |  | Curl | Arms_Biceps |  | true | false | | | | | | |
| Lookup_Exercises | Cross Body Cable Curl |  | Curl | Arms_Biceps |  | true | false | | | | | | |
| Lookup_Exercises | DB Cross Body Curl (Hammer Grip) | Other | Curl | Arms_Biceps | Bodyweight | true | false | | | | | | |
| Lookup_Exercises | DB Spider Curl (Hammer) | Upper Arms | Curl | Arms_Biceps | Dumbbells | false | false | | | | | | |
| Lookup_Exercises | Dumbbell: Squeeze Curl - Neutral | Upper Arms | Curl | Arms_Biceps | Dumbbells | false | false | | | | | | |
| Lookup_Exercises | Hammer Curls with Rope and Cable |  | Curl | Arms_Biceps |  | false | false | | | | | | |
| Lookup_Exercises | Incline DB Hammer Curl | Upper Arms | Curl | Arms_Biceps | Dumbbells | false | false | | | | | | |
| Lookup_Exercises | Incline Dumbbell Curl (Supinated) | Upper Arms | Curl | Arms_Biceps | Dumbbells;Bench | false | false | | | | | | |
| Lookup_Exercises | Seated Single Arm DB Curl - Anchored | Upper Arms | Curl | Arms_Biceps | Dumbbells | true | false | | | | | | |
| Lookup_Exercises | Single Arm Rope Curl (extended Arm Position ) |  | Curl | Arms_Biceps |  | true | false | | | | | | |
| Lookup_Exercises | Standing One Arm Bicep Curl with Cable (Anchored) | Forearms;Upper Arms | Curl | Arms_Biceps | Machine | true | false | | | | | | |
| Lookup_Exercises | Standing One Arm Extended Cable Curls | Upper Arms | Curl | Arms_Biceps | Machine | true | false | | | | | | |
| Lookup_Exercises | Standing Single Arm Cable Curl | Upper Arms | Curl | Arms_Biceps | Machine | true | false | | | | | | |
| Lookup_Exercises | Cable Push-Downs | Upper Arms | Extension | Arms_Triceps | Machine | false | false | | | | | | |
| Lookup_Exercises | Cable Triceps Extension - "Quad" | Upper Arms | Extension | Arms_Triceps | Machine | false | false | | | | | | |
| Lookup_Exercises | High Cable Tricep Pushdown |  | Extension | Arms_Triceps |  | false | false | | | | | | |
| Lookup_Exercises | Kneeling Single Arm Rope Cable Extension |  | Extension | Arms_Triceps |  | true | false | | | | | | |
| Lookup_Exercises | Rope Push-Downs | Upper Arms | Extension | Arms_Triceps | Machine | false | false | | | | | | |
| Lookup_Exercises | Single Arm Cable Extensions | Upper Arms | Extension | Arms_Triceps | Machine | true | false | | | | | | |
| Lookup_Exercises | Single-Arm Cable Triceps Extension (Cross-Body) | Upper Arms | Extension | Arms_Triceps | Machine | true | false | | | | | | |
| Lookup_Exercises | Single-Arm Overhead Cable Extension |  | Extension | Arms_Triceps |  | true | false | | | | | | |
| Lookup_Exercises | Vertical DB Scap extension |  | Extension | Arms_Triceps |  | false | false | | | | | | |
| Lookup_Exercises | Cycling |  | Cardio | Cardio |  | false | true | | | | | | |
| Lookup_Exercises | Endless Rope |  | Cardio | Cardio |  | false | true | | | | | | |
| Lookup_Exercises | Treadmill Walking | Cardio | Cardio | Cardio | Machine | false | true | | | | | | |
| Lookup_Exercises | Dead Hang | Other | Hang | Carry | Bodyweight | false | true | | | | | | |
| Lookup_Exercises | Farmer's Walk | Other | Carry | Carry | Dumbbells | false | true | | | | | | |
| Lookup_Exercises | Farmer’s Hold | Other | Carry | Carry | Bodyweight | false | true | | | | | | |
| Lookup_Exercises | Plate Pinch |  | Pinch | Carry |  | false | true | | | | | | |
| Lookup_Exercises | Suitcase Carries | Other | Carry | Carry | Dumbbells | true | true | | | | | | |
| Lookup_Exercises | Suitcase Holds | Other | Carry | Carry | Dumbbells | true | true | | | | | | |
| Lookup_Exercises | Captains Chair Knee Raises | Other | Core | Core | Other | false | false | | | | | | |
| Lookup_Exercises | Hanging Knee Raises | Other | Core | Core | Other | false | false | | | | | | |
| Lookup_Exercises | Pallof Press | Other | Core | Core | Bodyweight | false | false | | | | | | |
| Lookup_Exercises | Side Plank |  | Core | Core |  | false | true | | | | | | |
| Lookup_Exercises | Barbell Standing Calf Raise |  | Calf | Legs |  | false | false | | | | | | |
| Lookup_Exercises | Bulgarian Split Squat |  | Squat/Lunge | Legs |  | true | false | | | | | | |
| Lookup_Exercises | Cable Pull-Through | Back;Thighs | Hip Hinge | Legs | Machine | false | false | | | | | | |
| Lookup_Exercises | Calf Extension (Machine) | Other | Calf | Legs | Machine | false | false | | | | | | |
| Lookup_Exercises | Dumbbell Romanian Deadlift |  | Hip Hinge | Legs |  | false | false | | | | | | |
| Lookup_Exercises | Front-Foot-Elevated Split Squat | Calves;Hips;Thighs | Squat/Lunge | Legs | Dumbbells | true | false | | | | | | |
| Lookup_Exercises | Glute Extension | Hips;Other | Hip Extension | Legs | Machine | false | false | | | | | | |
| Lookup_Exercises | Goblet Squat |  | Squat/Lunge | Legs |  | false | false | | | | | | |
| Lookup_Exercises | Prisoners Squat |  | Squat/Lunge | Legs |  | false | false | | | | | | |
| Lookup_Exercises | Reverse Lunge | Hips;Thighs | Squat/Lunge | Legs | Other | true | false | | | | | | |
| Lookup_Exercises | Seated Calf Raise | Calves | Calf | Legs | Machine | false | false | | | | | | |
| Lookup_Exercises | Smith Machine Split Squat (rear foot elevated optional) |  | Squat/Lunge | Legs |  | true | false | | | | | | |
| Lookup_Exercises | Standing Calf Raise |  | Calf | Legs |  | false | false | | | | | | |
| Lookup_Exercises | Tibia Flex |  | Calf | Legs |  | false | false | | | | | | |
| Lookup_Exercises | Walking Lunges |  | Squat/Lunge | Legs |  | true | false | | | | | | |
| Lookup_Exercises | Half-Kneeling Single-Arm DB Press | Shoulders | Other | Other | Dumbbells | true | false | | | | | | |
| Lookup_Exercises | Body Row | Back;Chest;Neck;Waist | Pull | Pull | Barbell | false | false | | | | | | |
| Lookup_Exercises | Chest Supported DB Row (Spider) | Back | Pull | Pull | Dumbbells | false | false | | | | | | |
| Lookup_Exercises | Chest Supported Rear Delt Fly | Back | Pull | Pull | Machine | false | false | | | | | | |
| Lookup_Exercises | Face Pull | Other | Pull | Pull | Bodyweight | false | false | | | | | | |
| Lookup_Exercises | Face Pull (w External Rotation) |  | Pull | Pull |  | false | false | | | | | | |
| Lookup_Exercises | Half-Kneeling Single Arm Cable Row |  | Pull | Pull |  | true | false | | | | | | |
| Lookup_Exercises | Half-Kneeling Single-Arm Cable Pulldown | Back | Pull | Pull | Machine | true | false | | | | | | |
| Lookup_Exercises | Half-Kneeling Single-Arm Cable Row, Low-to-High Finish |  | Pull | Pull |  | true | false | | | | | | |
| Lookup_Exercises | Kneeling Cable Row | Back | Pull | Pull | Machine | false | false | | | | | | |
| Lookup_Exercises | Machine Row | Other | Pull | Pull | Bodyweight | false | false | | | | | | |
| Lookup_Exercises | Neutral Grip Seated 2 Arm Row | Back | Pull | Pull | Machine | false | false | | | | | | |
| Lookup_Exercises | Plate Loaded Seated Row | Back | Pull | Pull | Machine | false | false | | | | | | |
| Lookup_Exercises | Rear Delt Cable Fly |  | Pull | Pull |  | false | false | | | | | | |
| Lookup_Exercises | Rowing | Cardio | Pull | Pull | Bodyweight | false | true | | | | | | |
| Lookup_Exercises | Seat Cable Row (V / Narrow Neutral Grip) |  | Pull | Pull |  | false | false | | | | | | |
| Lookup_Exercises | Single-Arm Cable Row (Split Stance) | Back | Pull | Pull | Machine | true | false | | | | | | |
| Lookup_Exercises | Single-Arm Neutral Grip Cable Pulldown | Back | Pull | Pull | Bodyweight | true | false | | | | | | |
| Lookup_Exercises | Cable Chest Press (2 Arm) | Chest | Horizontal Press | Push | Bench;Machine | false | false | | | | | | |
| Lookup_Exercises | Cable Fly (Standing) |  | Fly | Push |  | false | false | | | | | | |
| Lookup_Exercises | Cable High To Mid Fly |  | Fly | Push |  | false | false | | | | | | |
| Lookup_Exercises | Cable Lateral Raise (using elbow strap setup) |  | Lateral Raise | Push |  | false | false | | | | | | |
| Lookup_Exercises | DB Neutral Press (slight Rotate To Underhand ) | Chest | Horizontal Press | Push | Dumbbells | false | false | | | | | | |
| Lookup_Exercises | Dumbbell Lateral Raise |  | Lateral Raise | Push |  | false | false | | | | | | |
| Lookup_Exercises | Incline Push-up |  | Horizontal Press | Push |  | false | false | | | | | | |
| Lookup_Exercises | Low-Incline DB Press (15–30°) |  | Horizontal Press | Push |  | false | false | | | | | | |
| Lookup_Exercises | Machine Chest Press |  | Horizontal Press | Push |  | false | false | | | | | | |
| Lookup_Exercises | Neutral Grip Dumbbell Floor Press |  | Horizontal Press | Push |  | false | false | | | | | | |
| Lookup_Exercises | Pec Fly |  | Fly | Push |  | false | false | | | | | | |
| Lookup_Exercises | Push-up | Chest | Horizontal Press | Push | Bodyweight | false | false | | | | | | |
| Lookup_Exercises | Push-up On Knees | Chest | Horizontal Press | Push | Bodyweight | false | false | | | | | | |
| Lookup_Exercises | Scap Push Ups | Other;Shoulders | Horizontal Press | Push | Bodyweight | false | false | | | | | | |
| Lookup_Exercises | Seated Neutral Grip DB Overhead Press |  | Horizontal Press | Push |  | false | false | | | | | | |
| Lookup_Exercises | Single Arm Cable Press |  | Horizontal Press | Push |  | true | false | | | | | | |
| Lookup_Exercises | Single Arm Cable Press (split stance) |  | Horizontal Press | Push |  | true | false | | | | | | |
| Lookup_Exercises | Single-Arm DB Balance Press | Chest | Horizontal Press | Push | Dumbbells | true | false | | | | | | |
| Lookup_Exercises | Single-Arm Vertical Plate Balance Press | Chest | Horizontal Press | Push | Dumbbells;Other | true | false | | | | | | |
| Lookup_Exercises | Smith Machine Bench Press | Chest;Shoulders;Upper Arms | Horizontal Press | Push | Bench;Machine | false | false | | | | | | |
| Lookup_Exercises | Supine Press Machine - Plate Loaded (Planet Fitness) | Chest | Horizontal Press | Push | Machine;Other | false | false | | | | | | |
| Lookup_Exercises | Band External Rotations |  | Activation | Warmup |  | false | false | | | | | | |
| Lookup_Exercises | Band Pull Aparts |  | Activation | Warmup |  | false | false | | | | | | |
| Lookup_Exercises | Cable External Rotation |  | Activation | Warmup |  | false | false | | | | | | |
| Lookup_Exercises | Cat-Camel |  | Activation | Warmup |  | false | false | | | | | | |
| Lookup_Exercises | Hip Hinge |  | Activation | Warmup |  | false | false | | | | | | |
| Lookup_Exercises | Inverted KB Hold |  | Stability | Warmup |  | false | true | | | | | | |
| Lookup_Exercises | Inverted KB Press | Other | Stability | Warmup | Dumbbells | false | false | | | | | | |
| Lookup_Exercises | Serratus Wall Slides (banded) |  | Activation | Warmup |  | false | false | | | | | | |

## --- SECTION: ExerciseLibrary ---

| ExerciseLibrary | Farmer's Walk | Forearms | Carry | Carry | | Bilateral | | EX-FW | Traps; Core; Shoulders | Well tolerated | Primary grip and carry exercise throughout all phases   | | |
| ExerciseLibrary | Farmer's Hold | Forearms | Hold | Hold | | Bilateral | | EX-FH | Traps; Core |  | Static hold version of farmer's walk   | | |
| ExerciseLibrary | Suitcase Carries | Forearms | Carry | Carry | | Unilateral | | EX-SC | Obliques; Core; Traps | Well tolerated | Single-side carry emphasizing anti-lateral flexion   | | |
| ExerciseLibrary | Suitcase Holds | Forearms | Hold | Hold | | Unilateral | | EX-SH | Obliques; Core |  | Static hold version of suitcase carry   | | |
| ExerciseLibrary | Body Row | Back | Pull | Compound | | Bilateral | | EX-BR | Biceps; Forearms; Core | Well tolerated | Inverted row using barbell in rack   | | |
| ExerciseLibrary | Machine Row | Back | Pull | Compound | | Bilateral | | EX-MR | Biceps; Forearms | Well tolerated | Chest-supported selectorized row   | | |
| ExerciseLibrary | Neutral Grip Seated 2 Arm Row | Back | Pull | Compound | | Bilateral | | EX-NGSR | Biceps; Forearms | Well tolerated | Seated cable row with neutral grip attachment   | | |
| ExerciseLibrary | Chest Supported DB Row (Spider) | Back | Pull | Compound | | Bilateral | | EX-CSDR | Biceps; Rear Delts; Forearms | Well tolerated | Incline bench chest-supported dumbbell row   | | |
| ExerciseLibrary | Single-Arm Neutral Grip Cable Pulldown | Lats | Pull | Compound | | Unilateral | | EX-SANGCP | Biceps; Forearms; Rear Delts | Slight lean back eliminates anterior capsule awareness | Primary lat exercise from Phase 3 onward   | | |
| ExerciseLibrary | Kneeling Cable Row | Back | Pull | Compound | | Bilateral | | EX-KCR | Biceps; Core; Forearms | Well tolerated | Kneeling position at seated cable row   | | |
| ExerciseLibrary | Half-Kneeling Single Arm Cable Row | Back | Pull | Compound | | Unilateral | | EX-HKSAR | Core; Biceps; Forearms | Well tolerated | Half-kneeling unilateral cable row   | | |
| ExerciseLibrary | Half-Kneeling Single-Arm Cable Row, Low-to-High Finish | Back | Pull | Compound | | Unilateral | | EX-HKSARCR | Rear Delts; Core; Biceps | Well tolerated | Low-to-high finish variant   | | |
| ExerciseLibrary | Single-Arm Cable Row (Split Stance) | Back | Pull | Compound | | Unilateral | | EX-SACRS | Core; Biceps; Forearms | Well tolerated | Split stance cable row   | | |
| ExerciseLibrary | Seat Cable Row (V / Narrow Neutral Grip) | Back | Pull | Compound | | Bilateral | | EX-SCVNGR | Biceps; Forearms | Well tolerated | V-grip narrow neutral cable row   | | |
| ExerciseLibrary | Plate Loaded Seated Row | Back | Pull | Compound | | Bilateral | | EX-PLSR | Biceps; Forearms | Well tolerated | Plate-loaded seated row machine   | | |
| ExerciseLibrary | Face Pull | Rear Delts | Pull | Isolation | | Bilateral | | EX-FP | Traps; Rhomboids; External Rotators | Well tolerated | Standard face pull with rope   | | |
| ExerciseLibrary | Face Pull (w External Rotation) | Rear Delts | Pull | Isolation | | Bilateral | | EX-FPWR | External Rotators; Traps; Rhomboids | Monitor right shoulder during external rotation | Face pull with added external rotation component   | | |
| ExerciseLibrary | Rear Delt Cable Fly | Rear Delts | Pull | Isolation | | Bilateral | | EX-RDCF | Rhomboids; Traps | Well tolerated | Standing cable rear delt fly   | | |
| ExerciseLibrary | Chest Supported Rear Delt Fly | Rear Delts | Pull | Isolation | | Bilateral | | EX-CSRDF | Rhomboids; Traps | Well tolerated | Incline bench chest-supported rear delt fly   | | |
| ExerciseLibrary | Seated Single Arm DB Curl - Anchored | Biceps | Isolation | Isolation | | Unilateral | | EX-SADBC-A | Forearms; Brachialis | Well tolerated | Seated single-arm curl with opposite hand anchored   | | |
| ExerciseLibrary | Anchored Single Arm Dumbbell Curl | Biceps | Isolation | Isolation | | Unilateral | | EX-ADBC | Forearms; Brachialis | Well tolerated | Standing or seated anchored curl   | | |
| ExerciseLibrary | Standing One Arm Extended Cable Curls | Biceps | Isolation | Isolation | | Unilateral | | EX-SOAECC | Forearms; Brachialis | Well tolerated | Cable curl with arm extended behind body   | | |
| ExerciseLibrary | Standing One Arm Bicep Curl with Cable (Anchored) | Biceps | Isolation | Isolation | | Unilateral | | EX-SOABCC | Forearms; Brachialis | Well tolerated | Cable curl with elbow anchored   | | |
| ExerciseLibrary | Incline Dumbell Curl (Supinated) | Biceps | Isolation | Isolation | | Bilateral | | EX-IDC | Forearms | Well tolerated | Incline bench supinated dumbbell curl   | | |
| ExerciseLibrary | Incline DB Hammer Curl | Brachialis | Isolation | Isolation | | Bilateral | | EX-IDCH | Biceps; Forearms | Well tolerated | Incline bench hammer grip curl   | | |
| ExerciseLibrary | DB Spider Curl (Hammer) | Brachialis | Isolation | Isolation | | Bilateral | | EX-DSCH | Biceps; Forearms | Well tolerated | Spider curl on incline bench with hammer grip   | | |
| ExerciseLibrary | Alternate Seated DB Curl | Biceps | Isolation | Isolation | | Alternating | | EX-ASDBC | Forearms; Brachialis | Well tolerated | Alternating seated dumbbell curl with supination   | | |
| ExerciseLibrary | Single Arm Rope Curl (extended Arm Position) | Biceps | Isolation | Isolation | | Unilateral | | EX-SARCC | Brachialis; Forearms | Well tolerated | Single arm cable curl with rope grip   | | |
| ExerciseLibrary | Hammer Curls with Rope and Cable | Brachialis | Isolation | Isolation | | Bilateral | | EX-HCRC | Biceps; Forearms | Well tolerated | Rope attachment hammer curl on cable   | | |
| ExerciseLibrary | Cross Body Cable Curl | Biceps | Isolation | Isolation | | Unilateral | | EX-CBCC | Brachialis; Forearms | Well tolerated | Cross-body cable curl   | | |
| ExerciseLibrary | Standing Single Arm Cable Curl | Biceps | Isolation | Isolation | | Unilateral | | EX-SACCC | Forearms; Brachialis | Well tolerated | Standard single arm cable curl   | | |
| ExerciseLibrary | Dumbbell Incline Curl | Biceps | Isolation | Isolation | | Bilateral | | EX-DBC | Forearms | Well tolerated | Incline dumbbell curl variant   | | |
| ExerciseLibrary | 1 Arm Cable Curl | Biceps | Isolation | Isolation | | Unilateral | | EX-1ACC | Forearms | Well tolerated | Single arm cable curl   | | |
| ExerciseLibrary | Dumbbell: Squeeze Curl - Neutral | Biceps | Isolation | Isolation | | Bilateral | | EX-DBSCN | Brachialis; Forearms | Well tolerated | Dumbbell squeeze curl variations   | | |
| ExerciseLibrary | Dumbbell: Squeeze Curl - Hammer | Brachialis | Isolation | Isolation | | Bilateral | | EX-DSCH2 | Biceps; Forearms | Well tolerated | Hammer grip squeeze curl   | | |
| ExerciseLibrary | DB Cross Body Curl (Hammer Grip) | Brachialis | Isolation | Isolation | | Unilateral | | EX-DBCBH | Biceps; Forearms | Well tolerated | Cross body hammer curl with dumbbell   | | |
| ExerciseLibrary | Neutral Grip Dumbbell Floor Press | Chest | Push | Compound | | Bilateral | | EX-NGDFP | Triceps; Anterior Delts | Right anterior capsule awareness during heavy sets; neutral grip well tolerated | Primary pressing movement from Phase 6 onward   | | |
| ExerciseLibrary | Smith Machine Bench Press | Chest | Push | Compound | | Bilateral | | EX-SMBP | Triceps; Anterior Delts | Right anterior capsule tightness; monitor closely | Used in Phases 3-4   | | |
| ExerciseLibrary | Supine Press Machine - Plate Loaded (Planet Fitness) | Chest | Push | Compound | | Bilateral | | EX-SPML | Triceps; Anterior Delts | Some right capsule tightness at higher weights | Planet Fitness specific plate-loaded press   | | |
| ExerciseLibrary | DB Neutral Press (slight Rotate To Underhand) | Chest | Push | Compound | | Bilateral | | EX-DBNP | Triceps; Anterior Delts | Neutral grip well tolerated | Floor press or bench press with neutral grip and slight underhand rotation   | | |
| ExerciseLibrary | Low-Incline DB Press (15-30°) | Upper Chest | Push | Compound | | Bilateral | | EX-LIDBP | Triceps; Anterior Delts | Left trap compensation noted; monitor | Low incline dumbbell press   | | |
| ExerciseLibrary | Single Arm Cable Press | Chest | Push | Compound | | Unilateral | | EX-SACP | Triceps; Anterior Delts; Core | Right extension not as strong as left; some trap recruitment | Single arm cable press in split stance   | | |
| ExerciseLibrary | Single Arm Cable Press (split stance) | Chest | Push | Compound | | Unilateral | | EX-SACPSS | Triceps; Anterior Delts; Core | Right extension not as strong as left | Split stance variant   | | |
| ExerciseLibrary | Machine Chest Press | Chest | Push | Compound | | Bilateral | | EX-MCP | Triceps; Anterior Delts | Right anterior capsule awareness on eccentric | Selectorized chest press machine   | | |
| ExerciseLibrary | Single-Arm Vertical Plate Balance Press | Chest | Push | Compound | | Unilateral | | EX-SAVPBP | Triceps; Stabilizers; Core | Left has more control than right | Vertical plate balance floor press   | | |
| ExerciseLibrary | Single-Arm DB Balance Press | Chest | Push | Compound | | Unilateral | | EX-SADBP | Triceps; Stabilizers; Core | Well tolerated | Single arm DB balance press   | | |
| ExerciseLibrary | Cable Fly (Standing) | Chest | Push | Isolation | | Bilateral | | EX-CSF | Anterior Delts | Well tolerated with cuff attachment | Standing cable fly   | | |
| ExerciseLibrary | Cable High To Mid Fly | Chest | Push | Isolation | | Bilateral | | EX-CHMF | Anterior Delts | Right tightness at full extension; slightly shorten ROM | High to mid cable fly   | | |
| ExerciseLibrary | Pec Fly | Chest | Push | Isolation | | Bilateral | | EX-PF | Anterior Delts | Right sensitive with quick movement | Machine pec fly   | | |
| ExerciseLibrary | High Cable Tricep Pushdown | Triceps | Isolation | Isolation | | Bilateral | | EX-HCTP | Forearms | Shoulders roll forward if ROM too high; keep 90-100 degree ROM | High cable tricep pushdown with straight bar   | | |
| ExerciseLibrary | Rope Push-Downs | Triceps | Isolation | Isolation | | Bilateral | | EX-RPD | Forearms | Well tolerated | Rope attachment pushdown   | | |
| ExerciseLibrary | Single-Arm Overhead Cable Extension | Triceps | Isolation | Isolation | | Unilateral | | EX-SAOCE | None | Feels good on anterior capsule; seems to loosen it | Single arm overhead cable extension   | | |
| ExerciseLibrary | Single Arm Cable Extensions | Triceps | Isolation | Isolation | | Unilateral | | EX-SACE | None | Well tolerated | General single arm cable extension   | | |
| ExerciseLibrary | Cable Triceps Extension - Quad | Triceps | Isolation | Isolation | | Unilateral | | EX-CTE-Q | None | Well tolerated; significant left-right asymmetry noted | Four-position cable tricep extension   | | |
| ExerciseLibrary | Kneeling Single Arm Rope Cable Extension | Triceps | Isolation | Isolation | | Unilateral | | EX-KSARCE | None | Well tolerated | Kneeling single arm rope extension   | | |
| ExerciseLibrary | Standing Single Arm Extension (D-Grip) | Triceps | Isolation | Isolation | | Unilateral | | EX-SASED | None | Well tolerated | D-grip single arm cable extension   | | |
| ExerciseLibrary | Single-Arm Cable Triceps Extension (Cross-Body) | Triceps | Isolation | Isolation | | Unilateral | | EX-SACTE-CB | None | Well tolerated | Cross body cable tricep extension   | | |
| ExerciseLibrary | Cable Push-Downs | Triceps | Isolation | Isolation | | Bilateral | | EX-CPD | None | Well tolerated | General cable pushdown   | | |
| ExerciseLibrary | Cable: Kneeling 1Arm Overhead Extension | Triceps | Isolation | Isolation | | Unilateral | | EX-CKOE | None | Well tolerated | Kneeling overhead cable extension   | | |
| ExerciseLibrary | Inverted KB Press | Chest | Push | Compound | | Bilateral | | EX-IKBP | Triceps; Stabilizers | Well tolerated | Floor press with inverted kettlebell   | | |
| ExerciseLibrary | Dumbbell Romanian Deadlift | Hamstrings | Hinge | Compound | | Bilateral | | EX-DBRDL | Glutes; Lower Back; Forearms | Well tolerated; grip limiting factor at heavy weights | Primary hinge movement   | | |
| ExerciseLibrary | Bulgarian Split Squat | Quads | Squat | Compound | | Unilateral | | EX-BSS | Glutes; Hamstrings; Core | Well tolerated | Rear foot elevated split squat   | | |
| ExerciseLibrary | Smith Machine Split Squat (rear foot elevated optional) | Quads | Squat | Compound | | Unilateral | | EX-SMSSQ | Glutes; Hamstrings; Core | Well tolerated | Smith machine split squat   | | |
| ExerciseLibrary | Goblet Squat | Quads | Squat | Compound | | Bilateral | | EX-GS | Glutes; Core; Hamstrings | Well tolerated | Dumbbell or kettlebell goblet squat   | | |
| ExerciseLibrary | Prisoners Squat | Quads | Squat | Warmup | | Bilateral | | EX-PS | Glutes; Core | Well tolerated | Bodyweight squat with hands behind head   | | |
| ExerciseLibrary | Walking Lunges | Quads | Squat | Compound | | Alternating | | EX-WL | Glutes; Hamstrings; Calves | Well tolerated | Walking lunge with dumbbells or kettlebell   | | |
| ExerciseLibrary | Reverse Lunge | Quads | Squat | Compound | | Alternating | | EX-RL | Glutes; Hamstrings | Well tolerated | Reverse stepping lunge   | | |
| ExerciseLibrary | Front-Foot-Elevated Split Squat | Quads | Squat | Compound | | Unilateral | | EX-FFESR | Glutes; Hamstrings; Core | Well tolerated | Front foot on plates for increased ROM   | | |
| ExerciseLibrary | Standing Calf Raise | Calves | Isolation | Isolation | | Bilateral | | EX-SCR | None | Well tolerated | Smith machine or barbell calf raise   | | |
| ExerciseLibrary | Barbell Standing Calf Raise | Calves | Isolation | Isolation | | Bilateral | | EX-BSCR | None | Well tolerated | Barbell calf raise on plates   | | |
| ExerciseLibrary | Seated Calf Raise | Calves | Isolation | Isolation | | Bilateral | | EX-SECR | None | Well tolerated | Seated calf raise machine   | | |
| ExerciseLibrary | Calf Extension (Machine) | Calves | Isolation | Isolation | | Bilateral | | EX-CEM | None | Well tolerated | Calf extension on leg press or machine   | | |
| ExerciseLibrary | Glute Extension | Glutes | Isolation | Isolation | | Unilateral | | EX-GE | Hamstrings | Well tolerated | Machine glute extension   | | |
| ExerciseLibrary | Dumbbell Lateral Raise | Lateral Delts | Isolation | Isolation | | Bilateral | | EX-DLR | Traps | Slight right anterior capsule awareness at top; better with slight pronation | Dumbbell lateral raise   | | |
| ExerciseLibrary | Cable Lateral Raise (using elbow strap setup) | Lateral Delts | Isolation | Isolation | | Unilateral | | EX-CLR | Traps | Well tolerated with elbow strap | Cable lateral raise using strap at elbow   | | |
| ExerciseLibrary | Seated Neutral Grip DB Overhead Press | Shoulders | Push | Compound | | Bilateral | | EX-SNGDBOP | Triceps; Upper Chest | Subtle anterior capsule awareness on descending; tolerance improving | Seated dumbbell overhead press with neutral grip   | | |
| ExerciseLibrary | Half-Kneeling Single-Arm DB Press | Shoulders | Push | Compound | | Unilateral | | EX-HKSADBP | Triceps; Core | Well tolerated | Half-kneeling single arm overhead press   | | |
| ExerciseLibrary | Pallof Press | Core | Core | Core | | Bilateral | | EX-PP | Obliques | Well tolerated; left side requires more anti-rotation effort | Anti-rotation cable press   | | |
| ExerciseLibrary | Side Plank | Obliques | Core | Core | | Unilateral | | EX-SP | Core; Shoulders | Right shoulder feels looser than left on elbow; palm better tolerated | Isometric lateral core stability   | | |
| ExerciseLibrary | Dead Hang | Forearms | Hold | Hold | | Bilateral | | EX-DH | Lats; Shoulders | Good scapular reset | Passive hang from pull-up bar   | | |
| ExerciseLibrary | Plate Pinch | Forearms | Hold | Hold | | Bilateral | | EX-PPC | Fingers | Well tolerated | Pinch grip hold with weight plates   | | |
| ExerciseLibrary | Captains Chair Knee Raises | Core | Core | Core | | Bilateral | | EX-CKR | Hip Flexors | Little tightness in right shoulder cap | Hanging knee raise on captain's chair   | | |
| ExerciseLibrary | Hanging Knee Raises | Core | Core | Core | | Bilateral | | EX-HKR | Hip Flexors; Forearms | Well tolerated | Hanging knee raise from pull-up bar   | | |
| ExerciseLibrary | Tibia Flex | Tibialis Anterior | Isolation | Isolation | | Bilateral | | EX-TF | None | Well tolerated | Plate on toe tibialis anterior flexion   | | |
| ExerciseLibrary | Rowing | Full Body | Cardio | Cardio | | Bilateral | | EX-ROW | Legs; Back; Arms | Well tolerated | Concept2 or similar rowing ergometer   | | |
| ExerciseLibrary | Treadmill Walking | Full Body | Cardio | Cardio | | Bilateral | | EX-TW | Legs; Core | Well tolerated | Treadmill walking at various inclines   | | |
| ExerciseLibrary | Cycling | Legs | Cardio | Cardio | | Bilateral | | EX-CYC | Core | Well tolerated | Stationary cycling   | | |
| ExerciseLibrary | Endless Rope | Forearms | Cardio | Cardio | | Bilateral | | EX-ER | Back; Shoulders; Biceps | Slight anterior capsule trigger on right at initial reach | Marpo Kinetics or similar endless rope machine   | | |
| ExerciseLibrary | Push-up | Chest | Push | Compound | | Bilateral | | EX-PU | Triceps; Anterior Delts; Core | Little anterior right tightness on lowering | Full push-up from toes   | | |
| ExerciseLibrary | Push-up On Knees | Chest | Push | Compound | | Bilateral | | EX-PUK | Triceps; Anterior Delts; Core | Well tolerated | Modified push-up from knees   | | |
| ExerciseLibrary | Incline Push-up | Chest | Push | Compound | | Bilateral | | EX-IPU | Triceps; Anterior Delts; Core | Well tolerated | Push-up with hands elevated on bar or bench   | | |
| ExerciseLibrary | Scap Push Ups | Serratus Anterior | Mobility | Warmup | | Bilateral | | EX-SPU | Shoulders | Well tolerated | Scapular protraction/retraction from push-up position   | | |
| ExerciseLibrary | Band Pull Aparts | Rear Delts | Mobility | Warmup | | Bilateral | | EX-BPA | Rhomboids; Traps | Well tolerated | Band pull apart for shoulder warmup   | | |
| ExerciseLibrary | Band External Rotations | External Rotators | Mobility | Warmup | | Bilateral | | EX-BER | Rotator Cuff | Well tolerated | Banded external rotation warmup   | | |
| ExerciseLibrary | Serratus Wall Slides (banded) | Serratus Anterior | Mobility | Warmup | | Bilateral | | EX-SWS | Shoulders; Traps | Well tolerated | Wall slide with band around wrists   | | |
| ExerciseLibrary | Cat-Camel | Spine | Mobility | Warmup | | Bilateral | | EX-CC | Core | Well tolerated | Spinal flexion/extension mobilization   | | |
| ExerciseLibrary | Cable External Rotation | External Rotators | Mobility | Warmup | | Unilateral | | EX-CER | Rotator Cuff | Left has less ROM than right | Cable external rotation   | | |
| ExerciseLibrary | Inverted KB Hold | Shoulders | Mobility | Rehab | | Bilateral | | EX-IKBH | Forearms; Stabilizers | Well tolerated | Inverted kettlebell hold for shoulder stability   | | |
| ExerciseLibrary | Vertical DB Scap extension | Serratus Anterior | Mobility | Rehab | | Bilateral | | EX-VDBSE | Shoulders | Well tolerated | Vertical dumbbell or plate scapular extension   | | |
| ExerciseLibrary | Hip Hinge | Hamstrings | Mobility | Warmup | | Bilateral | | EX-HH | Glutes; Lower Back | Well tolerated | Bodyweight hip hinge pattern warmup   | | |
| ExerciseLibrary | Cable Pull-Through | Glutes | Hinge | Compound | | Bilateral | | EX-CPT | Hamstrings; Lower Back | Well tolerated | Cable pull-through for hip extension   | | |
| ExerciseLibrary | Half-Kneeling Single-Arm Cable Pulldown | Lats | Pull | Compound | | Unilateral | | EX-HKSACP | Biceps; Forearms | Well tolerated | Half-kneeling single arm cable pulldown   | | |

## --- SECTION: ExerciseNameMap ---
| SectionName | OriginalName | | | | | | | | | | | StandardName | |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ExerciseNameMap | 1 Arm Cable Curl | | | | | | | | | | | Standing Single Arm Cable Curl | |
| ExerciseNameMap | DB Romanian Deadlift (RDL) | | | | | | | | | | | Dumbbell Romanian Deadlift | |
| ExerciseNameMap | Incline Dumbell Curl (Supinated) | | | | | | | | | | | Incline Dumbbell Curl (Supinated) | |
| ExerciseNameMap | Dumbbell Incline Curl | | | | | | | | | | | Incline Dumbbell Curl (Supinated) | |
| ExerciseNameMap | Half-Kneeling Single-Arm Cable Pulldow | | | | | | | | | | | Half-Kneeling Single-Arm Cable Pulldown | |
| ExerciseNameMap | Cable: Kneeling 1Arm Overhead Extension | | | | | | | | | | | Kneeling Single Arm Rope Cable Extension | |
| ExerciseNameMap | Dumbbell: Squeeze Curl - Hammer | | | | | | | | | | | Dumbbell: Squeeze Curl - Neutral | |
| ExerciseNameMap | Standing Single Arm Extension (D-Grip) | | | | | | | | | | | Single Arm Cable Extensions | |
| ExerciseNameMap | Cable Triceps Extension - “Quad” | | | | | | | | | | | Cable Triceps Extension - "Quad" | |
| ExerciseNameMap |  | | | | | | | | | | |  | |
| ExerciseNameMap |  | | | | | | | | | | |  | |
| ExerciseNameMap |  | | | | | | | | | | |  | |

## --- SECTION: Equipment ---

"| Equipment | Weight	Various	Multiple	Standard | | | hex | | | | EQ-DB	Dumbbells	Free | or | iron | grip | | |"
"| Equipment | Weight	Various	Multiple	Standard | | | Olympic | | | | EQ-BB	Barbell	Free | barbell |  |  | | |"
"| Equipment | Weight	Various	Multiple	Standard | | | kettlebell | | | | EQ-KB	Kettlebell	Free |  |  |  | | |"
"| Equipment | Plate	Free | | | Weight	Various	Multiple	Used | | | | EQ-PLT	Weight | for | plate | pinch, | | |"
"| Equipment | Machine	Plate-Loaded | | | Machine	Various	Multiple	Vertical | | | | EQ-SM	Smith | or | angled | smith | | |"
"| Equipment | Cable | | | Pulley	Cable	Various	Multiple	Single | | | | EQ-CAB	Adjustable | or | dual | adjustable | | |"
"| Equipment | Machine | | | Row	Selectorized | | | | EQ-LF-MR	LifeFitness | Machine	LifeFitness	Planet | Fitness	Chest-supported | selectorized | | |"
"| Equipment | Chest | | | Press	Selectorized | | | | EQ-LF-CP	LifeFitness | Machine	LifeFitness	Planet | Fitness	Selectorized | chest | | |"
"| Equipment | Low | | | Row	Selectorized | | | | EQ-LF-LR	LifeFitness | Machine	LifeFitness	Planet | Fitness	Seated | low | | |"
"| Equipment | FTS | | | Glide	Cable	Precor	LI | | | | EQ-PRE-FTS	Precor | Marriott	Precor | functional | training | | |"
"| Equipment | Chest | | | Press	Selectorized | | | | EQ-PRE-CP	Precor | Machine	Precor	Hotel | Gyms	Precor | selectorized | | |"
"| Equipment | Rower	Cardio	Concept2	Multiple	Rowing | | | ergometer | | | | EQ-C2	Concept2 |  |  |  | | |"
"| Equipment | treadmill | | |  | | | | EQ-TM	Treadmill	Cardio	Various	Multiple	Standard |  |  |  | | |"
"| Equipment | Bike	Cardio	Various	Multiple	Upright | | | or | | | | EQ-BIKE	Stationary | recumbent | stationary | bike | | |"
"| Equipment | Rope | | | Machine	Cardio	Various	Planet | | | | EQ-ER	Endless | Fitness	Marpo | Kinetics | or | | |"
"| Equipment | Machine	Plate-Loaded | | | Machine	Various	Multiple	Generic | | | | EQ-PLM	Plate-Loaded | plate-loaded | machines |  | | |"
"| Equipment | Machine | | | (Generic)	Selectorized | | | | EQ-MCH	Selectorized | Machine	Various	Multiple	Generic | selectorized | machines | | |"
"| Equipment | external | | | load | | | | EQ-BW	Bodyweight	Bodyweight	N/A	N/A	No |  |  |  | | |"
"| Equipment | Band	Band	Various	Personal	Red, | | | blue, | | | | EQ-BAND	Resistance | green | bands |  | | |"
"| Equipment | Band | | | - | | | | EQ-BAND-R	Resistance | Red	Band	Various	Personal	Light | resistance |  | | |"
"| Equipment | Band | | | - | | | | EQ-BAND-B	Resistance | Blue	Band	Various	Personal	Medium | resistance |  | | |"
"| Equipment | Band | | | - | | | | EQ-BAND-G	Resistance | Green	Band	Various	Personal	Heavy | resistance |  | | |"
"| Equipment | Bench	Accessory	Various	Multiple	Adjustable | | | incline | | | | EQ-BENCH	Adjustable | bench |  |  | | |"
"| Equipment | Cable | | | Machine	Cable	Hoist	Hotel | | | | EQ-HOIST	Hoist | Gyms	Hoist | brand | cable | | |"
"| Equipment | Equipment	Various	NXGen	NXGen | | | Gym	NXGen | | | | EQ-NXGEN	NXGen | facility | equipment |  | | |"


## SECTION 3: Exercise Name Mapping  
Maps historical/variant exercise names to canonical names.

| OriginalName | StandardName |  
|---|---|  
| 1 Arm Cable Curl | Standing Single Arm Cable Curl |  
| DB Romanian Deadlift (RDL) | Dumbbell Romanian Deadlift |  
| Incline Dumbell Curl (Supinated) | Incline Dumbbell Curl (Supinated) |  
| Dumbbell Incline Curl | Incline Dumbbell Curl (Supinated) |  
| Half-Kneeling Single-Arm Cable Pulldow | Half-Kneeling Single-Arm Cable Pulldown |  
| Cable: Kneeling 1Arm Overhead Extension | Kneeling Single Arm Rope Cable Extension |  
| Dumbbell: Squeeze Curl - Hammer | Dumbbell: Squeeze Curl - Neutral |  
| Standing Single Arm Extension (D-Grip) | Single Arm Cable Extensions |  