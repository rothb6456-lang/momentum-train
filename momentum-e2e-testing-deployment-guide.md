# Momentum & Bulldog Statbook: End-to-End Testing & Deployment Guide

This document provides a step-by-step verification protocol and deployment checklist for the entire **Momentum Training Intelligence** pipeline within the **Bulldog Statbook Ecosystem**.

---

## System Pipeline Architecture

```text
[ Momentum PWA ] ────(Offline Gym Floor)────> [ localStorage Queue ]
       │                                             │
       └───────────(Network Restored)────────────────┘
                         │
                         ▼  POST /api/v1/training/sessions (Bearer Token)
  [ StoreTrainingSessionRequest ] (Input Validation & Sanitization)
                         │
                         ▼
  [ TrainingSessionController ]  ──(DB::transaction)──> [ Database ]
                         │                                ├── training_sessions
                         │                                ├── training_sets
                         │                                └── player_prs
                         ▼
  [ Filament Admin Portal ] (Visual Verification & Roster Oversight)
```

---

## Phase 1: Local Development & Environment Setup

### 1. Backend Setup (`bulldog-statbook` Repo)

1. **Verify Environment Variables (`.env`)**:
   Ensure local database and CORS settings are configured:
   ```env
   APP_URL=http://localhost:8000
   FRONTEND_URL=http://localhost:3000
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
   DB_CONNECTION=mysql # or pgsql / sqlite
   DB_DATABASE=bulldog_statbook
   ```

2. **Execute Database Migrations & Seeders**:
   ```bash
   # Run migrations to create Momentum tables
   php artisan migrate

   # Ingest canonical exercise library, assumptions, and historical data (Phases 1-10)
   php artisan db:seed --class=MomentumHistoricalDataSeeder
   ```

3. **Verify Registered Routes**:
   ```bash
   php artisan route:list --path=v1/training
   ```
   *Expected Output*:
   - `GET|HEAD api/v1/training/sessions`
   - `POST api/v1/training/sessions`
   - `GET|HEAD api/v1/training/sessions/{session}`

4. **Boot Local Development Server**:
   ```bash
   php artisan serve --port=8000
   ```

---

### 2. Frontend Setup (`Momentum` PWA Repo)

1. **Configure API Base URL (`sync.js`)**:
   Set target backend endpoint:
   ```javascript
   const CONFIG = {
     API_BASE_URL: 'http://localhost:8000/api/v1/training',
     AUTH_TOKEN_KEY: 'momentum_sanctum_token'
   };
   ```

2. **Serve PWA Locally**:
   ```bash
   npx serve . -p 3000
   ```

---

## Phase 2: End-to-End Integration Testing Protocol

### Test Case 1: Gym-Floor Offline Session Entry

* **Goal**: Verify that workout logging remains 100% functional without an active network connection.
* **Steps**:
  1. Open Chrome DevTools (`F12`) $\to$ **Network** tab $\to$ Select **Offline**.
  2. In Momentum PWA, navigate to **Plan** $\to$ Queue a Phase 10 workout card.
  3. Navigate to **Log** $\to$ Enter set details:
     - Exercise: `Chest-supported DB Row - Spider` | Load: `140 lbs` | Reps: `12` | Tempo: `2-1-3` | RIR: `2`
     - Exercise: `Dumbbell Romanian Deadlift` | Load: `180 lbs` | Reps: `10` | Tempo: `2-1-3` | RIR: `2` *(Triggers PR Check)*
  4. Tap **Complete Session** on Review screen.
* **Verification**:
  - UI shows `Saved Locally (Pending Sync)` badge.
  - Open DevTools $\to$ **Application** $\to$ **Local Storage** $\to$ Check `momentum_pending_syncs`:
    - Contains 1 queued session object with `sync_status: 'pending'`.

---

### Test Case 2: Background Network Sync & API Validation

* **Goal**: Verify that restoring connectivity flushes pending sessions to Laravel transactionally.
* **Steps**:
  1. In DevTools **Network** tab, switch back to **Online**.
  2. Trigger `online` event in browser or tap **Sync Now** in PWA status bar.
* **Verification**:
  - PWA sends `POST /api/v1/training/sessions` payload with Sanctum token.
  - HTTP Response Status: `201 Created`.
  - JSON Response contains:
    ```json
    {
      "success": true,
      "message": "Training session synced successfully.",
      "session_id": "S-20260909-01",
      "synced_sets": 2,
      "new_prs": [
        {
          "exercise": "Dumbbell Romanian Deadlift",
          "pr_type": "Heaviest Weight",
          "pr_value": "180 lbs"
        }
      ]
    }
    ```
  - PWA local storage updates session `sync_status` to `'synced'`.
  - PWA UI displays Toast: `✓ Synced with Statbook! New PR: Dumbbell Romanian Deadlift (180 lbs)`.

