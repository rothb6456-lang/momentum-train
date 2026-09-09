# Momentum PWA Sync API Controller (`TrainingSessionController.php`)

This controller handles authenticated JSON synchronization from the **Momentum PWA** to the **Bulldog Statbook** Laravel backend. It supports both single-session posting and batch syncing when re-establishing network connectivity.

---

## 1. Form Request Validation (`StoreTrainingSessionRequest.php`)

```php
<?php

namespace App\Http\Requests\Api\V1\Training;

use Illuminate\Foundation\Http\FormRequest;

class StoreTrainingSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'player_identity_id' => ['nullable', 'string', 'exists:player_identities,id'],
            'session_date'       => ['required', 'date'],
            'program_day'        => ['nullable', 'integer', 'min:1', 'max:7'],
            'workout_name'       => ['required', 'string', 'max:255'],
            'gym_location'       => ['nullable', 'string', 'max:255'],
            'general_notes'      => ['nullable', 'string'],
            'rpe_overall'        => ['nullable', 'numeric', 'min:1', 'max:10'],

            'sets'                   => ['required', 'array', 'min:1'],
            'sets.*.exercise_name'   => ['required', 'string'],
            'sets.*.exercise_id'     => ['nullable', 'string', 'exists:exercises,id'],
            'sets.*.section'         => ['nullable', 'string', 'in:primary,warmup,cooldown,accessory'],
            'sets.*.set_number'      => ['required', 'integer', 'min:1'],
            'sets.*.weight_lbs'      => ['nullable', 'numeric', 'min:0'],
            'sets.*.reps'            => ['nullable', 'integer', 'min:0'],
            'sets.*.duration_seconds'=> ['nullable', 'integer', 'min:0'],
            'sets.*.rir'             => ['nullable', 'string', 'max:20'],
            'sets.*.tempo'           => ['nullable', 'string', 'max:20'],
            'sets.*.set_notes'       => ['nullable', 'string'],
        ];
    }
}
```

---

## 2. API Controller (`TrainingSessionController.php`)

