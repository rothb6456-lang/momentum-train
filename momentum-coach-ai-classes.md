# Momentum LLM Coach Classes & AI Integration

This document contains the complete production-ready Laravel implementation for **`BuildCoachContext.php`** (Action) and **`CoachAiService.php`** (Service) to power Momentum's AI workout card generator.

---

## 1. Action: `app/Actions/Training/BuildCoachContext.php`

This class queries the database for the athlete's profile, active orthopedic and training assumptions, PR milestones, and most recent workout debrief logs, returning a structured array matching Section 2 of the Coach System Prompt specification.

```php
namespace App\Actions\Training;

use App\Models\PlayerIdentity;
use App\Models\PlayerTrainingAssumption;
use App\Models\PlayerPr;
use App\Models\TrainingSession;
use App\Models\TrainingSet;
use Illuminate\Support\Facades\DB;

class BuildCoachContext
{
    /**
     * Build the structured JSON context array for the LLM Coach.
     *
     * @param string $playerIdentityId
     * @param string|null $targetGymLocation
     * @return array
     */
    public function execute(string $playerIdentityId, ?string $targetGymLocation = null): array
    {
        $player = PlayerIdentity::findOrFail($playerIdentityId);

        // 1. Fetch active orthopedic and training assumptions
        $assumptions = PlayerTrainingAssumption::where('player_identity_id', $playerIdentityId)
            ->where('status', 'active')
            ->get()
            ->groupBy('category');

        $formattedAssumptions = [];
        foreach ($assumptions as $category => $items) {
            $formattedAssumptions[$category] = $items->map(function ($item) {
                return [
                    'id' => $item->id,
                    'description' => $item->description,
                    'confidence' => $item->confidence,
                    'notes' => $item->notes,
                ];
            })->toArray();
        }

        // 2. Fetch top Personal Records
        $prs = PlayerPr::with('exercise')
            ->where('player_identity_id', $playerIdentityId)
            ->orderBy('pr_date', 'desc')
            ->get()
            ->map(function ($pr) {
                return [
                    'exercise' => $pr->exercise ? $pr->exercise->canonical_name : $pr->exercise_name,
                    'pr_type' => $pr->pr_type,
                    'value' => (float) $pr->pr_value,
                    'unit' => $pr->pr_unit,
                    'date' => $pr->pr_date ? $pr->pr_date->format('Y-m-d') : null,
                    'notes' => $pr->notes,
                ];
            })->toArray();

        // 3. Fetch latest completed training session for debrief
        $lastSession = TrainingSession::with(['sets.exercise'])
            ->where('player_identity_id', $playerIdentityId)
            ->orderBy('session_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->first();

        $debriefData = null;
        if ($lastSession) {
            $setsLogged = $lastSession->sets->map(function ($set) {
                return [
                    'set_number' => $set->set_number,
                    'exercise' => $set->exercise ? $set->exercise->canonical_name : 'Unknown',
                    'weight_lbs' => (float) $set->weight_lbs,
                    'reps' => $set->reps,
                    'duration_seconds' => $set->duration_seconds,
                    'tempo' => $set->tempo,
                    'rir' => $set->rir,
                    'set_notes' => $set->set_notes,
                ];
            })->toArray();

            $debriefData = [
                'session_id' => $lastSession->id,
                'session_date' => $lastSession->session_date ? $lastSession->session_date->format('Y-m-d') : null,
                'phase_number' => $lastSession->phase_number,
                'program_day' => $lastSession->program_day,
                'workout_name' => $lastSession->workout_name,
                'gym_location' => $lastSession->gym_location,
                'general_notes' => $lastSession->general_notes,
                'logged_sets' => $setsLogged,
            ];
        }

        // 4. Equipment context based on gym location
        $gymLocation = $targetGymLocation ?? ($lastSession ? $lastSession->gym_location : 'Planet Fitness');
        $equipmentContext = $this->resolveEquipmentContext($gymLocation);

        return [
            'player_profile' => [
                'identity_id' => $player->id,
                'display_name' => $player->display_name,
                'claim_status' => $player->claim_status,
            ],
            'active_training_assumptions' => $formattedAssumptions,
            'personal_records_summary' => $prs,
            'equipment_and_facility_context' => $equipmentContext,
            'last_session_debrief' => $debriefData,
        ];
    }

    /**
     * Resolve facility equipment ceilings and specifics.
     */
    protected function resolveEquipmentContext(string $gymLocation): array
    {
        if (str_contains(strtolower($gymLocation), 'planet fitness')) {
            return [
                'facility' => 'Planet Fitness',
                'dumbbell_ceiling_lbs' => 75.0,
                'has_barbell' => false,
                'has_smith_machine' => true,
                'has_cable_stacks' => true,
                'notes' => 'Dumbbells cap at 75 lbs. Use tempo, RIR, and unilateral load variations for progressive overload past 75 lbs.',
            ];
        }

        if (str_contains(strtolower($gymLocation), 'nxgen')) {
            return [
                'facility' => 'NXGen Fitness',
                'dumbbell_ceiling_lbs' => 120.0,
                'has_barbell' => true,
                'has_smith_machine' => true,
                'has_cable_stacks' => true,
                'notes' => 'Heavy dumbbell selection available (up to 120 lbs).',
            ];
        }

        return [
            'facility' => $gymLocation,
            'dumbbell_ceiling_lbs' => 50.0,
            'has_barbell' => false,
            'has_smith_machine' => false,
            'has_cable_stacks' => true,
            'notes' => 'Standard travel/hotel gym facility assumptions apply.',
        ];
    }
}
```

