# Momentum Filament PHP Admin Resources

These Filament v3 Admin Resources provide a full-featured, spreadsheet-like administrative GUI inside the `bulldog-statbook` Laravel backend. They allow LLC Admins and Coaches to manage exercise libraries, update safety notes/aliases, inspect active athlete training assumptions, track personal records (PRs), and view completed workout logs without writing SQL or custom Blade forms.

---

## 1. Directory Layout in `bulldog-statbook`

Place these files in your Statbook repository:

```text
bulldog-statbook/
└── app/
    └── Filament/
        └── Resources/
            ├── ExerciseResource.php
            ├── ExerciseResource/
            │   └── Pages/
            │       ├── ListExercises.php
            │       ├── CreateExercise.php
            │       └── EditExercise.php
            ├── PlayerTrainingAssumptionResource.php
            ├── PlayerTrainingAssumptionResource/
            │   └── Pages/
            │       └── ListPlayerTrainingAssumptions.php
            ├── PlayerPrResource.php
            ├── PlayerPrResource/
            │   └── Pages/
            │       └── ListPlayerPrs.php
            └── TrainingSessionResource.php
                └── Pages/
                    ├── ListTrainingSessions.php
                    └── ViewTrainingSession.php
```

---

## 2. `ExerciseResource.php`
Manage canonical exercises, muscle groups, movement patterns, equipment requirements, and shoulder/joint safety notes.

```php
namespace App\Filament\Resources;

use App\Filament\Resources\ExerciseResource\Pages;
use App\Models\Exercise;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class ExerciseResource extends Resource
{
    protected static ?string $model = Exercise::class;

    protected static ?string $navigationGroup = 'Momentum Training';
    protected static ?string $navigationIcon = 'heroicon-o-rectangle-stack';
    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Exercise Metadata')
                    ->schema([
                        Forms\Components\TextInput::make('canonical_name')
                            ->required()
                            ->unique(ignoreRecord: true)
                            ->maxLength(255),
                        Forms\Components\Select::make('muscle_group')
                            ->options([
                                'Arms_Biceps' => 'Arms (Biceps)',
                                'Arms_Triceps' => 'Arms (Triceps)',
                                'Back' => 'Back / Pull',
                                'Chest' => 'Chest / Push',
                                'Shoulders' => 'Shoulders',
                                'Legs' => 'Legs / Lower Body',
                                'Core' => 'Core / Abs',
                                'Carry' => 'Carry / Grip',
                                'Cardio' => 'Cardio / Aerobic',
                                'Warmup' => 'Warmup / Mobility',
                            ])
                            ->required(),
                        Forms\Components\TextInput::make('movement_pattern')
                            ->placeholder('e.g. Curl, Extension, Horizontal Press, Pull, Squat/Lunge')
                            ->maxLength(100),
                        Forms\Components\TextInput::make('category')
                            ->placeholder('e.g. Compound, Isolation, Carry, Core, Mobility')
                            ->maxLength(100),
                        Forms\Components\TextInput::make('equipment_type')
                            ->placeholder('e.g. Dumbbells, Cable, Machine, Bodyweight')
                            ->maxLength(100),
                        Forms\Components\Toggle::make('is_unilateral')
                            ->label('Unilateral Movement?'),
                        Forms\Components\Toggle::make('is_timed')
                            ->label('Time-based / Duration Exercise?'),
                    ])->columns(2),

                Forms\Components\Section::make('Clinical & Safety Cues')
                    ->schema([
                        Forms\Components\Textarea::make('safety_notes')
                            ->label('Shoulder / Joint Safety Notes')
                            ->placeholder('e.g. Neutral grip well tolerated. Slight lean-back on pulldowns eliminates anterior capsule tightness.')
                            ->rows(3),
                        Forms\Components\Textarea::make('notes')
                            ->label('General Exercise Cues & Equipment Notes')
                            ->rows(3),
                    ]),

                Forms\Components\Section::make('Name Aliases (Name Map)')
                    ->schema([
                        Forms\Components\Repeater::make('nameMaps')
                            ->relationship()
                            ->schema([
                                Forms\Components\TextInput::make('original_name')
                                    ->required()
                                    ->placeholder('e.g. DB Romanian Deadlift (RDL)'),
                            ])
                            ->defaultItems(0)
                            ->addActionLabel('Add Name Alias'),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('canonical_name')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),
                Tables\Columns\TextColumn::make('muscle_group')
                    ->sortable()
                    ->badge(),
                Tables\Columns\TextColumn::make('movement_pattern')
                    ->sortable(),
                Tables\Columns\TextColumn::make('equipment_type'),
                Tables\Columns\IconColumn::make('is_unilateral')
                    ->boolean()
                    ->label('Unilateral'),
                Tables\Columns\IconColumn::make('is_timed')
                    ->boolean()
                    ->label('Timed'),
                Tables\Columns\TextColumn::make('safety_notes')
                    ->limit(40)
                    ->tooltip(fn ($record) => $record->safety_notes),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('muscle_group')
                    ->options([
                        'Arms_Biceps' => 'Arms_Biceps',
                        'Arms_Triceps' => 'Arms_Triceps',
                        'Back' => 'Back',
                        'Chest' => 'Chest',
                        'Legs' => 'Legs',
                        'Carry' => 'Carry',
                    ]),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListExercises::route('/'),
            'create' => Pages\CreateExercise::route('/create'),
            'edit' => Pages\EditExercise::route('/{record}/edit'),
        ];
    }
}
```