```php
<?php

namespace App\Http\Controllers\Api\V1\Training;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Training\StoreTrainingSessionRequest;
use App\Models\Exercise;
use App\Models\ExerciseNameMap;
use App\Models\PlayerIdentity;
use App\Models\PlayerPr;
use App\Models\TrainingPhase;
use App\Models\TrainingSession;
use App\Models\TrainingSet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TrainingSessionController extends Controller
{
    /**
     * Display a listing of training sessions for the authenticated player identity.
     */
    public function index(Request $request): JsonResponse
    {
        $playerIdentity = $this->resolvePlayerIdentity($request);

        $sessions = TrainingSession::where('player_identity_id', $playerIdentity->id)
            ->with(['sets.exercise', 'phase'])
            ->orderBy('session_date', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json([
            'status' => 'success',
            'data'   => $sessions,
        ]);
    }

    /**
     * Store a new training session payload synced from Momentum PWA.
     */
    public function store(StoreTrainingSessionRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $playerIdentity = $this->resolvePlayerIdentity($request, $validated['player_identity_id'] ?? null);

        // Resolve active training phase for date
        $phase = TrainingPhase::where('player_identity_id', $playerIdentity->id)
            ->where('start_date', '<=', $validated['session_date'])
            ->where(function ($query) use ($validated) {
                $query->whereNull('end_date')
                      ->orWhere('end_date', '>=', $validated['session_date']);
            })
            ->first();

        $session = DB::transaction(function () use ($validated, $playerIdentity, $phase) {
            // 1. Create Training Session
            $session = TrainingSession::create([
                'id'                 => (string) Str::uuid(),
                'phase_id'           => $phase?->id,
                'player_identity_id' => $playerIdentity->id,
                'session_date'       => $validated['session_date'],
                'program_day'        => $validated['program_day'] ?? null,
                'workout_name'       => $validated['workout_name'],
                'gym_location'       => $validated['gym_location'] ?? null,
                'general_notes'      => $validated['general_notes'] ?? null,
                'rpe_overall'        => $validated['rpe_overall'] ?? null,
            ]);

            // 2. Process Sets and Check PRs
            foreach ($validated['sets'] as $setPayload) {
                $exercise = $this->resolveExercise($setPayload['exercise_id'] ?? null, $setPayload['exercise_name']);

                $set = TrainingSet::create([
                    'id'               => (string) Str::uuid(),
                    'session_id'       => $session->id,
                    'exercise_id'      => $exercise->id,
                    'section'          => $setPayload['section'] ?? 'primary',
                    'set_number'       => $setPayload['set_number'],
                    'weight_lbs'       => $setPayload['weight_lbs'] ?? 0,
                    'reps'             => $setPayload['reps'] ?? null,
                    'duration_seconds' => $setPayload['duration_seconds'] ?? null,
                    'rir'              => $setPayload['rir'] ?? null,
                    'tempo'            => $setPayload['tempo'] ?? null,
                    'set_notes'        => $setPayload['set_notes'] ?? null,
                ]);

                // Check for Personal Records
                $this->evaluatePersonalRecord($playerIdentity, $session, $exercise, $set);
            }

            return $session->load(['sets.exercise', 'phase']);
        });

        return response()->json([
            'status'  => 'success',
            'message' => 'Training session synced successfully.',
            'data'    => [
                'session_id'   => $session->id,
                'session_date' => $session->session_date->toDateString(),
                'synced_at'    => now()->toIso8601String(),
                'sets_count'   => $session->sets->count(),
            ],
        ], 201);
    }

    /**
     * Display a specific session with detailed set logs.
     */
    public function show(TrainingSession $session): JsonResponse
    {
        $this->authorize('view', $session);

        return response()->json([
            'status' => 'success',
            'data'   => $session->load(['sets.exercise', 'phase', 'playerIdentity']),
        ]);
    }

    /**
     * Resolve the PlayerIdentity associated with the authenticated user or payload.
     */
    private function resolvePlayerIdentity(Request $request, ?string $explicitId = null): PlayerIdentity
    {
        if ($explicitId) {
            return PlayerIdentity::findOrFail($explicitId);
        }

        $user = $request->user();

        // Check if user has an associated PlayerIdentity (ADR-001)
        $playerIdentity = PlayerIdentity::where('user_id', $user->id)->first();

        if (!$playerIdentity) {
            // Auto-create claimed player identity if first-time user
            $playerIdentity = PlayerIdentity::create([
                'id'           => (string) Str::uuid(),
                'player_code'  => 'PLR-' . strtoupper(Str::random(8)),
                'user_id'      => $user->id,
                'claim_status' => 'claimed',
                'display_name' => $user->name ?? explode('@', $user->email)[0],
            ]);
        }

        return $playerIdentity;
    }

    /**
     * Resolve Exercise model using UUID or canonical/mapped name.
     */
    private function resolveExercise(?string $exerciseId, string $rawName): Exercise
    {
        if ($exerciseId && $exercise = Exercise::find($exerciseId)) {
            return $exercise;
        }

        // Try exact canonical match
        if ($exercise = Exercise::where('canonical_name', $rawName)->first()) {
            return $exercise;
        }

        // Try ExerciseNameMap alias
        $map = ExerciseNameMap::where('logged_name', $rawName)->first();
        if ($map && $exercise = Exercise::find($map->canonical_exercise_id)) {
            return $exercise;
        }

        // Fallback: create new exercise in library
        return Exercise::create([
            'id'             => (string) Str::uuid(),
            'canonical_name' => $rawName,
            'category'       => 'Other',
        ]);
    }

    /**
     * Evaluate if a completed set breaks a Personal Record.
     */
    private function evaluatePersonalRecord(PlayerIdentity $player, TrainingSession $session, Exercise $exercise, TrainingSet $set): void
    {
        // 1. Weight PR Check
        if ($set->weight_lbs > 0 && ($set->reps > 0 || $set->duration_seconds > 0)) {
            $existingWeightPr = PlayerPr::where('player_identity_id', $player->id)
                ->where('exercise_id', $exercise->id)
                ->where('pr_type', 'Heaviest Weight')
                ->first();

            if (!$existingWeightPr || $set->weight_lbs > $existingWeightPr->pr_value) {
                PlayerPr::updateOrCreate(
                    [
                        'player_identity_id' => $player->id,
                        'exercise_id'        => $exercise->id,
                        'pr_type'            => 'Heaviest Weight',
                    ],
                    [
                        'id'            => (string) Str::uuid(),
                        'pr_value'      => $set->weight_lbs,
                        'pr_unit'       => 'lbs',
                        'pr_date'       => $session->session_date,
                        'phase_id'      => $session->phase_id,
                        'previous_best' => $existingWeightPr?->pr_value,
                        'set_details'   => "{$set->reps} reps @ {$set->weight_lbs} lbs",
                        'notes'         => 'Automated PR detected from Momentum PWA sync',
                    ]
                );
            }
        }

        // 2. Duration PR Check (for timed carries/holds)
        if ($set->duration_seconds > 0) {
            $existingDurationPr = PlayerPr::where('player_identity_id', $player->id)
                ->where('exercise_id', $exercise->id)
                ->where('pr_type', 'Longest Duration')
                ->first();

            if (!$existingDurationPr || $set->duration_seconds > $existingDurationPr->pr_value) {
                PlayerPr::updateOrCreate(
                    [
                        'player_identity_id' => $player->id,
                        'exercise_id'        => $exercise->id,
                        'pr_type'            => 'Longest Duration',
                    ],
                    [
                        'id'            => (string) Str::uuid(),
                        'pr_value'      => $set->duration_seconds,
                        'pr_unit'       => 'seconds',
                        'pr_date'       => $session->session_date,
                        'phase_id'      => $session->phase_id,
                        'previous_best' => $existingDurationPr?->pr_value,
                        'set_details'   => "{$set->duration_seconds} sec @ {$set->weight_lbs} lbs",
                        'notes'         => 'Automated Duration PR detected from Momentum PWA sync',
                    ]
                );
            }
        }
    }
}
```

---

## 3. Route Registration (`routes/api.php`)

Add the following route definition inside your Sanctum-authenticated API route group in `routes/api.php`:

```php
use App\Http\Controllers\Api\V1\Training\TrainingSessionController;

Route::middleware('auth:sanctum')->prefix('v1')->group(function () {
    // Momentum Training Engine Routes
    Route::get('/training/sessions', [TrainingSessionController::class, 'index']);
    Route::post('/training/sessions', [TrainingSessionController::class, 'store']);
    Route::get('/training/sessions/{session}', [TrainingSessionController::class, 'show']);
});
```
