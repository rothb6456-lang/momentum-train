# Training Database Schema v1.0  
# Last Updated: 2026-08-02  
# Authors: Claude & Brian

## OVERVIEW  
Post-bilateral total shoulder replacement training database.  
9 training phases spanning January 3, 2026 to present.  
Phase 1-8: 129 sessions, 2,967 working sets, 32 personal records.  
Phase 9: In progress.

Primary gyms:  
- Planet Fitness (Phases 1-8): Current primary gym  
- Hotel gyms (various phases): Travel sessions  
- NXGen (Phase 8 Week 4, Phase 9 Week 1): Historical exposure, equipment evaluation

Gym Status Note: NXGen provided heavier dumbbell selection and finer  
load increments. Performance data from NXGen sessions should not be  
directly compared to Planet Fitness data without accounting for  
machine-specific resistance differences.  

## PHASEWEEK FIELD  
PhaseWeek is calculated as: floor((SessionDate - PhaseStartDate) / 7) + 1  
This enables queries like "Phase 8 Week 3 Day 2" without date arithmetic.

## EXERCISE NAME MAPPING  
In 02_Training_Reference.csv, the ExerciseNameMap section uses:  
- ExerciseName column = Original logged name  
- Notes column = Canonical/standard name  
This ensures historical exercise names resolve correctly in longitudinal queries.

## CSV SECTION IDENTIFIERS  
Each consolidated CSV uses a SectionName column:  
- File 2: Lookup_Exercises, ExerciseLibrary, ExerciseNameMap, Equipment  
- File 3: PersonalRecords, TrainingAssumptions, WeeklyVolume, Compliance

To filter a specific section, use: SectionName = "PersonalRecords"  
## TABLE RELATIONSHIPS  
Phase (1) → Session (many) → Exercise (many)  
Exercise (many) → Lookup_Exercises (1) via ExerciseName  
Session (1) → PrescribedWorkouts (many) via PhaseID + ProgramDay  
PrescribedWorkouts → Compliance via PhaseID + ProgramDay + ExerciseName

## KEY FIELD DEFINITIONS  
- PhaseID: Integer 1-8, identifies training block  
- SessionID: Format S-YYYYMMDD-##, unique per session  
- ExerciseLogID: Format E-YYYYMMDD-####, unique per set  
- ProgramDay: Integer 1-4, day within the training week  
- WeightLbs: Total bilateral weight (both dumbbells combined)  
- DurationSeconds: For timed exercises (carries, holds, planks)  
- RIR: Reps in Reserve, text field (e.g. "1-2", "0-1")  
- Tempo: Format E-P-C (Eccentric-Pause-Concentric in seconds)  
- Category: Pull, Push, Legs, Arms_Biceps, Arms_Triceps, Core, Carry, Cardio, Warmup

## AI INDEX FILE STRUCTURE  
- 01_Training_Core.csv: Denormalized exercise log with phase/session context  
- 02_Training_Reference.csv: Exercise definitions, equipment, name mappings  
- 03_Training_Analysis.csv: PRs, assumptions, volume trends, compliance  
- 04_Training_Schema.md: This file  
- 05_Training_Database.xlsx: Master workbook

## SECTION IDENTIFIERS IN CSV FILES  
Each consolidated CSV uses a SectionName column:  
- File 2: Lookup_Exercises, ExerciseLibrary, ExerciseNameMap, Equipment  
- File 3: PersonalRecords, TrainingAssumptions, WeeklyVolume, Compliance

## CRITICAL TRAINING CONTEXT  
1. Right anterior capsule awareness during pressing (not pain)  
2. Neutral grip pressing well tolerated across all phases  
3. Grip endurance is primary training limitation  
4. Left bicep contraction weaker than right under fatigue  
5. Left trap compensates during lateral raises and pressing  
6. Overhead pressing tolerance improved progressively  
7. Overhead cable extensions seem to loosen anterior capsule  
8. Strict tempo enforcement produces better results than heavier loads

## EXERCISE CATEGORIES  
- Pull: Rows, pulldowns, face pulls, rear delt work  
- Push: Bench press, floor press, machine press, cable press, flys, overhead press  
- Legs: Squats, RDLs, lunges, split squats, calf raises  
- Arms_Biceps: All curl variations  
- Arms_Triceps: Pushdowns, extensions, overhead extensions  
- Core: Pallof press, side plank, knee raises  
- Carry: Farmer walks, suitcase carries, farmer holds, plate pinch, dead hang  
- Cardio: Rowing, treadmill, cycling, endless rope  
- Warmup: Band work, scap push-ups, wall slides, external rotations

## CHANGELOG  
2026-08-02: Initial database build  
2026-08-02: Added tbl_PrescribedWorkouts (Phases 1-8)  
2026-08-02: Added tbl_Compliance via Power Query  
2026-08-02: Created 5-source AI index package  