---

### Test Case 3: Database Integrity Check

* **Goal**: Verify data persistence and alias resolution directly in MySQL/PostgreSQL.
* **SQL Queries**:
  ```sql
  -- 1. Check Session Record
  SELECT * FROM training_sessions WHERE session_date = '2026-09-09';

  -- 2. Check Set Entries & Exercise Foreign Keys
  SELECT s.set_number, e.canonical_name, s.weight_lbs, s.reps, s.tempo, s.rir
  FROM training_sets s
  JOIN exercises e ON s.exercise_id = e.id
  WHERE s.session_id = (SELECT id FROM training_sessions WHERE session_date = '2026-09-09');

  -- 3. Check Automated PR Log
  SELECT * FROM player_prs WHERE pr_date = '2026-09-09';
  ```

---

### Test Case 4: Filament Admin Portal Verification

* **Goal**: Confirm that coaches and admins can inspect synced workouts in Filament.
* **Steps**:
  1. Open browser $\to$ `http://localhost:8000/admin`.
  2. Log in with LLC Admin or Coach credentials.
  3. Navigate to **Training Sessions**:
     - Verify session logged on `2026-09-09` appears under athlete's display name.
     - Expand session details to inspect logged sets, Tempos, RIRs, and set notes.
  4. Navigate to **Player PRs**:
     - Verify new PR badge (`Dumbbell Romanian Deadlift - 180 lbs`) displays under active PR records.
  5. Navigate to **Active Assumptions**:
     - Verify athlete's active shoulder/grip guardrails are displayed and editable.

---

## Phase 3: Automated Feature Test Suite (`PHPUnit`)

Create `tests/Feature/Training/StoreTrainingSessionTest.php` in the `bulldog-statbook` repo:

```php
namespace Tests\Feature\Training;

use App\Models\User;
use App\Models\PlayerIdentity;
use App\Models\Exercise;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StoreTrainingSessionTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_sync_pwa_training_session_and_detect_pr()
    {
        $user = User::factory()->create();
        $player = PlayerIdentity::factory()->create(['user_id' => $user->id]);
        
        $exercise = Exercise::create([
            'id' => (string) \Str::uuid(),
            'canonical_name' => 'Dumbbell Romanian Deadlift',
            'movement_pattern' => 'Hip Hinge',
            'category' => 'Legs',
            'equipment_type' => 'Dumbbells'
        ]);

        $payload = [
            'workout_name' => 'Phase 10 - Day 3: Lower Body',
            'session_date' => '2026-09-09',
            'sets' => [
                [
                    'exercise_name' => 'DB Romanian Deadlift', // Tests alias resolution
                    'set_number' => 1,
                    'weight_lbs' => 180,
                    'reps' => 10,
                    'tempo' => '2-1-3',
                    'rir' => '2',
                    'set_notes' => 'Heavy PR set'
                ]
            ]
        ];

        $response = $this->actingAs($user, 'sanctum')
                         ->postJson('/api/v1/training/sessions', $payload);

        $response->assertStatus(201)
                 ->assertJsonPath('success', true)
                 ->assertJsonPath('synced_sets', 1);

        $this->assertDatabaseHas('training_sessions', [
            'player_identity_id' => $player->id,
            'workout_name' => 'Phase 10 - Day 3: Lower Body'
        ]);

        $this->assertDatabaseHas('player_prs', [
            'player_identity_id' => $player->id,
            'pr_value' => 180
        ]);
    }
}
```

Run test via terminal:
```bash
php artisan test --filter=StoreTrainingSessionTest
```

---

## Phase 4: Production Deployment Checklist

### 1. Backend Deployment (`bulldog-statbook` on Production Server)

- [ ] Merge training branch to `main`.
- [ ] Run production database migrations: `php artisan migrate --force`.
- [ ] Seed canonical exercises and assumptions: `php artisan db:seed --class=MomentumHistoricalDataSeeder --force`.
- [ ] Optimize Laravel caches:
  ```bash
  php artisan config:cache
  php artisan route:cache
  php artisan view:cache
  ```
- [ ] Verify CORS headers allow production PWA origin (`https://momentum.bulldogstats.com`).

### 2. Frontend Deployment (`Momentum` PWA on Cloudflare Pages)

- [ ] Update `CONFIG.API_BASE_URL` in `sync.js` to `https://statbook.bulldogstats.com/api/v1/training`.
- [ ] Bump service worker cache version in `sw.js` (e.g., `CACHE_NAME = 'momentum-v2.0'`).
- [ ] Commit and push to production deployment branch.
- [ ] Perform live mobile smoke test on gym floor (iOS Safari & Android Chrome):
  - Verify offline entry $\to$ reconnect $\to$ background sync $\to$ Filament display.