---

## 3. `PlayerTrainingAssumptionResource.php`
Inspect and manage active orthopedic and training guardrails (e.g. capsule awareness, grip limitations, tempo preferences).

```php
namespace App\Filament\Resources;

use App\Filament\Resources\PlayerTrainingAssumptionResource\Pages;
use App\Models\PlayerTrainingAssumption;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class PlayerTrainingAssumptionResource extends Resource
{
    protected static ?string $model = PlayerTrainingAssumption::class;

    protected static ?string $navigationGroup = 'Momentum Training';
    protected static ?string $navigationIcon = 'heroicon-o-shield-check';
    protected static ?int $navigationSort = 2;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Select::make('player_identity_id')
                    ->relationship('playerIdentity', 'display_name')
                    ->required()
                    ->searchable(),
                Forms\Components\Select::make('category')
                    ->options([
                        'Shoulder' => 'Shoulder / Joint',
                        'Grip' => 'Grip / Forearm',
                        'Movement Pattern' => 'Movement Pattern',
                        'Programming' => 'Programming / Tempo',
                        'Recovery' => 'Recovery / Nutrition',
                        'Equipment' => 'Equipment Difference',
                    ])
                    ->required(),
                Forms\Components\TextInput::make('description')
                    ->required()
                    ->maxLength(255),
                Forms\Components\Select::make('confidence')
                    ->options([
                        'High' => 'High',
                        'Medium' => 'Medium',
                        'Low' => 'Low',
                    ])
                    ->default('High'),
                Forms\Components\Select::make('status')
                    ->options([
                        'active' => 'Active Guardrail',
                        'resolved' => 'Resolved / Archived',
                    ])
                    ->default('active')
                    ->required(),
                Forms\Components\Textarea::make('supporting_evidence')
                    ->rows(2),
                Forms\Components\Textarea::make('notes')
                    ->rows(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('playerIdentity.display_name')
                    ->label('Athlete')
                    ->sortable()
                    ->searchable(),
                Tables\Columns\TextColumn::make('category')
                    ->badge()
                    ->sortable(),
                Tables\Columns\TextColumn::make('description')
                    ->searchable()
                    ->wrap(),
                Tables\Columns\TextColumn::make('confidence')
                    ->sortable(),
                Tables\Columns\BadgeColumn::make('status')
                    ->colors([
                        'success' => 'active',
                        'gray' => 'resolved',
                    ]),
                Tables\Columns\TextColumn::make('last_validated_at')
                    ->date()
                    ->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->options([
                        'active' => 'Active Guardrails',
                        'resolved' => 'Resolved',
                    ]),
                Tables\Filters\SelectFilter::make('category'),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPlayerTrainingAssumptions::route('/'),
        ];
    }
}
```

