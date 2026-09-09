# Momentum Training Intelligence — Laravel Migrations & Eloquent Models

This document contains the production-ready Laravel Database Migration files and Eloquent Models required to integrate **Momentum Training Intelligence** into the **Bulldog Statbook** unified Laravel backend.

---

## Architectural Principles & Standards

1. **Identity Alignment (ADR-001)**: All training data links to `player_identities.id` (`CHAR(36)` UUID) rather than `users.id`. This ensures coaches can program workouts for unclaimed player profiles before athlete account registration.
2. **UUID Primary Keys**: All tables use string-formatted non-incrementing UUID primary keys (`CHAR(36)`).
3. **Database Portability**: Strict avoidance of DB-native enums, triggers, or stored procedures. All logic resides in Laravel Actions/Models, guaranteeing seamless MySQL and PostgreSQL portability.
4. **Eloquent Relationship Integrity**: Full `belongsTo`, `hasMany`, and `hasOne` relationship graphs configured across all models.

---

## Part 1: Laravel Database Migrations

### 1. `database/migrations/2026_09_09_000001_create_exercises_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('exercises', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('canonical_name')->unique();
            $table->string('movement_pattern')->nullable()->index(); // Pull, Push, Squat/Lunge, Hip Hinge, Carry, etc.
            $table->string('primary_muscle')->nullable();
            $table->string('secondary_muscles')->nullable();
            $table->string('default_equipment_id')->nullable();
            $table->string('laterality')->default('bilateral'); // bilateral, unilateral, alternating
            $table->string('exercise_category')->index(); // Pull, Push, Legs, Arms_Biceps, Arms_Triceps, Core, Carry, Cardio, Warmup
            $table->boolean('is_time_based')->default(false);
            $table->boolean('is_distance_based')->default(false);
            $table->text('preferred_replacements')->nullable();
            $table->text('shoulder_safety_notes')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exercises');
    }
};
```

---

### 2. `database/migrations/2026_09_09_000002_create_exercise_name_maps_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('exercise_name_maps', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('original_name')->unique()->index();
            $table->uuid('exercise_id');
            $table->timestamps();

            $table->foreign('exercise_id')
                  ->references('id')
                  ->on('exercises')
                  ->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exercise_name_maps');
    }
};
```

---

### 3. `database/migrations/2026_09_09_000003_create_training_phases_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('training_phases', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('player_identity_id')->index();
            $table->integer('phase_number')->index();
            $table->string('name');
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->integer('duration_weeks')->nullable();
            $table->integer('sessions_per_week')->nullable();
            $table->text('phase_goal')->nullable();
            $table->text('key_exercises')->nullable();
            $table->text('primary_metrics')->nullable();
            $table->text('secondary_metrics')->nullable();
            $table->text('joint_notes')->nullable();
            $table->text('grip_status')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('player_identity_id')
                  ->references('id')
                  ->on('player_identities')
                  ->cascadeOnDelete();

            $table->unique(['player_identity_id', 'phase_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('training_phases');
    }
};
```

---

### 4. `database/migrations/2026_09_09_000004_create_training_sessions_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('training_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('player_identity_id')->index();
            $table->uuid('phase_id')->nullable()->index();
            $table->date('session_date')->index();
            $table->integer('phase_week')->nullable();
            $table->decimal('program_day', 3, 1)->nullable(); // e.g., 1.0, 2.0, 3.0, 4.0
            $table->string('workout_name');
            $table->timestamp('session_start_time')->nullable();
            $table->timestamp('session_end_time')->nullable();
            $table->integer('duration_minutes')->nullable();
            $table->string('gym_location')->nullable();
            $table->decimal('bodyweight_lbs', 5, 2)->nullable();
            $table->decimal('rpe_overall', 3, 1)->nullable();
            $table->integer('exercise_count')->default(0);
            $table->text('general_notes')->nullable();
            $table->timestamps();

            $table->foreign('player_identity_id')
                  ->references('id')
                  ->on('player_identities')
                  ->cascadeOnDelete();

            $table->foreign('phase_id')
                  ->references('id')
                  ->on('training_phases')
                  ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('training_sessions');
    }
};
```

---

### 5. `database/migrations/2026_09_09_000005_create_training_sets_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('training_sets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('session_id')->index();
            $table->uuid('exercise_id')->index();
            $table->integer('set_number');
            $table->decimal('weight_lbs', 6, 2)->default(0.00);
            $table->decimal('reps', 5, 1)->nullable(); // supports half-reps e.g., 5.5
            $table->decimal('duration_seconds', 8, 2)->nullable(); // for timed holds, carries, cardio
            $table->decimal('distance_meters', 8, 2)->nullable(); // for rowing, treadmill
            $table->string('rir', 20)->nullable(); // e.g., "1-2", "0-1", "2+"
            $table->string('tempo', 20)->nullable(); // e.g., "3-1-2", "2c-1p-3e"
            $table->string('superset_group')->nullable();
            $table->text('set_notes')->nullable();
            $table->timestamps();

            $table->foreign('session_id')
                  ->references('id')
                  ->on('training_sessions')
                  ->cascadeOnDelete();

            $table->foreign('exercise_id')
                  ->references('id')
                  ->on('exercises')
                  ->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('training_sets');
    }
};
```

---

### 6. `database/migrations/2026_09_09_000006_create_player_training_assumptions_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('player_training_assumptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('player_identity_id')->index();
            $table->string('assumption_code', 50)->nullable(); // e.g., TA-001
            $table->string('category', 100)->index(); // Shoulder, Grip, Movement Pattern, Recovery, Equipment
            $table->text('description');
            $table->string('confidence', 50)->default('Medium'); // High, Medium, Low
            $table->date('first_observed')->nullable();
            $table->date('last_validated')->nullable();
            $table->string('status', 50)->default('active')->index(); // active, resolved, archived
            $table->text('supporting_evidence')->nullable();
            $table->uuid('phase_id_first_observed')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('player_identity_id')
                  ->references('id')
                  ->on('player_identities')
                  ->cascadeOnDelete();

            $table->foreign('phase_id_first_observed')
                  ->references('id')
                  ->on('training_phases')
                  ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('player_training_assumptions');
    }
};
```

---

### 7. `database/migrations/2026_09_09_000007_create_player_prs_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('player_prs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('player_identity_id')->index();
            $table->uuid('exercise_id')->index();
            $table->string('pr_code', 50)->nullable(); // e.g., PR-001
            $table->string('pr_type', 100)->index(); // Heaviest Weight, Longest Duration, Best Time
            $table->decimal('pr_value', 8, 2);
            $table->string('pr_unit', 20); // lbs, seconds, meters
            $table->date('pr_date')->index();
            $table->uuid('phase_id')->nullable();
            $table->uuid('session_id')->nullable();
            $table->decimal('previous_best', 8, 2)->nullable();
            $table->date('previous_best_date')->nullable();
            $table->string('set_details')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('player_identity_id')
                  ->references('id')
                  ->on('player_identities')
                  ->cascadeOnDelete();

            $table->foreign('exercise_id')
                  ->references('id')
                  ->on('exercises')
                  ->cascadeOnDelete();

            $table->foreign('phase_id')
                  ->references('id')
                  ->on('training_phases')
                  ->nullOnDelete();

            $table->foreign('session_id')
                  ->references('id')
                  ->on('training_sessions')
                  ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('player_prs');
    }
};
```

---

## Part 2: Eloquent Models

### 1. `app/Models/Exercise.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Exercise extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'canonical_name',
        'movement_pattern',
        'primary_muscle',
        'secondary_muscles',
        'default_equipment_id',
        'laterality',
        'exercise_category',
        'is_time_based',
        'is_distance_based',
        'preferred_replacements',
        'shoulder_safety_notes',
        'notes',
    ];

    protected $casts = [
        'is_time_based' => 'boolean',
        'is_distance_based' => 'boolean',
    ];

    public function nameMaps(): HasMany
    {
        return $this->hasMany(ExerciseNameMap::class, 'exercise_id');
    }

    public function trainingSets(): HasMany
    {
        return $this->hasMany(TrainingSet::class, 'exercise_id');
    }

    public function personalRecords(): HasMany
    {
        return $this->hasMany(PlayerPr::class, 'exercise_id');
    }
}
```

---

### 2. `app/Models/ExerciseNameMap.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExerciseNameMap extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'original_name',
        'exercise_id',
    ];

    public function exercise(): BelongsTo
    {
        return $this->belongsTo(Exercise::class, 'exercise_id');
    }
}
```

---

### 3. `app/Models/TrainingPhase.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TrainingPhase extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'player_identity_id',
        'phase_number',
        'name',
        'start_date',
        'end_date',
        'duration_weeks',
        'sessions_per_week',
        'phase_goal',
        'key_exercises',
        'primary_metrics',
        'secondary_metrics',
        'joint_notes',
        'grip_status',
        'notes',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'phase_number' => 'integer',
        'duration_weeks' => 'integer',
        'sessions_per_week' => 'integer',
    ];

    public function playerIdentity(): BelongsTo
    {
        return $this->belongsTo(PlayerIdentity::class, 'player_identity_id');
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(TrainingSession::class, 'phase_id');
    }

    public function assumptions(): HasMany
    {
        return $this->hasMany(PlayerTrainingAssumption::class, 'phase_id_first_observed');
    }

    public function personalRecords(): HasMany
    {
        return $this->hasMany(PlayerPr::class, 'phase_id');
    }
}
```

---

### 4. `app/Models/TrainingSession.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TrainingSession extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'player_identity_id',
        'phase_id',
        'session_date',
        'phase_week',
        'program_day',
        'workout_name',
        'session_start_time',
        'session_end_time',
        'duration_minutes',
        'gym_location',
        'bodyweight_lbs',
        'rpe_overall',
        'exercise_count',
        'general_notes',
    ];

    protected $casts = [
        'session_date' => 'date',
        'session_start_time' => 'datetime',
        'session_end_time' => 'datetime',
        'phase_week' => 'integer',
        'program_day' => 'float',
        'duration_minutes' => 'integer',
        'bodyweight_lbs' => 'float',
        'rpe_overall' => 'float',
        'exercise_count' => 'integer',
    ];

    public function playerIdentity(): BelongsTo
    {
        return $this->belongsTo(PlayerIdentity::class, 'player_identity_id');
    }

    public function phase(): BelongsTo
    {
        return $this->belongsTo(TrainingPhase::class, 'phase_id');
    }

    public function sets(): HasMany
    {
        return $this->hasMany(TrainingSet::class, 'session_id');
    }

    public function personalRecords(): HasMany
    {
        return $this->hasMany(PlayerPr::class, 'session_id');
    }
}
```

---

### 5. `app/Models/TrainingSet.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrainingSet extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'session_id',
        'exercise_id',
        'set_number',
        'weight_lbs',
        'reps',
        'duration_seconds',
        'distance_meters',
        'rir',
        'tempo',
        'superset_group',
        'set_notes',
    ];

    protected $casts = [
        'set_number' => 'integer',
        'weight_lbs' => 'float',
        'reps' => 'float',
        'duration_seconds' => 'float',
        'distance_meters' => 'float',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(TrainingSession::class, 'session_id');
    }

    public function exercise(): BelongsTo
    {
        return $this->belongsTo(Exercise::class, 'exercise_id');
    }
}
```

---

### 6. `app/Models/PlayerTrainingAssumption.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlayerTrainingAssumption extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'player_identity_id',
        'assumption_code',
        'category',
        'description',
        'confidence',
        'first_observed',
        'last_validated',
        'status',
        'supporting_evidence',
        'phase_id_first_observed',
        'notes',
    ];

    protected $casts = [
        'first_observed' => 'date',
        'last_validated' => 'date',
    ];

    public function playerIdentity(): BelongsTo
    {
        return $this->belongsTo(PlayerIdentity::class, 'player_identity_id');
    }

    public function phaseFirstObserved(): BelongsTo
    {
        return $this->belongsTo(TrainingPhase::class, 'phase_id_first_observed');
    }
}
```

---

### 7. `app/Models/PlayerPr.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlayerPr extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'player_identity_id',
        'exercise_id',
        'pr_code',
        'pr_type',
        'pr_value',
        'pr_unit',
        'pr_date',
        'phase_id',
        'session_id',
        'previous_best',
        'previous_best_date',
        'set_details',
        'notes',
    ];

    protected $casts = [
        'pr_value' => 'float',
        'previous_best' => 'float',
        'pr_date' => 'date',
        'previous_best_date' => 'date',
    ];

    public function playerIdentity(): BelongsTo
    {
        return $this->belongsTo(PlayerIdentity::class, 'player_identity_id');
    }

    public function exercise(): BelongsTo
    {
        return $this->belongsTo(Exercise::class, 'exercise_id');
    }

    public function phase(): BelongsTo
    {
        return $this->belongsTo(TrainingPhase::class, 'phase_id');
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(TrainingSession::class, 'session_id');
    }
}
```
