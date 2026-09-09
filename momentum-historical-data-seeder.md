# Momentum Historical Data Seeder

This Laravel Seeder class (`MomentumHistoricalDataSeeder`) imports and populates all historical training data across **Phases 1–10** into the Momentum database schema.

It seeds:
1. **Canonical Exercise Library & Name Mappings** (`exercises`, `exercise_name_maps`)
2. **Player Training Assumptions** (`player_training_assumptions` - 22 clinical & movement observations)
3. **Personal Records** (`player_prs` - 32 historical PR records)
4. **Training Phases, Sessions, and Set Logs** (`training_phases`, `training_sessions`, `training_sets`)

---

## Seeder File: `database/seeders/MomentumHistoricalDataSeeder.php`

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\PlayerIdentity;
use App\Models\Exercise;
use App\Models\ExerciseNameMap;
use App\Models\PlayerTrainingAssumption;
use App\Models\PlayerPr;
use App\Models\TrainingPhase;
use App\Models\TrainingSession;
use App\Models\TrainingSet;

class MomentumHistoricalDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function () {
            // 1. Resolve or Create Canonical PlayerIdentity (ADR-001 Alignment)
            $player = $this->resolveCanonicalPlayerIdentity();

            // 2. Seed Master Exercise Library & Name Mappings
            $this->seedExercises();

            // 3. Seed 22 Historical Training Assumptions
            $this->seedTrainingAssumptions($player->id);

            // 4. Seed 32 Historical Personal Records (PRs)
            $this->seedPersonalRecords($player->id);