---

## 4. `PlayerPrResource.php`
View and manage all personal records (heaviest weight, longest duration, max reps) detected across athlete training blocks.

```php
namespace App\Filament\Resources;

use App\Filament\Resources\PlayerPrResource\Pages;
use App\Models\PlayerPr;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class PlayerPrResource extends Resource
{
    protected static ?string $model = PlayerPr::class;

    protected static ?string $navigationGroup = 'Momentum Training';
    protected static ?string $navigationIcon = 'heroicon-o-trophy';
    protected static ?int $navigationSort = 3;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Select::make('player_identity_id')
                    ->relationship('playerIdentity', 'display_name')
                    ->required(),
                Forms\Components\Select::make('exercise_id')
                    ->relationship('exercise', 'canonical_name')
                    ->required()
                    ->searchable(),
                Forms\Components\Select::make('pr_type')
                    ->options([
                        'Heaviest Weight' => 'Heaviest Weight',
                        'Longest Duration' => 'Longest Duration',
                        'Max Reps' => 'Max Reps',
                    ])
                    ->required(),
                Forms\Components\TextInput::make('pr_value')
                    ->numeric()
                    ->required(),
                Forms\Components\TextInput::make('pr_unit')
                    ->default('lbs')
                    ->required(),
                Forms\Components\DatePicker::make('pr_date')
                    ->required(),
                Forms\Components\TextInput::make('set_details')
                    ->placeholder('e.g. 8 reps @ 170 lbs'),
                Forms\Components\Textarea::make('notes')
                    ->rows(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('playerIdentity.display_name')
                    ->label('Athlete')
                    ->sortable(),
                Tables\Columns\TextColumn::make('exercise.canonical_name')
                    ->label('Exercise')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),
                Tables\Columns\TextColumn::make('pr_type')
                    ->badge(),
                Tables\Columns\TextColumn::make('pr_value')
                    ->sortable()
                    ->formatStateUsing(fn ($record) => "{$record->pr_value} {$record->pr_unit}"),
                Tables\Columns\TextColumn::make('pr_date')
                    ->date()
                    ->sortable(),
                Tables\Columns\TextColumn::make('set_details'),
                Tables\Columns\TextColumn::make('notes')
                    ->limit(30),
            ])
            ->defaultSort('pr_date', 'desc')
            ->filters([
                Tables\Filters\SelectFilter::make('pr_type'),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPlayerPrs::route('/'),
        ];
    }
}
```

---

## 5. `TrainingSessionResource.php`
View completed workout sessions, working sets, Tempos, RIRs, and gym floor notes synced from Momentum PWA.

```php
namespace App\Filament\Resources;

use App\Filament\Resources\TrainingSessionResource\Pages;
use App\Models\TrainingSession;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class TrainingSessionResource extends Resource
{
    protected static ?string $model = TrainingSession::class;

    protected static ?string $navigationGroup = 'Momentum Training';
    protected static ?string $navigationIcon = 'heroicon-o-calendar';
    protected static ?int $navigationSort = 4;

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('session_date')
                    ->date()
                    ->sortable()
                    ->weight('bold'),
                Tables\Columns\TextColumn::make('playerIdentity.display_name')
                    ->label('Athlete')
                    ->searchable(),
                Tables\Columns\TextColumn::make('workout_name')
                    ->searchable()
                    ->wrap(),
                Tables\Columns\TextColumn::make('gym_location')
                    ->badge(),
                Tables\Columns\TextColumn::make('sets_count')
                    ->counts('sets')
                    ->label('Total Sets'),
                Tables\Columns\TextColumn::make('general_notes')
                    ->limit(40),
            ])
            ->defaultSort('session_date', 'desc')
            ->filters([
                Tables\Filters\SelectFilter::make('gym_location'),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListTrainingSessions::route('/'),
            'view' => Pages\ViewTrainingSession::route('/{record}'),
        ];
    }
}
```
TargetFile: /workspace/scratch/momentum-filament-admin-resources.md