---

## 2. Service: `app/Services/CoachAiService.php`

This service orchestrates the AI API interaction. It loads the system prompt template (`resources/prompts/momentum_coach.md`), hydrates the user's active database context via `BuildCoachContext`, calls the configured LLM API (OpenAI, Gemini, or Claude), and returns the generated markdown workout card.

```php
namespace App\Services;

use App\Actions\Training\BuildCoachContext;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\File;
use Exception;

class CoachAiService
{
    protected BuildCoachContext $buildCoachContext;

    public function __construct(BuildCoachContext $buildCoachContext)
    {
        $this->buildCoachContext = $buildCoachContext;
    }

    /**
     * Generate a parsable, safe workout card for an athlete.
     *
     * @param string $playerIdentityId
     * @param string $userRequestPrompt e.g., "Queue up Phase 10, Week 3, Day 4"
     * @param string|null $gymLocation
     * @return string Markdown workout card content
     * @throws Exception
     */
    public function generateWorkoutCard(string $playerIdentityId, string $userRequestPrompt, ?string $gymLocation = null): string
    {
        // 1. Load the master LLM Coach system prompt
        $promptPath = resource_path('prompts/momentum_coach.md');
        if (!File::exists($promptPath)) {
            throw new Exception("LLM Coach system prompt not found at [{$promptPath}]. Please ensure resources/prompts/momentum_coach.md exists.");
        }
        $systemPrompt = File::get($promptPath);

        // 2. Build dynamic athlete JSON context from database
        $contextArray = $this->buildCoachContext->execute($playerIdentityId, $gymLocation);
        $contextJson = json_encode($contextArray, JSON_PRETTY_PRINT);

        // 3. Assemble complete prompt payload
        $fullUserContent = "ATHLETE DATABASE CONTEXT (JSON):\n```json\n{$contextJson}\n```\n\nUSER REQUEST:\n{$userRequestPrompt}";

        // 4. Dispatch to API Provider (OpenAI GPT-4o example)
        $apiKey = config('services.openai.key');
        if (empty($apiKey)) {
            throw new Exception("OpenAI API key is not configured in services.openai.key");
        }

        $response = Http::withToken($apiKey)
            ->timeout(60)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model' => config('services.openai.model', 'gpt-4o'),
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => $systemPrompt,
                    ],
                    [
                        'role' => 'user',
                        'content' => $fullUserContent,
                    ],
                ],
                'temperature' => 0.3, // Low temperature for high adherence to clinical rules and output syntax
            ]);

        if ($response->failed()) {
            throw new Exception("AI Coach API call failed: " . $response->body());
        }

        $cardContent = $response->json('choices.0.message.content');

        if (empty($cardContent)) {
            throw new Exception("AI Coach returned an empty response.");
        }

        return trim($cardContent);
    }
}
```

---

## 3. Controller Integration: `app/Http/Controllers/Api/V1/Training/CoachController.php`

Here is how you expose this AI Service to your Momentum PWA via a clean API controller:

```php
namespace App\Http\Controllers\Api\V1\Training;

use App\Http\Controllers\Controller;
use App\Services\CoachAiService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CoachController extends Controller
{
    protected CoachAiService $coachAiService;

    public function __construct(CoachAiService $coachAiService)
    {
        $this->coachAiService = $coachAiService;
    }

    /**
     * Generate a new workout card via the LLM Coach.
     *
     * POST /api/v1/training/coach/generate-card
     */
    public function generateCard(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'prompt' => ['required', 'string', 'max:1000'], // e.g. "Queue up Phase 10 Week 3 Day 4"
            'gym_location' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();
        $playerIdentity = $user->playerIdentity;

        if (!$playerIdentity) {
            return response()->json([
                'message' => 'No player identity linked to this account.',
            ], 422);
        }

        try {
            $markdownCard = $this->coachAiService->generateWorkoutCard(
                $playerIdentity->id,
                $validated['prompt'],
                $validated['gym_location'] ?? null
            );

            return response()->json([
                'success' => true,
                'card_markdown' => $markdownCard,
                'player_identity_id' => $playerIdentity->id,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Coach AI generation failed: ' . $e->getMessage(),
            ], 500);
        }
    }
}
```