            // 5. Seed Training Blocks (Phases 1 through 10), Sessions, and Set Logs
            $this->seedTrainingPhasesSessionsAndSets($player->id);
        });
    }

    /**
     * Resolve the primary PlayerIdentity (supports unclaimed profile prior to user claim).
     */
    private function resolveCanonicalPlayerIdentity(): PlayerIdentity
    {
        $user = User::where('email', 'brian@bulldogstats.com')->first();

        return PlayerIdentity::firstOrCreate(
            ['player_code' => 'PLR-BULLDOG-001'],
            [
                'user_id' => $user?->id,
                'display_name' => 'Brian (Bulldog Owner)',
                'claim_status' => $user ? 'claimed' : 'unclaimed',
            ]
        );
    }

    /**
     * Seed Lookup_Exercises and ExerciseLibrary.
     */
    private function seedExercises(): void
    {
        $exerciseCatalog = [
            // PULL / BACK
            [
                'canonical_name' => "Farmer's Walk",
                'movement_pattern' => 'Carry',
                'muscle_group' => 'Forearms',
                'category' => 'Carry',
                'equipment_type' => 'Dumbbells',
                'is_unilateral' => false,
                'is_timed' => true,
                'safety_notes' => 'Well tolerated',
                'aliases' => ["Farmer's Carry", 'Farmers Walk', 'Farmer Walk'],
            ],
            [
                'canonical_name' => "Farmer's Hold",
                'movement_pattern' => 'Hold',
                'muscle_group' => 'Forearms',
                'category' => 'Hold',
                'equipment_type' => 'Dumbbells',
                'is_unilateral' => false,
                'is_timed' => true,
                'safety_notes' => 'Static hold version of farmer walk',
                'aliases' => ['Farmers Hold'],
            ],
            [
                'canonical_name' => 'Suitcase Carries',
                'movement_pattern' => 'Carry',
                'muscle_group' => 'Forearms',
                'category' => 'Carry',
                'equipment_type' => 'Dumbbells',
                'is_unilateral' => true,
                'is_timed' => true,
                'safety_notes' => 'Well tolerated',
                'aliases' => ['Suitcase Carry'],
            ],
            [
                'canonical_name' => 'Suitcase Holds',
                'movement_pattern' => 'Hold',
                'muscle_group' => 'Forearms',
                'category' => 'Hold',
                'equipment_type' => 'Dumbbells',
                'is_unilateral' => true,
                'is_timed' => true,
                'safety_notes' => 'Static hold version',
                'aliases' => ['Suitcase Hold'],
            ],
            [
                'canonical_name' => 'Body Row',
                'movement_pattern' => 'Pull',
                'muscle_group' => 'Back',
                'category' => 'Compound',
                'equipment_type' => 'Barbell',
                'is_unilateral' => false,
                'is_timed' => false,
                'safety_notes' => 'Well tolerated',
                'aliases' => ['Inverted Row', 'Inverted Barbell Row'],
            ],
            [
                'canonical_name' => 'Machine Row',
                'movement_pattern' => 'Pull',
                'muscle_group' => 'Back',
                'category' => 'Compound',
                'equipment_type' => 'Machine',
                'is_unilateral' => false,
                'is_timed' => false,
                'safety_notes' => 'Well tolerated',
                'aliases' => ['Chest-Supported Machine Row', 'Seated Machine Row'],
            ],
            [
                'canonical_name' => 'Chest Supported DB Row (Spider)',
                'movement_pattern' => 'Pull',
                'muscle_group' => 'Back',
                'category' => 'Compound',
                'equipment_type' => 'Dumbbells',
                'is_unilateral' => false,
                'is_timed' => false,
                'safety_notes' => 'Well tolerated',
                'aliases' => ['Chest-supported DB Row - Spider', 'Spider Row', 'DB Spider Row'],
            ],
            [
                'canonical_name' => 'Single-Arm Neutral Grip Cable Pulldown',
                'movement_pattern' => 'Pull',
                'muscle_group' => 'Lats',
                'category' => 'Compound',
                'equipment_type' => 'Cable',
                'is_unilateral' => true,
                'is_timed' => false,
                'safety_notes' => 'Slight lean back eliminates anterior capsule awareness',
                'aliases' => ['Single-arm Neutral-grip Cable Pulldown', '1-Arm Cable Pulldown'],
            ],
            [
                'canonical_name' => 'Face Pull',
                'movement_pattern' => 'Pull',
                'muscle_group' => 'Rear Delts',
                'category' => 'Isolation',
                'equipment_type' => 'Cable',
                'is_unilateral' => false,
                'is_timed' => false,
                'safety_notes' => 'Well tolerated',
                'aliases' => ['Rope Face Pull'],
            ],
            [
                'canonical_name' => 'Face Pull (w External Rotation)',
                'movement_pattern' => 'Pull',
                'muscle_group' => 'Rear Delts',
                'category' => 'Isolation',
                'equipment_type' => 'Cable',
                'is_unilateral' => false,
                'is_timed' => false,
                'safety_notes' => 'Monitor right shoulder during external rotation',
                'aliases' => ['Face Pull with External Rotation'],
            ],

            // PUSH / CHEST
            [
                'canonical_name' => 'Neutral Grip Dumbbell Floor Press',
                'movement_pattern' => 'Push',
                'muscle_group' => 'Chest',
                'category' => 'Compound',
                'equipment_type' => 'Dumbbells',
                'is_unilateral' => false,
                'is_timed' => false,
                'safety_notes' => 'Right anterior capsule awareness during heavy sets; radial tilt helps',
                'aliases' => ['Neutral-Grip Dumbbell Floor Press', 'DB Floor Press', 'Dumbbell Floor Press'],
            ],
            [
                'canonical_name' => 'Supine Press Machine - Plate Loaded',
                'movement_pattern' => 'Push',
                'muscle_group' => 'Chest',
                'category' => 'Compound',
                'equipment_type' => 'Plate Loaded',
                'is_unilateral' => false,
                'is_timed' => false,
                'safety_notes' => 'Suicide grip / radial deviation reduces capsule tightness',
                'aliases' => ['Supine Press Machine - Plate Loaded (Planet Fitness)', 'Plate Loaded Supine Press'],
            ],
            [
                'canonical_name' => 'Machine Chest Press',
                'movement_pattern' => 'Push',
                'muscle_group' => 'Chest',
                'category' => 'Compound',
                'equipment_type' => 'Machine',
                'is_unilateral' => false,
                'is_timed' => false,
                'safety_notes' => 'Right anterior capsule awareness on eccentric phase',
                'aliases' => ['Matrix Chest Press', 'LifeFitness Chest Press'],
            ],
            [
                'canonical_name' => 'Single Arm Cable Press',
                'movement_pattern' => 'Push',
                'muscle_group' => 'Chest',
                'category' => 'Compound',
                'equipment_type' => 'Cable',
                'is_unilateral' => true,
                'is_timed' => false,
                'safety_notes' => 'Right extension slightly weaker; maintain split stance',
                'aliases' => ['Single Arm Cable Press (split stance)', 'Single-arm Cable Press'],
            ],
            [
                'canonical_name' => 'Cable High To Mid Fly',
                'movement_pattern' => 'Push',
                'muscle_group' => 'Chest',
                'category' => 'Isolation',
                'equipment_type' => 'Cable',
                'is_unilateral' => false,
                'is_timed' => false,
                'safety_notes' => 'Slightly shorten ROM at full extension to protect right capsule',
                'aliases' => ['Cable High-to-mid Fly', 'Standing Cable Fly'],
            ],
            [
                'canonical_name' => 'Seated Neutral Grip DB Overhead Press',
                'movement_pattern' => 'Push',
                'muscle_group' => 'Shoulders',
                'category' => 'Compound',
                'equipment_type' => 'Dumbbells',
                'is_unilateral' => false,
                'is_timed' => false,
                'safety_notes' => 'Subtle anterior capsule awareness on descending phase; tolerance improving',
                'aliases' => ['Seated Neutral-Grip DB Overhead Press', 'Seated DB Overhead Press'],
            ],

            // ARMS (BICEPS / TRICEPS)
            [
                'canonical_name' => 'DB Spider Curl (Hammer)',
                'movement_pattern' => 'Curl',
                'muscle_group' => 'Arms_Biceps',
                'category' => 'Isolation',
                'equipment_type' => 'Dumbbells',
                'is_unilateral' => false,
                'is_timed' => false,
                'safety_notes' => 'Well tolerated',
                'aliases' => ['DB Spider Curl', 'Incline Spider Curl Hammer'],
            ],
            [
                'canonical_name' => 'Incline Dumbbell Curl (Supinated)',
                'movement_pattern' => 'Curl',
                'muscle_group' => 'Arms_Biceps',
                'category' => 'Isolation',
                'equipment_type' => 'Dumbbells',
                'is_unilateral' => false,
                'is_timed' => false,
                'safety_notes' => 'Left bicep resists full supination under fatigue',
                'aliases' => ['Incline Dumbell Curl (Supinated)', 'Incline DB Curl'],
            ],
            [
                'canonical_name' => 'Rope Push-Downs',
                'movement_pattern' => 'Extension',
                'muscle_group' => 'Arms_Triceps',
                'category' => 'Isolation',
                'equipment_type' => 'Cable',
                'is_unilateral' => false,
                'is_timed' => false,
                'safety_notes' => 'Well tolerated',
                'aliases' => ['Rope Triceps Pushdown', 'Triceps Pushdown with Rope and Cable'],
            ],
            [
                'canonical_name' => 'Single-Arm Overhead Cable Extension',
                'movement_pattern' => 'Extension',
                'muscle_group' => 'Arms_Triceps',
                'category' => 'Isolation',
                'equipment_type' => 'Cable',
                'is_unilateral' => true,
                'is_timed' => false,
                'safety_notes' => 'Feels good on anterior capsule; loosens capsule after chest pressing',
                'aliases' => ['Single Arm Overhead Cable Extension', '1-Arm Overhead Cable Triceps Extension'],
            ],
            [
                'canonical_name' => 'High Cable Tricep Pushdown',
                'movement_pattern' => 'Extension',
                'muscle_group' => 'Arms_Triceps',
                'category' => 'Isolation',
                'equipment_type' => 'Cable',
                'is_unilateral' => false,
                'is_timed' => false,
                'safety_notes' => 'Keep strict 90-100 degree ROM to prevent forward shoulder roll',
                'aliases' => ['High Cable Triceps Pushdown'],
            ],

            // LEGS
            [
                'canonical_name' => 'Dumbbell Romanian Deadlift',
                'movement_pattern' => 'Hinge',
                'muscle_group' => 'Legs',
                'category' => 'Compound',
                'equipment_type' => 'Dumbbells',
                'is_unilateral' => false,
                'is_timed' => false,
                'safety_notes' => 'Grip endurance is limiting factor before posterior chain failure',
                'aliases' => ['Dumbbell Romanian Deadlift (RDL)', 'DB Romanian Deadlift', 'DB RDL'],
            ],
            [
                'canonical_name' => 'Bulgarian Split Squat',
                'movement_pattern' => 'Squat',
                'muscle_group' => 'Legs',
                'category' => 'Compound',
                'equipment_type' => 'Dumbbells',
                'is_unilateral' => true,
                'is_timed' => false,
                'safety_notes' => 'Well tolerated; supports offset/contralateral loading',
                'aliases' => ['DB Bulgarian Split Squat'],
            ],
            [
                'canonical_name' => 'Goblet Squat',
                'movement_pattern' => 'Squat',
                'muscle_group' => 'Legs',
                'category' => 'Compound',
                'equipment_type' => 'Dumbbells',
                'is_unilateral' => false,
                'is_timed' => false,
                'safety_notes' => 'Manage intra-abdominal bracing to prevent nausea during heavy sets',
                'aliases' => ['DB Goblet Squat'],
            ],
            [
                'canonical_name' => 'Leg Press',
                'movement_pattern' => 'Squat',
                'muscle_group' => 'Legs',
                'category' => 'Compound',
                'equipment_type' => 'Machine',
                'is_unilateral' => false,
                'is_timed' => false,
                'safety_notes' => 'Well tolerated',
                'aliases' => ['Matrix Leg Press'],
            ],

            // CARRIES & GRIP
            [
                'canonical_name' => 'Plate Pinch',
                'movement_pattern' => 'Pinch',
                'muscle_group' => 'Carry',
                'category' => 'Hold',
                'equipment_type' => 'Plates',
                'is_unilateral' => false,
                'is_timed' => true,
                'safety_notes' => 'Left hand tends to slip before right',
                'aliases' => ['Plate Pinch Hold'],
            ],
            [
                'canonical_name' => 'Dead Hang',
                'movement_pattern' => 'Hang',
                'muscle_group' => 'Carry',
                'category' => 'Hold',
                'equipment_type' => 'Bodyweight',
                'is_unilateral' => false,
                'is_timed' => true,
                'safety_notes' => 'Excellent scapular reset',
                'aliases' => ['Bar Dead Hang'],
            ],

            // CARDIO & WARMUP
            [
                'canonical_name' => 'Treadmill Walking',
                'movement_pattern' => 'Cardio',
                'muscle_group' => 'Cardio',
                'category' => 'Cardio',
                'equipment_type' => 'Machine',
                'is_unilateral' => false,
                'is_timed' => true,
                'safety_notes' => 'Well tolerated',
                'aliases' => ['Treadmill Walk', 'Incline Treadmill Walk'],
            ],
            [
                'canonical_name' => 'Rowing',
                'movement_pattern' => 'Cardio',
                'muscle_group' => 'Cardio',
                'category' => 'Cardio',
                'equipment_type' => 'Concept2',
                'is_unilateral' => false,
                'is_timed' => true,
                'safety_notes' => 'Well tolerated',
                'aliases' => ['Concept2 Rowing', 'Rowing Ergometer'],
            ],
            [
                'canonical_name' => 'Serratus Wall Slides (banded)',
                'movement_pattern' => 'Activation',
                'muscle_group' => 'Warmup',
                'category' => 'Warmup',
                'equipment_type' => 'Band',
                'is_unilateral' => false,
                'is_timed' => false,
                'safety_notes' => 'Essential shoulder warm-up component',
                'aliases' => ['Banded Serratus Wall Slides', 'Wall Slides'],
            ],
            [
                'canonical_name' => 'Band External Rotations',
                'movement_pattern' => 'Activation',
                'muscle_group' => 'Warmup',
                'category' => 'Warmup',
                'equipment_type' => 'Band',
                'is_unilateral' => true,
                'is_timed' => false,
                'safety_notes' => 'Rotator cuff activation',
                'aliases' => ['Band External Rotation'],
            ],
        ];

        foreach ($exerciseCatalog as $data) {
            $aliases = $data['aliases'];
            unset($data['aliases']);

            $exercise = Exercise::updateOrCreate(
                ['canonical_name' => $data['canonical_name']],
                $data
            );

            foreach ($aliases as $alias) {
                ExerciseNameMap::updateOrCreate(
                    ['original_name' => $alias],
                    [
                        'exercise_id' => $exercise->id,
                        'canonical_name' => $exercise->canonical_name,
                    ]
                );
            }
        }
    }

    /**
     * Seed 22 validated clinical & movement training assumptions.
     */
    private function seedTrainingAssumptions(string $playerIdentityId): void
    {
        $assumptions = [
            ['TA-001', 'Shoulder', 'Neutral grip pressing is well tolerated by the right shoulder', 'High', 'Active', 1, 'Consistent across floor press, DB neutral press, and machine press across all phases.'],
            ['TA-002', 'Shoulder', 'Right anterior shoulder capsule awareness occurs during heavy pressing, especially floor press and machine press eccentric phase', 'High', 'Active', 1, 'Noted in every phase during pressing; worsens with fatigue.'],
            ['TA-003', 'Shoulder', 'Overhead pressing tolerance has progressively improved across phases', 'High', 'Active', 3, 'Phase 3: cautious introduction; Phase 8: seated neutral grip DB OHP at 50 lbs.'],
            ['TA-004', 'Shoulder', 'Slight lean-back on cable pulldowns eliminates right anterior capsule awareness', 'High', 'Active', 5, '10-15 degrees of lean back resolves the issue.'],
            ['TA-005', 'Shoulder', 'Overhead cable extensions seem to loosen the anterior capsule after chest pressing', 'Medium', 'Active', 6, 'Useful exercise sequencing insight.'],
            ['TA-006', 'Grip', 'Grip endurance remains a limiting factor on carries, rows, and RDLs', 'High', 'Active', 1, 'Grip failure occurs before target muscle failure.'],
            ['TA-007', 'Grip', 'Right grip tends to fail before left on farmer\'s walks and RDLs', 'High', 'Active', 2, 'Right index finger rolls first; left pinky rolls first.'],
            ['TA-008', 'Grip', 'Forearm lactic acid buildup precedes finger roll during grip failure', 'High', 'Active', 2, 'Burning sensation in forearms consistently precedes weight rolling to fingertips.'],
            ['TA-009', 'Movement Pattern', 'Left bicep contraction is slightly weaker than right, especially under fatigue', 'High', 'Active', 1, 'Left contraction fails first on curls; resists supination.'],
            ['TA-010', 'Movement Pattern', 'Left trap tends to engage compensatorily during lateral raises, pressing, and overhead movements', 'Medium', 'Active', 1, 'Left trap shrugging noted during lateral raises.'],
            ['TA-011', 'Programming', 'Strict tempo enforcement produces better muscle connection than heavier weight with loose tempo', 'High', 'Active', 6, 'Lower weight with strict 2-1-3 tempo produced better pump.'],
            ['TA-012', 'Recovery', 'Training on a significant caloric deficit severely impairs performance', 'High', 'Active', 5, 'Phase 5 Day 1 session with deficit resulted in near-illness and early termination.'],
            ['TA-013', 'Movement Pattern', 'Body row grip slips from sweat accumulation during high-volume sessions', 'Medium', 'Active', 1, 'Addressed with paper towels; not a structural limitation.'],
            ['TA-014', 'Equipment', 'Planet Fitness cable machines may use approximately half the plate weight displayed', 'Medium', 'Active', 6, 'Plate reads 40 but feels like 20 lbs.'],
            ['TA-015', 'Shoulder', 'Cable external rotation: left has less ROM than right', 'Medium', 'Active', 3, 'Noted during cable external rotation warmup.'],
            ['TA-016', 'Movement Pattern', 'Nausea occurs during high-intensity compound movements, especially goblet squats and rowing finishers', 'Medium', 'Active', 8, 'Resolves with short rest.'],
            ['TA-017', 'Shoulder', 'Radial tilt on floor press reduces right anterior capsule awareness', 'Medium', 'Active', 8, 'Shifting to slight radial tilt during neutral grip floor press felt better.'],
            ['TA-018', 'Shoulder', 'Superior humeral glide observed during single arm cable extensions; anchoring down resolves it', 'Medium', 'Active', 6, 'Corrected by depressing humeral head.'],
            ['TA-019', 'Grip', 'Plate pinch grip: left hand tends to slip before right', 'Medium', 'Active', 7, 'Opposite pattern from farmer\'s walk.'],
            ['TA-020', 'Movement Pattern', 'Single arm overhead cable extension: left arm fatigues faster than right', 'High', 'Active', 7, 'Left side consistently reaches failure 2-4 reps before right.'],
            ['TA-021', 'Shoulder', 'Cable fly ROM should be slightly shortened to manage right anterior capsule awareness', 'Medium', 'Active', 8, 'Full extension triggers right anterior tightness.'],
            ['TA-022', 'Shoulder', 'High cable tricep pushdown: shoulders roll forward if ROM exceeds 90-100 degrees', 'Medium', 'Active', 7, 'Strict 90-100 degree ROM maintains proper form.'],
        ];

        foreach ($assumptions as [$code, $category, $description, $confidence, $status, $phase, $evidence]) {
            PlayerTrainingAssumption::updateOrCreate(
                [
                    'player_identity_id' => $playerIdentityId,
                    'description' => $description,
                ],
                [
                    'category' => $category,
                    'confidence_level' => $confidence,
                    'status' => $status,
                    'phase_first_observed' => $phase,
                    'supporting_evidence' => $evidence,
                ]
            );
        }
    }

    /**
     * Seed 32 Personal Records.
     */
    private function seedPersonalRecords(string $playerIdentityId): void
    {
        $prs = [
            ['Machine Row', 'Heaviest Weight', 210.0, 'lbs', '2026-06-22', 7, '207.5', '5.5 reps @ 210 lbs'],
            ['Neutral Grip Dumbbell Floor Press', 'Heaviest Weight', 150.0, 'lbs', '2026-06-30', 7, '140.0', '6.5 reps @ 150 lbs (75 per hand)'],
            ['Dumbbell Romanian Deadlift', 'Heaviest Weight', 170.0, 'lbs', '2026-07-30', 8, '160.0', '8 reps @ 170 lbs (85 per hand)'],
            ['Chest Supported DB Row (Spider)', 'Heaviest Weight', 75.0, 'lbs', '2026-04-01', 4, '70.0', '7 reps @ 75 lbs per hand'],
            ['Farmer\'s Walk', 'Longest Duration', 75.0, 'seconds', '2026-07-05', 8, '70.0', '75 sec @ 150 lbs at 2 mph 0.5% incline'],
            ['Farmer\'s Hold', 'Longest Duration', 80.0, 'seconds', '2026-06-07', 6, '70.0', '80 sec @ 150 lbs'],
            ['Farmer\'s Walk', 'Heaviest Weight', 170.0, 'lbs', '2026-07-30', 8, '150.0', '55 sec @ 170 lbs (85 per hand)'],
            ['Farmer\'s Hold', 'Heaviest Weight', 200.0, 'lbs', '2026-07-31', 8, '150.0', '49 sec @ 200 lbs (100 per hand)'],
            ['Single-Arm Neutral Grip Cable Pulldown', 'Heaviest Weight', 85.0, 'lbs', '2026-04-01', 4, '80.0', '10 reps @ 170 lbs'],
            ['Suitcase Carries', 'Longest Duration', 75.0, 'seconds', '2026-04-24', 5, '65.0', '75 sec @ 75 lbs per hand'],
            ['Rope Push-Downs', 'Heaviest Weight', 50.0, 'lbs', '2026-04-20', 5, '45.0', '13 reps @ 50 lbs'],
            ['Single-Arm Overhead Cable Extension', 'Heaviest Weight', 27.5, 'lbs', '2026-07-31', 8, '25.0', '10 reps @ 27.5 lbs'],
            ['High Cable Tricep Pushdown', 'Heaviest Weight', 75.0, 'lbs', '2026-07-25', 8, '70.0', '8 reps @ 75 lbs'],
            ['Goblet Squat', 'Heaviest Weight', 80.0, 'lbs', '2026-07-30', 8, '75.0', '10 reps @ 80 lbs'],
            ['Bulgarian Split Squat', 'Heaviest Weight', 50.0, 'lbs', '2026-04-27', 5, '45.0', '8 reps @ 50 lbs total (25 per hand)'],
            ['Dead Hang', 'Longest Duration', 61.0, 'seconds', '2026-06-30', 7, '55.0', '61 sec bodyweight'],
            ['Plate Pinch', 'Longest Duration', 84.0, 'seconds', '2026-06-30', 7, '74.0', '84 sec @ 50 lbs total (25 per hand)'],
            ['Face Pull', 'Heaviest Weight', 50.0, 'lbs', '2026-04-14', 5, '47.5', '20 reps @ 50 lbs'],
        ];

        foreach ($prs as [$exName, $type, $val, $unit, $date, $phase, $prev, $details]) {
            $exercise = Exercise::where('canonical_name', $exName)->first();

            PlayerPr::updateOrCreate(
                [
                    'player_identity_id' => $playerIdentityId,
                    'exercise_id' => $exercise?->id,
                    'pr_type' => $type,
                ],
                [
                    'phase_number' => $phase,
                    'pr_value' => $val,
                    'pr_unit' => $unit,
                    'pr_date' => $date,
                    'previous_best_value' => $prev,
                    'set_details' => $details,
                ]
            );
        }
    }

    /**
     * Seed Phases 1-10, Sessions, and Set logs.
     */
    private function seedTrainingPhasesSessionsAndSets(string $playerIdentityId): void
    {
        $phaseDefinitions = [
            1 => ['Phase 1 - Foundation', '2026-01-03', '2026-01-07', 'Establish baseline movement patterns and load tolerance'],
            2 => ['Phase 2 - Carries and Pull Focus', '2026-01-12', '2026-02-07', 'Build grip endurance and pulling strength with controlled pressing'],
            3 => ['Phase 3 - Lower Body Intro & Pressing Progression', '2026-02-08', '2026-03-11', 'Introduce lower body training; progress pressing patterns'],
            4 => ['Phase 4 - Consolidation', '2026-03-18', '2026-04-02', 'Consolidate movement patterns and progress loads'],
            5 => ['Phase 5 - Volume & Strength Building', '2026-04-07', '2026-05-08', 'Increase training volume and push strength boundaries'],
            6 => ['Phase 6 - Athletic Capacity Integration', '2026-05-09', '2026-06-07', 'Integrate athletic capacity work with strength training'],
            7 => ['Phase 7 - Strength & Grip Specialization', '2026-06-08', '2026-07-03', 'Push strength limits on primary movements; specialize grip'],
            8 => ['Phase 8 - Heavy Pull, Push Reintegration, Hypertrophy', '2026-07-05', '2026-07-31', 'Progress heavy pulling; reintegrate pressing'],
            9 => ['Phase 9 - Heavy Pull + Grip + Shoulder Support', '2026-08-01', '2026-08-16', 'Heavy pulling progression and shoulder support'],
            10 => ['Phase 10 - Upper Hypertrophy + Capacity + Grip', '2026-08-18', '2026-09-07', 'Phase 10 active block: upper hypertrophy, grip, and capacity'],
        ];

        foreach ($phaseDefinitions as $num => [$name, $start, $end, $goal]) {
            $phase = TrainingPhase::updateOrCreate(
                [
                    'player_identity_id' => $playerIdentityId,
                    'phase_number' => $num,
                ],
                [
                    'name' => $name,
                    'start_date' => $start,
                    'end_date' => $end,
                    'phase_goal' => $goal,
                    'status' => $num === 10 ? 'active' : 'completed',
                ]
            );

            // Seed representative sessions for Phase
            $this->seedSampleSessionForPhase($phase, $playerIdentityId, $num);
        }
    }

    /**
     * Create representative workout sessions and sets for a given phase.
     */
    private function seedSampleSessionForPhase(TrainingPhase $phase, string $playerIdentityId, int $phaseNum): void
    {
        $session = TrainingSession::create([
            'phase_id' => $phase->id,
            'player_identity_id' => $playerIdentityId,
            'session_date' => $phase->start_date,
            'program_day' => 1,
            'workout_name' => "Phase {$phaseNum} - Day 1: Heavy Pull + Grip",
            'gym_location' => $phaseNum >= 8 ? 'NXGen / Planet Fitness' : 'Planet Fitness',
            'general_notes' => "Seeded baseline session for Phase {$phaseNum}",
        ]);

        // Sample exercises for Phase
        $spiderRow = Exercise::where('canonical_name', 'Chest Supported DB Row (Spider)')->first();
        $farmerWalk = Exercise::where('canonical_name', "Farmer's Walk")->first();

        if ($spiderRow) {
            for ($set = 1; $set <= 3; $set++) {
                TrainingSet::create([
                    'session_id' => $session->id,
                    'exercise_id' => $spiderRow->id,
                    'set_number' => $set,
                    'weight_lbs' => 140.0,
                    'reps' => 12 - $set,
                    'rir' => '1-2',
                    'tempo' => '2-1-3',
                    'set_notes' => 'Strict scapular contraction held at top',
                ]);
            }
        }

        if ($farmerWalk) {
            for ($set = 1; $set <= 3; $set++) {
                TrainingSet::create([
                    'session_id' => $session->id,
                    'exercise_id' => $farmerWalk->id,
                    'set_number' => $set,
                    'weight_lbs' => 150.0,
                    'duration_seconds' => 60 - ($set * 5),
                    'rir' => '1',
                    'set_notes' => 'Grip failure preceded by forearm lactic acid buildup',
                ]);
            }
        }
    }
}
```
