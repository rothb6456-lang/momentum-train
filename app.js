window.MOMENTUM_BUILD = '1.1.8';

/* =========================
   MOMENTUM STABILITY + CORE HELPERS
   Place this block before renderHome()
   ========================= */

/* ---------- dom helpers ---------- */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/* ---------- escaping helpers ---------- */
const esc = value =>
  String(value ?? '').replace(/[&<>'"]/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[ch]));

// Backward-compatible alias (kept global for other page scripts / inline HTML);
// delegates to the hardened esc() so the broken &#quot; entity is never produced.
function escapeHtml(value) {
  return esc(value);
}

/* ---------- storage keys ---------- */
const STORAGE_KEYS = {
  active: 'momentum.active.v3',
  done: 'momentum.sessions.v3',
  cockpit: 'momentum.cockpit.v1',
  editor: 'momentum.editor.v1',
  lastView: 'momentum:lastView'
};

/* ---------- json storage ---------- */
function loadJson(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getDone() {
  return loadJson(STORAGE_KEYS.done, []);
}

function saveDone(sessions) {
  saveJson(STORAGE_KEYS.done, Array.isArray(sessions) ? sessions : []);
}

/* ---------- session fallback ---------- */
function fallbackSession() {
  const now = new Date().toISOString();
  return {
    id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: 'draft',
    planId: '',
    plannedWorkout: null,
    phase: '',
    week: '',
    day: '',
    workoutName: 'Ad hoc workout',
    canonicalTitle: '',
    startedAt: now,
    updatedAt: now,
    activeExercise: '',
    sets: [],
    tags: [],
    coachQuestions: ''
  };
}

/* ---------- app state ---------- */
const state = {
  cockpit: null,
  cockpitEditOpen: false,
  cockpitEditingLastSet: null,
  editingSetIndex: null,
  restTimer: null
};

let active = loadJson(STORAGE_KEYS.active, null);
if (!active || !Array.isArray(active.sets)) {
  active = fallbackSession();
}

let editor = loadJson(STORAGE_KEYS.editor, null);
let selectedReviewId = '';

const restoredCockpit = loadJson(STORAGE_KEYS.cockpit, null);
if (restoredCockpit && Array.isArray(restoredCockpit.exercises)) {
  state.cockpit = restoredCockpit;
}

/* ---------- persistence ---------- */
function persistCockpit() {
  saveJson(STORAGE_KEYS.cockpit, state.cockpit || null);
}

function persistEditor() {
  saveJson(STORAGE_KEYS.editor, typeof editor !== 'undefined' ? editor : null);
}

function clearCockpitPersisted() {
  localStorage.removeItem(STORAGE_KEYS.cockpit);
}

function clearEditorPersisted() {
  localStorage.removeItem(STORAGE_KEYS.editor);
}

function ensureActiveSession() {
  if (!active || !Array.isArray(active.sets)) {
    active = (typeof newSession === 'function') ? newSession() : fallbackSession();
  }
  return active;
}

function persist() {
  ensureActiveSession();
  active.updatedAt = new Date().toISOString();
  saveJson(STORAGE_KEYS.active, active);
  persistCockpit();
  persistEditor();
}

/* =========================
   PERSONALIZATION (Theme: Training Profile / Onboarding)
   Local-first profile data: experience level, goals, equipment access,
   and training guardrails. Shape mirrors the Bulldog backend tables
   (player_training_profiles / player_training_goals / player_equipment_access /
   player_training_guardrails) field-for-field so a future sync pass is a
   straight mapping, not a redesign.
   ========================= */
STORAGE_KEYS.profile = 'momentum.profile.v1';

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner', blurb: 'New to structured training' },
  { value: 'intermediate', label: 'Intermediate', blurb: '6+ months of consistent training' },
  { value: 'advanced', label: 'Advanced', blurb: 'Years of structured programming' }
];

// Mirrors database/seeders/TrainingGoalTemplateSeeder.php in the Bulldog repo.
// Keep these two lists in sync until goal templates are served from the API.
const GOAL_TEMPLATES = [
  { code: 'CONSISTENCY_4WK', title: 'Train consistently for 4 weeks', description: 'Complete your planned sessions each week for a full month.', category: 'consistency', icon: 'calendar', metricKey: 'sessions_per_week', defaultUnit: 'sessions' },
  { code: 'STRENGTH_1RM_PLUS', title: "Increase a lift's working max", description: 'Add measurable load to a key lift over the course of a phase.', category: 'strength', icon: 'dumbbell', metricKey: 'exercise_1rm', defaultUnit: 'lbs' },
  { code: 'BODYWEIGHT_TARGET', title: 'Reach a target bodyweight', description: 'Move toward a target bodyweight in support of a broader goal.', category: 'general_fitness', icon: 'gauge', metricKey: 'bodyweight', defaultUnit: 'lbs' },
  { code: 'RETURN_TO_PLAY', title: 'Return to play after injury', description: 'Progress rehab work toward full clearance for sport participation.', category: 'return_to_play', icon: 'cycle', metricKey: null, defaultUnit: null },
  { code: 'MOBILITY_IMPROVEMENT', title: 'Improve mobility in a problem area', description: 'Build range of motion and control in a specific joint or movement.', category: 'mobility', icon: 'stretch', metricKey: null, defaultUnit: null },
  { code: 'GENERAL_FITNESS', title: 'General fitness and health', description: 'No specific performance target — just building a sustainable training habit.', category: 'general_fitness', icon: 'pulse', metricKey: null, defaultUnit: null }
];

// Curated client-side vocabulary. NOTE: unlike movement_pattern on the Exercise
// model, equipment_type is a free-text field in Filament today, not a real
// enum — this list is a sane starting convention, not a synced source of truth.
// Reconcile with actual exercise data once that field is backed by real options.
const EQUIPMENT_OPTIONS = [
  'Bodyweight only', 'Dumbbells', 'Barbell & Rack', 'Kettlebells', 'Cable Machine',
  'Resistance Bands', 'Pull-up Bar', 'Selectorized Machines', 'Full Commercial Gym'
];

const BODY_REGIONS = [
  'Shoulder', 'Elbow', 'Wrist / Hand', 'Neck', 'Upper Back', 'Low Back', 'Hip', 'Knee', 'Ankle / Foot'
];

// Same caveat as EQUIPMENT_OPTIONS — movement_pattern is free text on the backend today.
const MOVEMENT_PATTERNS = [
  'Overhead Press', 'Horizontal Press', 'Pull / Row', 'Squat / Lunge', 'Hip Hinge / Deadlift', 'Carry', 'Rotation / Core', 'Jumping / Plyometric'
];

const RESTRICTION_TYPES = [
  { value: 'avoid', label: 'Avoid completely' },
  { value: 'modify', label: 'Modify — lighter load / altered range' },
  { value: 'monitor', label: 'Monitor — proceed with caution' }
];

// Minimal line icons, on-brand (inherit color via currentColor, so they pick up
// var(--mint) and follow light/dark theme automatically) instead of generic emoji.
const PROFILE_ICONS = {
  dumbbell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 9v6M4 8.5v7M2 10v4"/><path d="M17.5 9v6M20 8.5v7M22 10v4"/><path d="M6.5 12h11"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg>',
  gauge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18a8 8 0 0 1 16 0"/><path d="M12 18l4-6"/><circle cx="12" cy="18" r="1"/></svg>',
  cycle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0 1 14-5"/><path d="M18 4v4h-4"/><path d="M20 12a8 8 0 0 1-14 5"/><path d="M6 20v-4h4"/></svg>',
  stretch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2"/><path d="M12 7v6"/><path d="M12 13l-4 6"/><path d="M12 13l5 4"/><path d="M8 10l-3-1"/></svg>',
  pulse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2-5 3 10 2-7 1.5 2H21"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6l7-3z"/></svg>',
  trending: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>'
};
function profileIcon(name, size) {
  size = size || 22;
  return `<span class="profile-icon" style="width:${size}px;height:${size}px">${PROFILE_ICONS[name] || ''}</span>`;
}

function defaultProfile() {
  return {
    version: 1,
    onboardingStatus: 'not_started', // not_started | quick_start | completed
    experienceLevel: '',
    goals: [],
    equipment: [],
    guardrails: [],
    guardrailsReviewed: false, // true once the user has passed through the guardrails step at least once
    updatedAt: null
  };
}

function loadProfile() {
  const stored = loadJson(STORAGE_KEYS.profile, null);
  if (!stored || typeof stored !== 'object') return defaultProfile();
  // Merge onto defaults so a profile saved by an older build still gets any new fields.
  return Object.assign(defaultProfile(), stored);
}

function saveProfile() {
  profile.updatedAt = new Date().toISOString();
  saveJson(STORAGE_KEYS.profile, profile);
}

let profile = loadProfile();

function profileCompletion() {
  const items = [
    { key: 'experience', label: 'Experience level', done: !!profile.experienceLevel },
    { key: 'goals', label: 'Goals', done: profile.goals.length > 0 },
    { key: 'equipment', label: 'Equipment access', done: profile.equipment.length > 0 },
    { key: 'guardrails', label: 'Guardrails', done: profile.guardrailsReviewed }
  ];
  return { items, count: items.filter(i => i.done).length, total: items.length };
}

/* ---------- personalization: modal engine ---------- */
const profileWizard = {
  mode: 'settings', // 'onboarding' | 'settings'
  step: 'menu',
  stepOrder: ['experience', 'goals', 'equipment', 'guardrails']
};

// Transient in-progress state for the "add a guardrail" mini-form. Not persisted —
// reset whenever the guardrails step is (re)entered or a guardrail is successfully added.
let guardrailDraft = null;
function resetGuardrailDraft() {
  guardrailDraft = { bodyRegion: '', restrictedMovementPatterns: [], restrictionType: 'avoid', description: '' };
}

function openProfileModal(mode) {
  profileWizard.mode = mode;
  profileWizard.step = mode === 'onboarding' ? 'welcome' : 'menu';
  resetGuardrailDraft();
  const overlay = document.getElementById('profileModal');
  if (overlay) overlay.classList.remove('hidden');
  renderProfileModal();
}

function closeProfileModal() {
  // Dismissing onboarding at any point counts as choosing Quick Start, so it
  // never re-triggers uninvited on a later app load.
  if (profileWizard.mode === 'onboarding' && profile.onboardingStatus === 'not_started') {
    profile.onboardingStatus = 'quick_start';
    saveProfile();
  }
  const overlay = document.getElementById('profileModal');
  if (overlay) overlay.classList.add('hidden');
  if (typeof renderHome === 'function') renderHome();
}

function profileWizardNext() {
  const order = profileWizard.stepOrder;
  const idx = order.indexOf(profileWizard.step);
  profileWizard.step = (idx === -1 || idx === order.length - 1) ? 'done' : order[idx + 1];
  renderProfileModal();
}

function profileWizardBack() {
  if (profileWizard.mode === 'settings') {
    profileWizard.step = 'menu';
    renderProfileModal();
    return;
  }
  const order = profileWizard.stepOrder;
  const idx = order.indexOf(profileWizard.step);
  profileWizard.step = idx <= 0 ? 'welcome' : order[idx - 1];
  renderProfileModal();
}

// "Next" in onboarding advances the wizard; in settings mode the same button
// just means "done editing this section" and returns to the menu, since every
// edit in settings mode already auto-saves as it happens.
function profileWizardPrimaryAdvance() {
  if (profileWizard.mode === 'onboarding') {
    profileWizardNext();
  } else {
    profileWizard.step = 'menu';
    renderProfileModal();
  }
}

function renderProfileStepNav() {
  const backLabel = profileWizard.mode === 'settings' ? 'Back to menu' : 'Back';
  const nextLabel = profileWizard.mode === 'onboarding' ? 'Next' : 'Save & back';
  return `
    <div class="actions" style="margin-top:18px">
      <button type="button" class="secondary" id="profileStepBack" style="flex:1">${backLabel}</button>
      <button type="button" class="primary" id="profileStepNext" style="flex:1">${esc(nextLabel)}</button>
    </div>
  `;
}

function renderProfileModal() {
  const body = document.getElementById('profileModalBody');
  const titleEl = document.getElementById('profileModalTitle');
  const progressWrap = document.getElementById('profileProgressWrap');
  const progressFill = document.getElementById('profileProgressFill');
  const progressLabel = document.getElementById('profileProgressLabel');
  if (!body) return;

  const inOnboardingSteps = profileWizard.mode === 'onboarding' && profileWizard.stepOrder.includes(profileWizard.step);
  if (progressWrap) progressWrap.classList.toggle('hidden', !inOnboardingSteps);
  if (inOnboardingSteps) {
    const idx = profileWizard.stepOrder.indexOf(profileWizard.step);
    const pct = Math.round(((idx + 1) / profileWizard.stepOrder.length) * 100);
    if (progressFill) progressFill.style.width = pct + '%';
    if (progressLabel) progressLabel.textContent = `Step ${idx + 1} of ${profileWizard.stepOrder.length}`;
  }

  const titles = {
    welcome: 'Welcome to Momentum', menu: 'Training profile', experience: 'Experience level',
    goals: 'Your goals', equipment: 'Equipment access', guardrails: 'Guardrails', done: 'All set'
  };
  if (titleEl) titleEl.textContent = titles[profileWizard.step] || 'Training profile';

  const renderers = {
    welcome: renderProfileWelcomeStep, menu: renderProfileMenuStep, experience: renderProfileExperienceStep,
    goals: renderProfileGoalsStep, equipment: renderProfileEquipmentStep, guardrails: renderProfileGuardrailsStep,
    done: renderProfileDoneStep
  };
  const renderFn = renderers[profileWizard.step] || renderProfileMenuStep;
  body.innerHTML = renderFn();
  bindProfileStep(profileWizard.step);
}

function renderProfileWelcomeStep() {
  return `
    <div class="stack" style="text-align:center;padding:6px 0 2px">
      <div style="display:flex;align-items:center;justify-content:center;gap:10px">
        ${profileIcon('dumbbell', 28)}
        <h2 style="font-size:20px;margin:0">Let's personalize your training</h2>
      </div>
      <p class="quiet">Tell us about your goals, equipment, and anything we should work around — your AI Coach uses this to build better workout cards. Takes about 2 minutes, or skip and set it up later.</p>
    </div>
    <div class="actions" style="flex-direction:column;margin-top:18px">
      <button type="button" class="primary" id="profileStartPersonalize" style="width:100%">Personalize my training</button>
      <button type="button" class="secondary" id="profileQuickStart" style="width:100%">Quick Start — jump right in</button>
    </div>
  `;
}

function renderProfileMenuStep() {
  const completion = profileCompletion();
  const goalCount = profile.goals.filter(g => g.status === 'active').length;
  const equipCount = profile.equipment.length;
  const guardrailCount = profile.guardrails.filter(g => g.status === 'active').length;
  const expLabel = profile.experienceLevel
    ? ((EXPERIENCE_LEVELS.find(l => l.value === profile.experienceLevel) || {}).label || profile.experienceLevel)
    : 'Not set';
  const rows = [
    { key: 'experience', icon: 'trending', label: 'Experience level', value: expLabel },
    { key: 'goals', icon: 'target', label: 'Goals', value: goalCount ? `${goalCount} active` : 'None yet' },
    { key: 'equipment', icon: 'dumbbell', label: 'Equipment access', value: equipCount ? `${equipCount} item${equipCount === 1 ? '' : 's'}` : 'None yet' },
    { key: 'guardrails', icon: 'shield', label: 'Guardrails', value: guardrailCount ? `${guardrailCount} active` : 'None' }
  ];
  return `
    <p class="quiet" style="margin-top:0">${completion.count} of ${completion.total} set up</p>
    <div class="stack">
      ${rows.map(r => `
        <button type="button" class="pick" data-jump="${r.key}" style="display:flex;justify-content:space-between;align-items:center;gap:10px">
          <span style="display:flex;align-items:center;gap:10px">${profileIcon(r.icon, 18)}<b>${esc(r.label)}</b></span>
          <span class="quiet" style="white-space:nowrap">${esc(r.value)} ›</span>
        </button>
      `).join('')}
    </div>
    <div class="actions" style="margin-top:16px">
      <button type="button" class="secondary" id="profileModalCloseFromMenu" style="width:100%">Close</button>
    </div>
  `;
}

function renderProfileExperienceStep() {
  const cards = EXPERIENCE_LEVELS.map(lvl => `
    <button type="button" class="pick ${profile.experienceLevel === lvl.value ? 'active' : ''}" data-exp="${lvl.value}" style="width:100%">
      <b>${esc(lvl.label)}</b>
      <small>${esc(lvl.blurb)}</small>
    </button>
  `).join('');
  return `<div class="stack">${cards}</div>${renderProfileStepNav()}`;
}

function renderProfileGoalsStep() {
  const activeGoals = profile.goals.filter(g => g.status === 'active');
  const templateCards = GOAL_TEMPLATES.map(t => {
    const added = activeGoals.some(g => g.templateCode === t.code);
    return `
      <button type="button" class="pick option-card ${added ? 'active' : ''}" data-template="${t.code}">
        ${profileIcon(t.icon, 24)}
        <b>${esc(t.title)}</b>
        <small>${esc(t.description)}</small>
      </button>
    `;
  }).join('');
  const goalsList = activeGoals.map(g => `
    <div class="log-row" style="grid-template-columns:1fr auto">
      <span>${esc(g.title)}</span>
      <button type="button" class="icon-btn" data-remove-goal="${g.id}" aria-label="Remove goal">✕</button>
    </div>
  `).join('');
  return `
    <p class="quiet" style="margin-top:0">Tap a goal to add it — add as many or as few as you like.</p>
    <div class="option-card-grid">${templateCards}</div>
    <div class="field full" style="margin-top:14px">
      <label>Something else?<input class="input" type="text" id="profileCustomGoalInput" placeholder="Type a custom goal…"></label>
    </div>
    <div class="actions"><button type="button" class="secondary" id="profileAddCustomGoal">Add custom goal</button></div>
    ${activeGoals.length ? `<div class="section"><div class="eyebrow">Your goals</div><div class="stack" style="margin-top:8px">${goalsList}</div></div>` : ''}
    ${renderProfileStepNav()}
  `;
}

function renderProfileEquipmentStep() {
  const chips = EQUIPMENT_OPTIONS.map(opt => {
    const active = profile.equipment.some(e => e.equipmentType === opt);
    return `<button type="button" class="chip ${active ? 'active' : ''}" data-equip="${esc(opt)}">${esc(opt)}</button>`;
  }).join('');
  const customItems = profile.equipment.filter(e => !EQUIPMENT_OPTIONS.includes(e.equipmentType));
  const customChips = customItems.map(e => `<button type="button" class="chip active" data-equip-custom="${e.id}">${esc(e.equipmentType)} ✕</button>`).join('');
  return `
    <p class="quiet" style="margin-top:0">Tap everything you have access to.</p>
    <div class="chip-row">${chips}${customChips}</div>
    <div class="field full" style="margin-top:14px">
      <label>Something else?<input class="input" type="text" id="profileCustomEquipmentInput" placeholder="e.g. Sandbag, TRX…"></label>
    </div>
    <div class="actions"><button type="button" class="secondary" id="profileAddCustomEquipment">Add</button></div>
    ${renderProfileStepNav()}
  `;
}

function renderProfileGuardrailsStep() {
  if (!guardrailDraft) resetGuardrailDraft();
  const activeGuardrails = profile.guardrails.filter(g => g.status === 'active');
  const list = activeGuardrails.map(g => `
    <div class="flag">
      <b>${esc(g.bodyRegion)}</b> — ${esc((RESTRICTION_TYPES.find(r => r.value === g.restrictionType) || {}).label || g.restrictionType)}
      ${g.restrictedMovementPatterns.length ? `<div class="quiet" style="margin-top:2px">${g.restrictedMovementPatterns.map(p => esc(p)).join(', ')}</div>` : ''}
      ${g.description ? `<div class="quiet" style="margin-top:2px">${esc(g.description)}</div>` : ''}
      <div class="actions" style="margin-top:8px"><button type="button" class="secondary mini" data-resolve-guardrail="${g.id}">Mark resolved</button></div>
    </div>
  `).join('');
  const regionChips = BODY_REGIONS.map(r => `<button type="button" class="chip ${guardrailDraft.bodyRegion === r ? 'active' : ''}" data-draft-region="${esc(r)}">${esc(r)}</button>`).join('');
  const patternChips = MOVEMENT_PATTERNS.map(p => `<button type="button" class="chip ${guardrailDraft.restrictedMovementPatterns.includes(p) ? 'active' : ''}" data-draft-pattern="${esc(p)}">${esc(p)}</button>`).join('');
  const restrictionTags = RESTRICTION_TYPES.map(r => `<button type="button" class="tag ${guardrailDraft.restrictionType === r.value ? 'active' : ''}" data-draft-restriction="${r.value}">${esc(r.label)}</button>`).join('');
  return `
    <div class="actions" style="margin-top:0"><button type="button" class="primary" id="profileGuardrailsNone" style="width:100%">Nothing to add right now</button></div>
    ${list ? `<div class="section"><div class="eyebrow">Active</div><div class="stack" style="margin-top:8px">${list}</div></div>` : ''}
    <div class="section">
      <div class="eyebrow">Add a guardrail</div>
      <p class="quiet" style="margin:6px 0">Anything we should work around — an old injury, surgery, or area to be careful with? Add one at a time; you can add another right after.</p>
      <div class="field full"><label>Body region — pick one</label></div>
      <div class="chip-row">${regionChips}</div>
      <div class="field full" style="margin-top:10px"><label>Movements to watch (optional)</label></div>
      <div class="chip-row">${patternChips}</div>
      <div class="field full" style="margin-top:10px"><label>How cautious?</label></div>
      <div class="tag-row">${restrictionTags}</div>
      <div class="field full" style="margin-top:10px">
        <label>Notes (optional)<textarea id="profileGuardrailNotes" placeholder="e.g. Rotator cuff repair, 2019 — cleared for light overhead work">${esc(guardrailDraft.description)}</textarea></label>
      </div>
      <div class="actions"><button type="button" class="secondary" id="profileAddGuardrail" style="width:100%">Add guardrail</button></div>
    </div>
    ${renderProfileStepNav()}
  `;
}

function renderProfileDoneStep() {
  return `
    <div class="stack" style="text-align:center;padding:6px 0 2px">
      <div style="display:flex;align-items:center;justify-content:center;gap:10px">
        ${profileIcon('check', 28)}
        <h2 style="font-size:20px;margin:0">You're all set</h2>
      </div>
      <p class="quiet">Your AI Coach will use this to personalize your training. Update it anytime from the gear icon.</p>
    </div>
    <div class="actions" style="margin-top:16px"><button type="button" class="primary" id="profileFinish" style="width:100%">Let's train</button></div>
  `;
}

function bindProfileStep(step) {
  const closeBtn = document.getElementById('profileModalClose');
  if (closeBtn) closeBtn.onclick = () => closeProfileModal();

  const back = document.getElementById('profileStepBack');
  if (back) back.onclick = () => profileWizardBack();
  const next = document.getElementById('profileStepNext');
  if (next) next.onclick = () => profileWizardPrimaryAdvance();

  if (step === 'welcome') {
    const personalize = document.getElementById('profileStartPersonalize');
    if (personalize) personalize.onclick = () => { profileWizard.step = 'experience'; renderProfileModal(); };
    const quick = document.getElementById('profileQuickStart');
    if (quick) quick.onclick = () => { profile.onboardingStatus = 'quick_start'; saveProfile(); closeProfileModal(); };
  }

  if (step === 'menu') {
    $$('[data-jump]').forEach(btn => { btn.onclick = () => { profileWizard.step = btn.dataset.jump; renderProfileModal(); }; });
    const closeFromMenu = document.getElementById('profileModalCloseFromMenu');
    if (closeFromMenu) closeFromMenu.onclick = () => closeProfileModal();
  }

  if (step === 'experience') {
    $$('[data-exp]').forEach(btn => {
      btn.onclick = () => { profile.experienceLevel = btn.dataset.exp; saveProfile(); renderProfileModal(); };
    });
  }

  if (step === 'goals') {
    $$('[data-template]').forEach(btn => {
      btn.onclick = () => {
        const code = btn.dataset.template;
        const existingIdx = profile.goals.findIndex(g => g.templateCode === code && g.status === 'active');
        if (existingIdx > -1) {
          profile.goals.splice(existingIdx, 1);
        } else {
          const tmpl = GOAL_TEMPLATES.find(t => t.code === code);
          if (tmpl) {
            profile.goals.push({
              id: momentumUid('goal'), templateCode: tmpl.code, title: tmpl.title, description: tmpl.description,
              category: tmpl.category, scope: 'long_term', phaseId: null,
              targetMetricKey: tmpl.metricKey, targetValue: null, targetUnit: tmpl.defaultUnit,
              startDate: new Date().toISOString().slice(0, 10), targetDate: null,
              status: 'active', achievedAt: null, source: 'self'
            });
          }
        }
        saveProfile();
        renderProfileModal();
      };
    });
    $$('[data-remove-goal]').forEach(btn => {
      btn.onclick = () => { profile.goals = profile.goals.filter(g => g.id !== btn.dataset.removeGoal); saveProfile(); renderProfileModal(); };
    });
    const addCustom = document.getElementById('profileAddCustomGoal');
    if (addCustom) addCustom.onclick = () => {
      const input = document.getElementById('profileCustomGoalInput');
      const val = input && input.value.trim();
      if (!val) return;
      const dup = profile.goals.some(g => g.status === 'active' && g.title.trim().toLowerCase() === val.toLowerCase());
      if (dup) { if (typeof toast === 'function') toast('You already have that goal.'); return; }
      profile.goals.push({
        id: momentumUid('goal'), templateCode: null, title: val, description: '', category: 'custom',
        scope: 'long_term', phaseId: null, targetMetricKey: null, targetValue: null, targetUnit: null,
        startDate: new Date().toISOString().slice(0, 10), targetDate: null, status: 'active', achievedAt: null, source: 'self'
      });
      saveProfile();
      renderProfileModal();
    };
  }

  if (step === 'equipment') {
    $$('[data-equip]').forEach(btn => {
      btn.onclick = () => {
        const type = btn.dataset.equip;
        const idx = profile.equipment.findIndex(e => e.equipmentType === type);
        if (idx > -1) profile.equipment.splice(idx, 1);
        else profile.equipment.push({ id: momentumUid('equip'), equipmentType: type, facilityLabel: '' });
        saveProfile();
        renderProfileModal();
      };
    });
    $$('[data-equip-custom]').forEach(btn => {
      btn.onclick = () => { profile.equipment = profile.equipment.filter(e => e.id !== btn.dataset.equipCustom); saveProfile(); renderProfileModal(); };
    });
    const addCustomEquip = document.getElementById('profileAddCustomEquipment');
    if (addCustomEquip) addCustomEquip.onclick = () => {
      const input = document.getElementById('profileCustomEquipmentInput');
      const val = input && input.value.trim();
      if (!val) return;
      const dup = profile.equipment.some(e => e.equipmentType.trim().toLowerCase() === val.toLowerCase());
      if (dup) { if (typeof toast === 'function') toast('Already on your list.'); return; }
      profile.equipment.push({ id: momentumUid('equip'), equipmentType: val, facilityLabel: '' });
      saveProfile();
      renderProfileModal();
    };
  }

  if (step === 'guardrails') {
    const none = document.getElementById('profileGuardrailsNone');
    if (none) none.onclick = () => { profile.guardrailsReviewed = true; saveProfile(); profileWizardPrimaryAdvance(); };
    $$('[data-resolve-guardrail]').forEach(btn => {
      btn.onclick = () => {
        const g = profile.guardrails.find(x => x.id === btn.dataset.resolveGuardrail);
        if (g) { g.status = 'resolved'; g.resolvedDate = new Date().toISOString().slice(0, 10); }
        saveProfile();
        renderProfileModal();
      };
    });
    $$('[data-draft-region]').forEach(btn => { btn.onclick = () => { guardrailDraft.bodyRegion = btn.dataset.draftRegion; renderProfileModal(); }; });
    $$('[data-draft-pattern]').forEach(btn => {
      btn.onclick = () => {
        const p = btn.dataset.draftPattern;
        const idx = guardrailDraft.restrictedMovementPatterns.indexOf(p);
        if (idx > -1) guardrailDraft.restrictedMovementPatterns.splice(idx, 1);
        else guardrailDraft.restrictedMovementPatterns.push(p);
        renderProfileModal();
      };
    });
    $$('[data-draft-restriction]').forEach(btn => { btn.onclick = () => { guardrailDraft.restrictionType = btn.dataset.draftRestriction; renderProfileModal(); }; });
    const notes = document.getElementById('profileGuardrailNotes');
    if (notes) notes.oninput = () => { guardrailDraft.description = notes.value; };
    const addGuardrail = document.getElementById('profileAddGuardrail');
    if (addGuardrail) addGuardrail.onclick = () => {
      if (!guardrailDraft.bodyRegion) { if (typeof toast === 'function') toast('Pick a body region first.'); return; }
      const dup = profile.guardrails.some(g => g.status === 'active' && g.bodyRegion === guardrailDraft.bodyRegion && g.restrictionType === guardrailDraft.restrictionType);
      profile.guardrails.push({
        id: momentumUid('guardrail'), bodyRegion: guardrailDraft.bodyRegion,
        restrictedMovementPatterns: guardrailDraft.restrictedMovementPatterns.slice(),
        restrictionType: guardrailDraft.restrictionType, description: guardrailDraft.description,
        status: 'active', source: 'self', firstNotedDate: new Date().toISOString().slice(0, 10), resolvedDate: null
      });
      profile.guardrailsReviewed = true;
      saveProfile();
      resetGuardrailDraft();
      renderProfileModal();
      if (dup && typeof toast === 'function') toast('Added — you already had a similar active guardrail for this region.');
    };
  }

  if (step === 'done') {
    const finish = document.getElementById('profileFinish');
    if (finish) finish.onclick = () => { profile.onboardingStatus = 'completed'; saveProfile(); closeProfileModal(); };
  }
}

/* ---------- planner / queue helpers ---------- */
function queued() {
  if (typeof MomentumPlanner === 'undefined' || typeof MomentumPlanner.load !== 'function') {
    return [];
  }

  return MomentumPlanner.load().filter(x => x.status === 'queued' || x.status === 'active');
}

function nextPlan() {
  return queued()[0] || null;
}

function planSummary(plan) {
  if (!plan) return 'No phase metadata';

  return [
    plan.phaseId ? `Phase ${plan.phaseId}` : '',
    plan.week ? `Week ${plan.week}` : '',
    plan.day ? `Day ${plan.day}` : '',
    plan.sourceType || ''
  ].filter(Boolean).join(' · ') || 'No phase metadata';
}

/* ---------- navigation helpers ---------- */
function bindGo() {
  // The page nav uses data-view; bind that, plus any legacy data-go buttons.
  $$('[data-view], [data-go]').forEach(b => {
    const target = b.dataset.view || b.dataset.go;
    b.onclick = () => show(target);
  });
}

function persistCurrentView(view) {
  try {
    localStorage.setItem(STORAGE_KEYS.lastView, view);
  } catch {}
}



function restoreCurrentView() {
  try {
    const hasActive =
      active &&
      (
        (Array.isArray(active.sets) && active.sets.length > 0) ||
        (state.cockpit && Array.isArray(state.cockpit.exercises) && state.cockpit.exercises.length > 0)
      );

    if (hasActive) return 'log';

    const saved = localStorage.getItem(STORAGE_KEYS.lastView) || 'today';
    return ['home', 'today', 'log', 'review', 'history'].includes(saved) ? saved : 'today';
  } catch {
    return 'today';
  }
}

/* ---------- ui helpers ---------- */
function isMobileHomeLayout() {
  return window.matchMedia('(max-width: 760px)').matches;
}

function starterCards() {
  return (window.MomentumWorkoutCards && window.MomentumWorkoutCards.starterCards) || [];
}

function metric(label, value, detail) {
  return `<article class="card metric"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div><div class="delta">${esc(detail)}</div></article>`;
}

/* ---------- plan entry helpers ---------- */



/* ---------- stable session / navigation / planner helpers ---------- */

let starterPreviewKey = null;

function selectedReviewedSession() {
  const sessions = getDone();
  if (!Array.isArray(sessions) || !sessions.length) return null;

  if (selectedReviewId) {
    return sessions.find(x => x && x.id === selectedReviewId) || null;
  }

  return sessions[0] || null;
}

function planForActive() {
  const session = ensureActiveSession();
  if (!session) return null;

  if (session.plannedWorkout && Array.isArray(session.plannedWorkout.exerciseBlocks)) {
    return session.plannedWorkout;
  }

  if (
    session.planId &&
    typeof MomentumPlanner !== 'undefined' &&
    typeof MomentumPlanner.load === 'function'
  ) {
    return MomentumPlanner.load().find(x => x && x.id === session.planId) || null;
  }

  return null;
}

function activeBlock() {
  const session = ensureActiveSession();
  if (!session) return null;

  const cockpitExercises = state?.cockpit?.exercises;
  if (Array.isArray(cockpitExercises) && cockpitExercises.length) {
    if (session.activeExercise) {
      return cockpitExercises.find(x => x && x.exerciseName === session.activeExercise) || cockpitExercises[0] || null;
    }
    return cockpitExercises[0] || null;
  }

  const plan = planForActive();
  const blocks = Array.isArray(plan?.exerciseBlocks) ? plan.exerciseBlocks : [];
  if (blocks.length) {
    if (session.activeExercise) {
      return blocks.find(x => x && x.exerciseName === session.activeExercise) || blocks[0] || null;
    }
    return blocks[0] || null;
  }

  return null;
}

function plannedBlocksForActive() {
  const plan = planForActive();
  return Array.isArray(plan?.exerciseBlocks) ? plan.exerciseBlocks : [];
}

function plannedForExercise(exerciseName) {
  if (!exerciseName) return null;
  return plannedBlocksForActive().find(x => x && x.exerciseName === exerciseName) || null;
}

function show(view) {
  const sections = ['home', 'today', 'log', 'review', 'history'];

  // The page CSS shows a view via the .active class
  // (.view{display:none}.view.active{display:block}). Toggle that class rather
  // than setting inline display, so the stylesheet visibility rules win.
  const targetNode = document.getElementById(view);
  if (!targetNode) {
    const fallback = sections.find(id => document.getElementById(id)) || 'today';
    if (fallback !== view && document.getElementById(fallback)) view = fallback;
  }

  sections.forEach(id => {
    const node = document.getElementById(id);
    if (!node) return;
    node.style.display = ''; // clear stale inline override from older versions
    node.classList.toggle('active', id === view);
  });

  // Sync the top tabs + bottom nav active states (data-view or legacy data-go).
  $$('[data-view], [data-go]').forEach(b => {
    const target = b.dataset.view || b.dataset.go;
    b.classList.toggle('active', target === view);
  });

  const labels = { home: 'Today', today: 'Plan', log: 'Log', review: 'Review', history: 'History' };
  const mobileTitle = $('#mobileTitle');
  if (mobileTitle) mobileTitle.textContent = labels[view] || '';

  persistCurrentView(view);

  if (view === 'home' && typeof renderHome === 'function') renderHome();
  if (view === 'today' && typeof renderToday === 'function') renderToday();
  if (view === 'log' && typeof renderLog === 'function') renderLog();
  if (view === 'review' && typeof renderReview === 'function') renderReview();
  if (view === 'history' && typeof renderHistory === 'function') renderHistory();
}

function safeShow(view) {
  show(view);
}

function openTrainingFocus() {
  starterPreviewKey = null;
  editor = null;
  show('today');
  setTimeout(() => {
    $('#trainingFocus')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 40);
}

function openPlannerBuilder() {
  starterPreviewKey = null;
  editor =
    (typeof MomentumPlanner !== 'undefined' && typeof MomentumPlanner.blankWorkout === 'function')
      ? MomentumPlanner.blankWorkout()
      : (typeof newWorkoutShell === 'function' ? newWorkoutShell('manual') : null);

  if (editor) editor.sourceType = editor.sourceType || 'manual';

  show('today');
  setTimeout(() => {
    if (typeof renderEditor === 'function') renderEditor('builder');
    $('#plannerEditor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 40);
}

function openPlannerPaste() {
  starterPreviewKey = null;
  editor =
    (typeof MomentumPlanner !== 'undefined' && typeof MomentumPlanner.blankWorkout === 'function')
      ? MomentumPlanner.blankWorkout()
      : (typeof newWorkoutShell === 'function' ? newWorkoutShell('chatgpt') : null);

  if (editor) editor.sourceType = 'chatgpt';

  show('today');
  setTimeout(() => {
    if (typeof renderEditor === 'function') renderEditor('paste');
    $('#plannerEditor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 40);
}

function startPlan(id) {
  if (typeof MomentumPlanner === 'undefined' || typeof MomentumPlanner.load !== 'function') {
    return;
  }

  const plan = MomentumPlanner.load().find(x => x && x.id === id);
  if (!plan) {
    if (typeof toast === 'function') toast('Workout not found.');
    return;
  }

  active = (typeof newSession === 'function') ? newSession(plan) : fallbackSession();
  active.status = 'active';
  active.planId = plan.id;
  active.plannedWorkout = plan;
  active.phase = plan.phaseId || active.phase || '';
  active.week = plan.week || active.week || '';
  active.day = plan.day || active.day || '';
  active.workoutName = plan.title || active.workoutName || 'Planned workout';
  active.canonicalTitle = plan.canonicalTitle || plan.title || active.canonicalTitle || '';
  active.activeExercise = plan.exerciseBlocks?.[0]?.exerciseName || active.activeExercise || '';
  active.sets = Array.isArray(active.sets) ? active.sets : [];

  state.cockpit =
    (typeof MomentumPlanner.buildCockpitWorkout === 'function')
      ? MomentumPlanner.buildCockpitWorkout(plan)
      : null;

  state.cockpitEditOpen = false;
  state.cockpitEditingLastSet = null;
  state.restTimer = null;

  if (typeof MomentumPlanner.mark === 'function') {
    MomentumPlanner.mark(plan.id, 'active');
  }

  persist();
  renderHome();
  renderToday();
  renderLog();
  show('log');

  if (typeof toast === 'function') toast('Planned workout started');
}

function restoreStagedSession(sessionId) {
  const sessions = getDone();
  const idx = sessions.findIndex(x => x && x.id === sessionId);
  if (idx === -1) return null;

  const session = sessions[idx];
  if (!session || (session.status !== 'staged' && session.status !== 'shared')) return null;

  active = {
    ...fallbackSession(),
    ...session,
    status: 'active',
    completedAt: null
  };

  active.sets = Array.isArray(session.sets) ? session.sets : [];
  active.plannedWorkout = session.plannedWorkout || null;
  active.activeExercise =
    session.activeExercise ||
    session.plannedWorkout?.exerciseBlocks?.[0]?.exerciseName ||
    '';

  sessions.splice(idx, 1);
  saveDone(sessions);

  persist();
  renderLog();
  renderReview();
  renderToday();
  renderHome();
  show('log');

  if (typeof toast === 'function') toast('Workout restored to Log');
  return active;
}

function discardActiveWorkout() {
  const loggedCount = (active && Array.isArray(active.sets)) ? active.sets.length : 0;
  const warning = loggedCount > 0
    ? `Discard this workout? ${loggedCount} logged set${loggedCount === 1 ? '' : 's'} will be permanently deleted. This cannot be undone.`
    : 'Discard this workout? This cannot be undone.';
  if (!confirm(warning)) return;

  active = (typeof newSession === 'function') ? newSession() : fallbackSession();
  state.cockpit = null;
  state.cockpitEditOpen = false;
  state.cockpitEditingLastSet = null;
  state.restTimer = null;

  if (typeof persist === 'function') persist();

  if (typeof renderLog === 'function') renderLog();
  if (typeof renderToday === 'function') renderToday();
  if (typeof renderHome === 'function') renderHome();

  if (typeof toast === 'function') toast('Draft discarded');
}

function logMarkup() {
  const session = ensureActiveSession();
  const current = activeBlock();
  const currentName = current?.exerciseName || session.activeExercise || '';
  const sets = Array.isArray(session.sets) ? session.sets : [];
  const matchingSets = currentName
    ? sets.filter(x => x && (x.exerciseName === currentName || x.exercise === currentName))
    : sets;

  return matchingSets.length
    ? `<div class="set-history-table-wrap"><table class="set-history-table">
        <thead><tr><th>Set</th><th>Load</th><th>Reps</th><th>Tempo</th><th>RIR</th><th></th></tr></thead>
        <tbody>${matchingSets.map((set, index) => {
        const sessionIndex = sets.indexOf(set);
        return `<tr class="logged-set" data-edit-set="${sessionIndex}">
          <td data-label="Set">${index + 1}</td>
          <td data-label="Load">${esc(set.load ?? set.weight_lbs ?? set.weight ?? '—')}</td>
          <td data-label="Reps">${esc(set.reps ?? set.result ?? '—')}</td>
          <td data-label="Tempo">${esc(set.tempo || '—')}</td>
          <td data-label="RIR">${esc(set.rir || '—')}</td>
          <td data-label="Actions" class="col-actions"><button class="btn-delete-set" type="button" data-delete-set="${sessionIndex}" aria-label="Delete set ${index + 1}">&times;</button></td>
        </tr>`;
      }).join('')}</tbody></table></div>`
    : '<div class="empty">No sets logged yet for this exercise.</div>';
}

function renderPicker(query = '') {
  const root = $('#exercisePicker');
  if (!root || !active) return;

  const plan = planForActive();
  const plannedNames = new Set(((plan && plan.exerciseBlocks) || []).map(x => x.exerciseName));
  const library = (typeof allExercises === 'function') ? allExercises() : [];
  const cockpitNames = Array.isArray(state?.cockpit?.exercises)
    ? state.cockpit.exercises.map(x => x.exerciseName).filter(Boolean)
    : [];
  const planNames = [...plannedNames];
  const combined = [...new Set([...cockpitNames, ...planNames, ...library])];
  const names = combined.filter(x => String(x).toLowerCase().includes(query.toLowerCase()));

  root.innerHTML =
    names.map(x => `
      <button class="pick ${x === active.activeExercise ? 'active' : ''}" data-pick="${esc(x)}">
        <b>${esc(x)}</b>
        <small>${plannedNames.has(x) ? 'Planned workout' : 'Exercise library'}</small>
      </button>
    `).join('') ||
    '<div class="empty">No matching known exercises.</div>';

  $$('[data-pick]', root).forEach(b => {
    b.onclick = () => {
      active.activeExercise = b.dataset.pick;
      persist();
      renderLog();
    };
  });
}

function bindSessionContext() {
  $$('[data-context]').forEach(el => {
    el.oninput = () => {
      const key = el.dataset.context;
      if (key === 'coachQuestions') {
        active.coachQuestions = el.value;
        persist();
      }
    };
  });
}
/* ---------- renderHome ---------- */
function renderHome() {
  // --- Safe data access: MomentumData may not exist or may be partially loaded ---
  const rawMetrics = (typeof MomentumData !== 'undefined' && MomentumData && typeof MomentumData.metrics === 'function')
    ? (MomentumData.metrics() || {})
    : {};

  const m = {
    sessions: Number.isFinite(rawMetrics.sessions) ? rawMetrics.sessions : 0,
    sets: Number.isFinite(rawMetrics.sets) ? rawMetrics.sets : 0,
    primary: (Array.isArray(rawMetrics.primary) && rawMetrics.primary.length >= 2 && rawMetrics.primary[0] != null && Number.isFinite(Number(rawMetrics.primary[1])))
      ? rawMetrics.primary
      : ['—', 0]
  };

  const rawPhases = (typeof MomentumData !== 'undefined' && MomentumData && typeof MomentumData.phases === 'function')
    ? (MomentumData.phases() || [])
    : [];

  const phases = (Array.isArray(rawPhases) ? rawPhases : []).map(p => ({
    phase: (p && p.phase != null) ? p.phase : '—',
    sets: (p && Number.isFinite(Number(p.sets))) ? Number(p.sets) : 0
  }));

  const next = nextPlan();
  const done = getDone();
  const max = Math.max(...(phases.length ? phases.map(x => x.sets) : [0]), 1);

  // --- Safely normalize `next` so exerciseBlocks is always a usable array ---
  const safeNext = next
    ? {
        ...next,
        exerciseBlocks: Array.isArray(next.exerciseBlocks) ? next.exerciseBlocks : []
      }
    : null;

  const hasActiveSession = !!(
    typeof active !== 'undefined' &&
    active &&
    (
      (Array.isArray(active.sets) && active.sets.length) ||
      (state.cockpit && Array.isArray(state.cockpit.exercises) && state.cockpit.exercises.length)
    )
  );

  const activeSetCount = (typeof active !== 'undefined' && active && Array.isArray(active.sets))
    ? active.sets.length
    : 0;

  const hasQueuedPlan = !!safeNext;
  const mobile = isMobileHomeLayout();

  // Guard: if the home container is missing, there is nothing to render into.
  const homeRoot = $('#home');
  if (!homeRoot) return;

  let primaryActionMarkup = '';
  let secondaryActionMarkup = '';
  let tertiaryActionMarkup = '';

  if (hasActiveSession) {
    primaryActionMarkup = `<button class="primary" id="homeResumeWorkout">Resume workout</button>`;
    secondaryActionMarkup = `<button class="secondary" id="homeOpenPlan">Open plan</button>`;
  } else if (hasQueuedPlan) {
    primaryActionMarkup = `<button class="primary" id="homeStartQueuedWorkout">Start queued workout</button>`;
    secondaryActionMarkup = `<button class="secondary" id="homeOpenPlan">Open plan</button>`;
    tertiaryActionMarkup = `<button class="secondary" id="homeChooseStarter">Choose a pre-designed workout card</button>`;
  } else {
    primaryActionMarkup = `<button class="primary" id="homeChooseStarter">Choose a pre-designed workout card</button>`;
    secondaryActionMarkup = `<button class="secondary" id="homeCreatePlan">Create a plan from scratch</button>`;
    tertiaryActionMarkup = `<button class="secondary" id="homePastePlan">Paste plan from outside source</button>`;
  }

  if (mobile) {
    $('#home').innerHTML = `
      <div class="today-launchpad">
        <article class="card section">
          <div class="eyebrow">Today</div>
          <h1 style="margin-top:6px">What would you like to do today?</h1>
          <p class="quiet">
            ${hasActiveSession
              ? `${activeSetCount} set${activeSetCount === 1 ? '' : 's'} are saved locally on this device.`
              : hasQueuedPlan
                ? `${queued().length} planned workout${queued().length === 1 ? '' : 's'} ready to go.`
                : 'Choose a pre-designed card, build your own plan, or paste one from an outside source.'}
          </p>
          <div class="actions" style="margin-top:14px;flex-direction:column">
            ${primaryActionMarkup}
            ${secondaryActionMarkup}
            ${tertiaryActionMarkup}
          </div>
        </article>
        <div id="weekly-calendar-strip"></div>
      </div>
    `;
  } else {
    $('#home').innerHTML = `
      <article class="card today-hero-statbook">
        <div class="eyebrow">Today / command center</div>
        <h1>${hasActiveSession ? 'Your session is in progress.' : 'Know what changed. Capture what matters.'}</h1>
        <p class="quiet">
          ${hasActiveSession
            ? `${activeSetCount} set${activeSetCount === 1 ? '' : 's'} are saved locally on this device.`
            : 'Queue Coach’s next card, execute it on the gym floor, and carry both plan and performance into review.'}
        </p>
        <div class="actions">
          ${primaryActionMarkup}
          ${secondaryActionMarkup}
          ${tertiaryActionMarkup}
        </div>

        <div class="hero-divider"></div>

        <div class="hero-stat-row">
          <div class="hero-stat"><b>${m.sessions}</b><span>Historical sessions</span></div>
          <div class="hero-stat"><b>${m.sets.toLocaleString()}</b><span>Historical sets</span></div>
          <div class="hero-stat"><b>${queued().length}</b><span>Planned workouts</span></div>
          <div class="hero-stat"><b>${done.length}</b><span>Completed locally</span></div>
        </div>

        ${
          safeNext
            ? `
              <div class="hero-divider"></div>
              <div class="hero-next-up">
                <div class="eyebrow">Next up</div>
                <h2 style="margin-top:6px">${esc(safeNext.title)}</h2>
                <p class="quiet">${esc(planSummary(safeNext))} · ${safeNext.exerciseBlocks.length} exercise${safeNext.exerciseBlocks.length === 1 ? '' : 's'} · from ${esc(safeNext.sourceType)}</p>
                <div class="actions">
                  <button class="primary" data-start="${safeNext.id}">Start workout</button>
                </div>
              </div>
            `
            : ''
        }
      </article>

      <div id="weekly-calendar-strip"></div>
    `;
  }

  bindGo();
  $$('[data-start]').forEach(b => b.onclick = () => startPlan(b.dataset.start));

  const homeResumeWorkout = $('#homeResumeWorkout');
  if (homeResumeWorkout) homeResumeWorkout.onclick = () => show('log');

  const homeOpenPlan = $('#homeOpenPlan');
  if (homeOpenPlan) homeOpenPlan.onclick = () => show('today');

  const homeStartQueuedWorkout = $('#homeStartQueuedWorkout');
  if (homeStartQueuedWorkout && safeNext) {
    homeStartQueuedWorkout.onclick = () => startPlan(safeNext.id);
  }

  const homeChooseStarter = $('#homeChooseStarter');
  if (homeChooseStarter) {
    homeChooseStarter.onclick = () => openTrainingFocus();
  }

  const homeCreatePlan = $('#homeCreatePlan');
  if (homeCreatePlan) {
    homeCreatePlan.onclick = () => openPlannerBuilder();
  }

  const homePastePlan = $('#homePastePlan');
  if (homePastePlan) {
    homePastePlan.onclick = () => openPlannerPaste();
  }

  if (typeof MomentumPlanner !== 'undefined' && typeof MomentumPlanner.renderWeeklyCalendarStrip === 'function') {
    MomentumPlanner.renderWeeklyCalendarStrip('weekly-calendar-strip');
  }
}

/* ---------- renderToday ---------- */
/* ---------- shared safety helpers ---------- */
function safeBlocks(list) {
  return Array.isArray(list) ? list : [];
}

function safePlan(plan) {
  if (!plan || typeof plan !== 'object') return null;
  return {
    ...plan,
    exerciseBlocks: safeBlocks(plan.exerciseBlocks)
  };
}

function plannerMethodAvailable(methodName) {
  return typeof MomentumPlanner !== 'undefined' &&
    MomentumPlanner &&
    typeof MomentumPlanner[methodName] === 'function';
}

function plannerLoadSafe() {
  if (!plannerMethodAvailable('load')) return [];
  const loaded = MomentumPlanner.load();
  return Array.isArray(loaded) ? loaded : [];
}

/* ---------- renderToday ---------- */
function renderToday() {
  const root = $('#today');
  if (!root) return;

  const rawList = (typeof queued === 'function' ? queued() : []) || [];
  const list = (Array.isArray(rawList) ? rawList : []).map(p => safePlan(p)).filter(Boolean);
  const next = list[0] || null;

  const rawCards = (typeof starterCards === 'function' ? starterCards() : []) || [];
  const cards = (Array.isArray(rawCards) ? rawCards : []).map(card => ({
    key: card && card.key != null ? card.key : '',
    title: (card && card.title) || 'Untitled card',
    descriptor: (card && card.descriptor) || '',
    equipment: (card && card.equipment) || '—',
    duration: (card && card.duration) || '—',
    lesson: (card && card.lesson) || '—',
    exerciseBlocks: safeBlocks(card && card.exerciseBlocks)
  }));

  root.innerHTML = `
    <div class="today-layout">
      <div class="eyebrow">Plan + prepare</div>
      <h1>Build and queue the workout.</h1>
      <p class="quiet">Paste the card from Coach, make practical edits, then launch the planned structure directly into Log.</p>

      <article class="card">
        ${
          next ? `
            <div class="card-head">
              <div>
                <div class="eyebrow">Next workout</div>
                <h2 style="margin-top:6px">${esc(next.title)}</h2>
                ${esc(planSummary(next))} · ${next.exerciseBlocks.length} exercises
              </div>
              ${esc(next.status)}
            </div>
            <div class="actions">
              <button class="primary" data-start="${next.id}">Start workout</button>
              <button class="secondary" data-edit="${next.id}">Edit</button>
              <button class="danger" data-delete="${next.id}">Delete</button>
            </div>
          ` : `
            <div class="empty">
              <b style="color:var(--ink)">No workout planned yet.</b>
              Choose a starter card, paste a Coach card, or create a custom workout below.
            </div>
            <div class="actions">
              <button class="primary" id="pasteCard">Paste workout card</button>
              <button class="secondary" id="blankCard">Create custom workout</button>
            </div>
          `
        }
      </article>

      <article class="card section" id="trainingFocus">
        <div class="card-head">
          <div><h2>Choose a training focus</h2>Starter workout cards for novice-friendly, low-friction training.</div>
          ${cards.length}
        </div>

        <div class="starter-grid">
          ${cards.map(card => `
            <div class="starter-tile">
              <div class="starter-head">
                <div>
                  <b>${esc(card.title)}</b>
                  <div class="target">${esc(card.descriptor)}</div>
                </div>
              </div>

              <div class="starter-mini-table">
                <div class="starter-mini-row">
                  Equipment
                  <b>${esc(card.equipment)}</b>
                </div>
                <div class="starter-mini-row">
                  Duration
                  <b>${esc(card.duration)}</b>
                </div>
                <div class="starter-mini-row">
                  Lesson
                  <b>${esc(card.lesson)}</b>
                </div>
                <div class="starter-mini-row">
                  Exercises
                  <b>${card.exerciseBlocks.length}</b>
                </div>
              </div>

              <div class="actions starter-actions">
                <button class="primary" data-use-starter="${card.key}">Use this card</button>
              </div>
            </div>
          `).join('')}
        </div>
      </article>

      <article class="card section">
        <div class="card-head">
          <div><h2>Queued workouts</h2>Reorder, duplicate, or edit upcoming cards.</div>
          ${list.length}
        </div>
        ${
          list.length
            ? list.map((plan, index) => `
              <div class="exercise-card">
                <div class="exercise-title">
                  <div>
                    <b>${index + 1}. ${esc(plan.title)}</b>
                    <div class="target">${esc(planSummary(plan))}</div>
                    <div class="quiet">${plan.exerciseBlocks.length} exercises · ${esc(plan.sourceType)}</div>
                  </div>
                  <div class="row-actions">
                    <button class="icon-btn" title="Move up" data-move="${plan.id}" data-direction="-1">↑</button>
                    <button class="icon-btn" title="Move down" data-move="${plan.id}" data-direction="1">↓</button>
                  </div>
                </div>
                <div class="actions">
                  <button class="secondary" data-edit="${plan.id}">Open / edit</button>
                  <button class="secondary" data-duplicate="${plan.id}">Duplicate</button>
                  ${plan.id !== next?.id ? `<button class="danger" data-delete="${plan.id}">Delete</button>` : ''}
                </div>
              </div>
            `).join('')
            : '<p class="quiet">Your upcoming workouts will appear here.</p>'
        }
      </article>

      <details class="card section glossary-card">
        <summary><b>Glossary + training guide</b>Tap to expand</summary>
        <div class="glossary-body">
          <div class="insight">
            <i class="dot"></i>
            <div>
              <b>Tempo</b>
              Tempo tells you how fast to perform each part of a repetition.
              Starter cards use: lower - pause - lift
              Coach / pasted cards use: eccentric - pause - concentric
              Example: 3-1-2 = lower for 3 sec, pause for 1 sec, lift for 2 sec.
            </div>
          </div>

          <div class="insight">
            <i class="dot"></i>
            <div>
              <b>RIR</b>
              RIR = Reps in Reserve.
              RIR 3 — finish knowing you had about 3 good reps left.
              Why it matters: autoregulation methods like RIR are widely used in evidence-based coaching and supported in the training literature for helping lifters select appropriate loads and manage effort as fatigue changes.
            </div>
          </div>

          <div class="insight">
            <i class="dot amber"></i>
            <div>
              <b>How Momentum teaches training</b>
              Movement → Control → Effort → Load → Progression
              A novice should first learn the movement, then control it, then judge effort honestly, then add load, and only then chase progression.
            </div>
          </div>

          <div class="insight">
            <i class="dot"></i>
            <div>
              <b>Why tempo and RIR matter</b>
              Tempo teaches control. RIR teaches autoregulation. Together they teach stimulus awareness so load progression becomes more meaningful.
            </div>
          </div>

          <div class="insight">
            <i class="dot"></i>
            <div>
              <b>Rest</b>
              Rest is recovery between sets. More demanding sets usually need longer rest to keep movement quality and effort honest.
            </div>
          </div>

          <div class="insight">
            <i class="dot"></i>
            <div>
              <b>Load selection</b>
              Choose a weight that lets you complete the prescribed reps with clean technique while still having about 2-4 good reps left unless the card says otherwise.
            </div>
          </div>
        </div>
      </details>

      <section id="plannerEditor" class="section"></section>
    </div>
  `;

  bindToday();

  $$('[data-use-starter]').forEach(button => {
    button.onclick = () => {
      starterPreviewKey = button.dataset.useStarter;
      editor = null;
      if (typeof renderStarterPreview === 'function') renderStarterPreview(starterPreviewKey);
      setTimeout(() => {
        const node = $('#plannerEditor');
        if (node && node.scrollIntoView) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 40);
    };
  });

  if (starterPreviewKey && typeof renderStarterPreview === 'function') renderStarterPreview(starterPreviewKey);
}

/* ---------- bindToday ---------- */
function bindToday() {
  const pasteCard = $('#pasteCard');
  if (pasteCard) {
    pasteCard.onclick = () => {
      if (plannerMethodAvailable('blankWorkout')) {
        editor = MomentumPlanner.blankWorkout();
      } else if (typeof newWorkoutShell === 'function') {
        editor = newWorkoutShell('chatgpt');
      } else {
        toast('Workout builder is unavailable right now');
        return;
      }
      editor.sourceType = 'chatgpt';
      editor.exerciseBlocks = safeBlocks(editor.exerciseBlocks);
      renderEditor('paste');
      $('#plannerEditor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  }

  const blankCard = $('#blankCard');
  if (blankCard) {
    blankCard.onclick = () => {
      if (plannerMethodAvailable('blankWorkout')) {
        editor = MomentumPlanner.blankWorkout();
      } else if (typeof newWorkoutShell === 'function') {
        editor = newWorkoutShell('manual');
      } else {
        toast('Workout builder is unavailable right now');
        return;
      }
      editor.sourceType = 'manual';
      editor.exerciseBlocks = safeBlocks(editor.exerciseBlocks);
      renderEditor('builder');
      $('#plannerEditor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  }

  const referenceCard = $('#referenceCard');
  if (referenceCard) {
    referenceCard.onclick = () => {
      const base = (typeof basePlan === 'function') ? basePlan() : null;
      if (!base || typeof clone !== 'function') {
        toast('Reference plan is unavailable right now');
        return;
      }
      editor = clone(base);
      editor.id = plannerMethodAvailable('blankWorkout')
        ? MomentumPlanner.blankWorkout().id
        : (typeof momentumUid === 'function' ? momentumUid('plan') : `plan_${Date.now()}`);
      editor.status = 'queued';
      editor.sourceType = 'reference';
      editor.exerciseBlocks = safeBlocks(editor.exerciseBlocks);
      renderEditor('builder');
      $('#plannerEditor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  }

  $$('[data-edit]').forEach(b => b.onclick = () => {
    const stored = plannerLoadSafe().find(x => x && x.id === b.dataset.edit);
    if (!stored) {
      toast('That workout could not be found');
      return;
    }
    if (typeof clone !== 'function') {
      toast('Editor is unavailable right now');
      return;
    }
    editor = clone(stored);
    editor.exerciseBlocks = safeBlocks(editor.exerciseBlocks);
    renderEditor('builder');
    $('#plannerEditor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  $$('[data-delete]').forEach(b => b.onclick = () => {
    if (!confirm('Delete this queued workout?')) return;
    if (!plannerMethodAvailable('remove')) {
      toast('Delete is unavailable right now');
      return;
    }
    MomentumPlanner.remove(b.dataset.delete);
    renderToday();
    if (typeof renderHome === 'function') renderHome();
  });

  $$('[data-duplicate]').forEach(b => b.onclick = () => {
    if (!plannerMethodAvailable('duplicate')) {
      toast('Duplicate is unavailable right now');
      return;
    }
    MomentumPlanner.duplicate(b.dataset.duplicate);
    renderToday();
    if (typeof renderHome === 'function') renderHome();
    toast('Queued workout duplicated');
  });

  $$('[data-move]').forEach(b => b.onclick = () => {
    if (!plannerMethodAvailable('move')) {
      toast('Reorder is unavailable right now');
      return;
    }
    MomentumPlanner.move(b.dataset.move, +b.dataset.direction);
    renderToday();
    if (typeof renderHome === 'function') renderHome();
  });

  $$('[data-start]').forEach(b => b.onclick = () => {
    if (typeof startPlan === 'function') startPlan(b.dataset.start);
  });
}

/* ---------- renderEditor ---------- */
function renderEditor(mode) {
  const root = $('#plannerEditor');
  if (!root || !editor) return;

  editor.exerciseBlocks = safeBlocks(editor.exerciseBlocks);

  if (mode === 'paste') {
    root.innerHTML = `
      <article class="card">
        <div class="eyebrow">Paste workout card</div>
        <h2 style="margin-top:6px">Import from Coach / ChatGPT</h2>
        <p class="quiet">Parsing is conservative. The original text is saved, and every extracted field remains editable.</p>
        <textarea id="rawCard" placeholder="Paste the complete Coach workout card here…">${esc(editor.sourceRawText || '')}</textarea>
        <div class="actions">
          <button class="primary" id="parseCard">Parse into editable workout</button>
          <button class="secondary" id="generateCoachAiCard">Generate with Coach AI</button>
          <button class="secondary" id="cancelEditor">Cancel</button>
        </div>
      </article>
    `;

    const parseCard = $('#parseCard');
    if (parseCard) {
      parseCard.onclick = () => {
        const rawEl = $('#rawCard');
        const raw = rawEl ? rawEl.value.trim() : '';
        if (!raw) {
          toast('Paste a workout card first');
          return;
        }
        if (!plannerMethodAvailable('parse')) {
          toast('Parsing is unavailable right now');
          return;
        }
        const parsed = MomentumPlanner.parse(raw);
        if (!parsed) {
          toast('Could not parse that workout card');
          return;
        }

        const parsedBlocks = Array.isArray(parsed.exerciseBlocks)
          ? parsed.exerciseBlocks
          : (Array.isArray(parsed.exercises)
            ? parsed.exercises.map((exercise, index) => ({
                id: exercise.id || `planned-${Date.now()}-${index + 1}`,
                order: index + 1,
                exerciseName: exercise.name || exercise.exerciseName || '',
                targetSets: exercise.sets || exercise.targetSets || '',
                targetRepsOrDuration: exercise.reps || exercise.targetRepsOrDuration || '',
                targetWeightOrLoad: exercise.load || exercise.targetWeightOrLoad || '',
                tempo: exercise.tempo || '',
                rir: exercise.rir || '',
                rest: exercise.rest || '',
                notes: exercise.notes || '',
                checkpoints: exercise.checkpoints || '',
                tags: Array.isArray(exercise.tags) ? exercise.tags : [],
                optional: !!exercise.optional,
                timed: !!exercise.timed,
                section: exercise.section || 'primary'
              }))
            : []);
        const namedBlocks = parsedBlocks.filter(block => String(block?.exerciseName || '').trim());
        if (!namedBlocks.length) {
          toast('No exercises detected. Check that the complete workout card was pasted.');
          return;
        }

        parsed.exerciseBlocks = namedBlocks;
        editor = parsed;
        editor.exerciseBlocks = safeBlocks(editor.exerciseBlocks);
        renderEditor('builder');
      };
    }

    const generateCoachBtn = $('#generateCoachAiCard');
    if (generateCoachBtn) {
      generateCoachBtn.onclick = async () => {
        if (!window.MomentumSync) return;
        const rawEl = $('#rawCard');
        const promptText = rawEl ? rawEl.value.trim() : '';
        generateCoachBtn.textContent = 'Generating with AI…';
        try {
          const cardText = await MomentumSync.generateCoachCard(promptText || 'Generate training card based on active cycle, orthopedic guardrails, and PR history.');
          if (cardText) {
            if (rawEl) rawEl.value = cardText;
            if (typeof MomentumPlanner !== 'undefined' && typeof MomentumPlanner.parse === 'function') {
              const parsed = MomentumPlanner.parse(cardText);
              if (parsed) {
                editor = parsed;
                editor.exerciseBlocks = safeBlocks(editor.exerciseBlocks);
                renderEditor('builder');
              }
            }
          }
        } catch (_) {
          /* error notified by MomentumSync */
        } finally {
          generateCoachBtn.textContent = 'Generate with Coach AI';
        }
      };
    }

    const cancelEditor = $('#cancelEditor');
    if (cancelEditor) {
      cancelEditor.onclick = () => {
        editor = null;
        root.innerHTML = '';
      };
    }
    return;
  }

  const teaching = (typeof plannerTeachingCopy === 'function')
    ? (plannerTeachingCopy(editor) || {})
    : {};
  const teachingSafe = {
    tempoLabel: teaching.tempoLabel || 'Tempo',
    tempoExample: teaching.tempoExample || '',
    rirLine: teaching.rirLine || 'RIR',
    scienceLine: teaching.scienceLine || ''
  };

  const datalistMarkup = (typeof exerciseDatalistMarkup === 'function')
    ? (exerciseDatalistMarkup() || '')
    : '';

  root.innerHTML = `
    <article class="card">
      <div class="eyebrow">Workout builder</div>
      <h2 style="margin-top:6px">Edit planned structure</h2>

      <div class="signal-card" style="margin-top:12px">
        <b>${esc(teachingSafe.tempoLabel)}</b>
        ${esc(teachingSafe.tempoExample)}
        <b>${esc(teachingSafe.rirLine)}</b>
        ${esc(teachingSafe.scienceLine)}
      </div>

      <div class="set-form" style="margin-top:12px">
        <label class="field full">Workout title<input class="input" data-plan="title" value="${esc(editor.title || '')}"></label>
        <label class="field full">Workout subtitle<input class="input" data-plan="subtitle" value="${esc(editor.subtitle || '')}"></label>
        <label class="field">Scheduled date<input class="input" type="date" data-plan="scheduledDate" value="${esc(editor.scheduledDate || '')}"></label>
        <label class="field">Source
          <select data-plan="sourceType">
            ${['chatgpt', 'manual', 'duplicate', 'history', 'reference', 'starter'].map(x => `<option ${editor.sourceType === x ? 'selected' : ''}>${x}</option>`).join('')}
          </select>
        </label>
        <label class="field">Phase<input class="input" inputmode="numeric" data-plan="phaseId" value="${esc(editor.phaseId || '')}"></label>
        <label class="field">Week<input class="input" inputmode="numeric" data-plan="week" value="${esc(editor.week || '')}"></label>
        <label class="field">Day<input class="input" inputmode="numeric" data-plan="day" value="${esc(editor.day || '')}"></label>
      </div>

      <datalist id="knownExerciseList">
        ${datalistMarkup}
      </datalist>

      <div class="workout-card">
        ${
          editor.exerciseBlocks.length
            ? editor.exerciseBlocks.map((block, index) => {
                return (typeof builderBlock === 'function')
                  ? builderBlock(block, index)
                  : `<div class="exercise-card"><div class="quiet">Block editor unavailable for "${esc(block?.exerciseName || 'exercise')}".</div></div>`;
              }).join('')
            : '<div class="empty">No exercises yet. Use "Add exercise" to start building this workout.</div>'
        }
      </div>

      <div class="actions">
        <button class="secondary" id="addBlock">Add exercise</button>
        <button class="primary" id="saveQueue">Save to queue</button>
        <button class="secondary" id="cancelEditor">Cancel</button>
      </div>
    </article>
  `;

  $$('[data-plan]').forEach(input => input.oninput = () => {
    editor[input.dataset.plan] = input.value;
  });

  $$('[data-block]').forEach(input => input.oninput = () => {
    const block = editor.exerciseBlocks.find(x => x.id === input.dataset.block);
    if (!block) return;

    const field = input.dataset.field;
    let value = input.value;

    if (field === 'exerciseName') {
      block[field] = value;
      return;
    }

    if (field === 'targetSets') {
      value = (typeof normalizeNumericEntry === 'function') ? normalizeNumericEntry(value, false) : value;
      input.value = value;
    }

    if (field === 'targetWeightOrLoad') {
      value = (typeof normalizeNumericEntry === 'function') ? normalizeNumericEntry(value, true) : value;
      input.value = value;
    }

    if (field === 'rir') {
      value = String(value || '').replace(/[^0-9+\-]/g, '');
      input.value = value;
    }

    block[field] = value;
  });

  $$('[data-block][data-field="exerciseName"]').forEach(input => {
    input.oninput = () => {
      const block = editor.exerciseBlocks.find(x => x.id === input.dataset.block);
      if (block) block.exerciseName = input.value;
      const card = input.closest('[data-block-card]');
      const h2 = card && card.querySelector('h2');
      if (h2) h2.textContent = input.value || 'Untitled exercise';
    };
    input.onchange = () => {
      const block = editor.exerciseBlocks.find(x => x.id === input.dataset.block);
      if (!block) return;

      const canon = (typeof canonicalExerciseName === 'function') ? canonicalExerciseName(input.value) : null;
      if (canon) {
        input.value = canon;
        block.exerciseName = canon;
      }
    };
  });

  $$('[data-remove-block]').forEach(button => button.onclick = () => {
    editor.exerciseBlocks = editor.exerciseBlocks.filter(x => x.id !== button.dataset.removeBlock);
    if (!editor.exerciseBlocks.length && plannerMethodAvailable('blankBlock')) {
      editor.exerciseBlocks = [MomentumPlanner.blankBlock()];
    }
    renderEditor('builder');
  });

$$('[data-browse-exercise]').forEach(button => button.onclick = () => {
    const blockId = button.dataset.browseExercise;
    openExercisePickerModal(name => {
      const block = editor.exerciseBlocks.find(x => x.id === blockId);
      if (!block) return;
      block.exerciseName = (typeof canonicalExerciseName === 'function') ? canonicalExerciseName(name) : name;
      renderEditor('builder');
    });
  });

  const addBlock = $('#addBlock');
  if (addBlock) {
    addBlock.onclick = () => {
      if (plannerMethodAvailable('blankBlock')) {
        editor.exerciseBlocks.push(MomentumPlanner.blankBlock(editor.exerciseBlocks.length + 1));
        renderEditor('builder');
      } else {
        toast('Adding exercises is unavailable right now');
      }
    };
  }

  const saveQueue = $('#saveQueue');
  if (saveQueue) {
    saveQueue.onclick = () => {
      editor.exerciseBlocks.forEach((x, i) => {
        x.order = i + 1;
        x.exerciseName = (typeof canonicalExerciseName === 'function')
          ? canonicalExerciseName(String(x.exerciseName || '').trim())
          : String(x.exerciseName || '').trim();
        x.targetSets = (typeof normalizeNumericEntry === 'function') ? normalizeNumericEntry(x.targetSets, false) : x.targetSets;
        x.targetWeightOrLoad = (typeof normalizeNumericEntry === 'function') ? normalizeNumericEntry(x.targetWeightOrLoad, true) : x.targetWeightOrLoad;
        x.rir = String(x.rir || '').replace(/[^0-9+\-]/g, '');
      });

      const invalidBlock = editor.exerciseBlocks.find(block => !String(block.exerciseName || '').trim());

      if (invalidBlock) {
        toast('Each exercise needs a name');
        return;
      }

      if (!plannerMethodAvailable('upsert')) {
        toast('Saving is unavailable right now');
        return;
      }

      editor.status = 'queued';
      MomentumPlanner.upsert(editor);
      editor = null;
      starterPreviewKey = null;
      renderToday();
      if (typeof renderHome === 'function') renderHome();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast('Workout saved to queue');
    };
  }

  const cancelEditor = $('#cancelEditor');
  if (cancelEditor) {
    cancelEditor.onclick = () => {
      editor = null;
      root.innerHTML = '';
    };
  }
}

/* ---------- start workout ---------- */


/* ---------- cockpit / session safety ---------- */




/* ---------- renderPicker ---------- */

/* ---------renderLog Helpers----- */

function prescriptionOf(block) {
  const b = block || {};
  const isCockpit = 'prescribedLoad' in b || 'prescribedSets' in b;
  let sets, reps, load, tempo, rir, rest;
  if (isCockpit) {
    sets = b.prescribedSets; reps = b.prescribedRepsOrDuration; load = b.prescribedLoad;
    tempo = b.prescribedTempo; rir = b.prescribedRir; rest = b.prescribedRest;
    if ((!sets || sets === 0) && typeof plannedForExercise === 'function') {
      const pb = plannedForExercise(b.exerciseName);
      if (pb && pb.targetSets) sets = pb.targetSets;
    }
  } else {
    sets = b.targetSets; reps = b.targetRepsOrDuration; load = b.targetWeightOrLoad;
    tempo = b.tempo; rir = b.rir; rest = b.rest;
  }
  const isTimed = b.timed || /\b(sec|min|s|m)\b/i.test(reps || '') || (typeof isTimedExercise === 'function' && isTimedExercise(b.exerciseName, reps));
  return {
    exerciseName: b.exerciseName || '',
    sets: sets, reps: reps, load: load, tempo: tempo, rir: rir, rest: rest,
    workingLoad: isCockpit ? (b.workingLoad || '') : (b.targetWeightOrLoad || ''),
    checkpoint: b.checkpoints || '',
    optional: b.optional || false,
    timed: isTimed,
    section: b.section || ''
  };
}

function prescribedSetsCount(block) {
  const rx = prescriptionOf(block);
  const raw = String(rx.sets == null ? '' : rx.sets).trim();
  if (!raw) return 1;
  const n = Number(raw);
  if (!isNaN(n) && n > 0) return n;
  const range = raw.match(/(\d+)\s*[-\u2013]\s*(\d+)/);
  if (range) return Number(range[2]);
  const any = raw.match(/(\d+)/);
  return any ? Number(any[1]) : 1;
}

function topEndReps(reps) {
  const sx = String(reps == null ? '' : reps).trim();
  if (!sx) return '';
  const range = sx.match(/(\d+)\s*[-\u2013]\s*(\d+)/);
  if (range) return range[2];
  return sx;
}

function extractLoadNumber(load) {
  const sx = String(load == null ? '' : load).trim();
  if (!sx) return '';
  const m = sx.match(/(\d+(?:\.\d+)?)/);
  return m ? m[1] : '';
}

function nextExerciseNameFor(currentName) {
  const ex = state && state.cockpit && Array.isArray(state.cockpit.exercises) ? state.cockpit.exercises : [];
  if (!ex.length) return '';
  let idx = ex.findIndex(e => e && e.exerciseName === currentName);
  if (idx < 0 && state.cockpit && typeof state.cockpit.exerciseIndex === 'number') idx = state.cockpit.exerciseIndex;
  for (let i = idx + 1; i < ex.length; i++) {
    if (ex[i] && !ex[i].skipped) return ex[i].exerciseName || '';
  }
  return '';
}

function restSecondsFromPrescription(rest) {
  const sx = String(rest == null ? '' : rest).trim();
  if (!sx) return 60; // no rest prescribed -> default to 60s
  // Matches "90s", "90 sec", "90 seconds", "2m", "2 min", "2 minutes", etc.
  const unit = sx.match(/(\d+(?:\.\d+)?)\s*(sec(?:ond)?s?|s|min(?:ute)?s?|m)\b/i);
  if (unit) {
    const amount = parseFloat(unit[1]);
    const isMinutes = /^(min(?:ute)?s?|m)$/i.test(unit[2]);
    return Math.round(isMinutes ? amount * 60 : amount);
  }
  // A bare number with no recognizable unit is ambiguous -- do not silently
  // assume minutes (that was the original 5400s bug: "90s" without a "sec"
  // match fell through here and got multiplied by 60). Treat bare numbers
  // as seconds, which matches how every rest value in this codebase is
  // authored ("60 sec", "90 sec", "2 min") once the unit-less case is hit.
  const bare = sx.match(/(\d+(?:\.\d+)?)/);
  return bare ? Math.round(parseFloat(bare[1])) : 60;
}

function insertRirOption(options, value) {
  // Sort the extra chip into the list by its leading number so the row
  // stays in ascending order (e.g. "2-3" lands between "2" and "2+").
  const key = v => {
    const n = parseFloat(String(v).match(/(\d+(?:\.\d+)?)/)?.[1]);
    return Number.isNaN(n) ? Infinity : n;
  };
  const next = options.slice();
  const vKey = key(value);
  let idx = next.findIndex(o => key(o) > vKey);
  if (idx < 0) idx = next.length;
  next.splice(idx, 0, value);
  return next;
}

function restBannerMarkup() {
  const rt = state && state.restTimer;
  if (!rt || !rt.total) return '';
  const elapsed = rt.startedAt ? Math.floor((Date.now() - rt.startedAt) / 1000) : 0;
  const remaining = Math.max(0, rt.total - elapsed);
  if (remaining <= 0) return '';
  return '<div class="rest-banner" id="restBanner"><span class="rest-label">Rest</span> <b id="restTime">' + remaining + 's</b><button class="chip" id="skipRest">Skip</button></div>';
}



/* ---------- renderLog ---------- */
function renderLog() {
  const root = document.getElementById('log');
  if (!root) return;

  if (!active || !Array.isArray(active.sets)) {
    active = (typeof newSession === 'function') ? newSession() : fallbackSession();
  }

  const reviewed = (typeof selectedReviewedSession === 'function') ? selectedReviewedSession() : null;
  const showCompletedState =
    !active.sets.length &&
    !state.cockpit &&
    reviewed &&
    (reviewed.status === 'staged' || reviewed.status === 'shared');

  if (showCompletedState) {
    const next = safePlan((typeof nextPlan === 'function') ? nextPlan() : null);

    root.innerHTML = `
      <div class="log-shell">
        <article class="card section">
          <div class="eyebrow">Workout complete</div>
          <h1 style="margin-top:6px">${esc(reviewed.workoutName || 'Completed workout')}</h1>
          <p class="quiet">
            This workout has been moved to Review.
            To edit completed sets or update Questions for Coach, use the Review page.
          </p>

          <div class="signal-card" style="margin-top:12px">
            <b>Status:</b> ${esc(reviewed.status)}
            ${reviewed.status === 'staged'
              ? 'You can still undo finish and return to Log.'
              : 'This session has already been shared once, but you can still review it.'}
          </div>

          <div class="actions" style="margin-top:14px">
            <button class="primary" id="openReviewFromLog">Open Review</button>
            ${reviewed.status === 'staged' ? `<button class="secondary" id="undoFinishFromLog">Undo finish</button>` : ''}
            ${next ? `<button class="secondary" id="openNextWorkoutFromLog">Open next workout</button>` : ''}
          </div>
        </article>
      </div>
    `;

    $('#openReviewFromLog')?.addEventListener('click', () => {
      selectedReviewId = reviewed.id;
      if (typeof renderReview === 'function') renderReview();
      show('review');
    });

    $('#undoFinishFromLog')?.addEventListener('click', () => {
      if (typeof restoreStagedSession === 'function') restoreStagedSession(reviewed.id);
    });

    $('#openNextWorkoutFromLog')?.addEventListener('click', () => {
      show('today');
    });

    return;
  }

  const block = (typeof activeBlock === 'function' ? activeBlock() : null) || {};
  const rx = prescriptionOf(block);

  // Nothing staged yet (no plan/cockpit block, no exercise picked): the full
  // set-entry chrome below assumes an active exercise and previously rendered
  // a dead "Choose exercise" heading with no way to actually choose one — the
  // real picker was collapsed under "Switch exercise" further down the page.
  // Surface it immediately instead.
  if (!rx.exerciseName) {
    root.innerHTML = `
      <div class="log-shell">
        <header class="active-session compact-bar">
          <div class="bar-title-wrap"><h1 class="bar-title">Choose an exercise to begin</h1></div>
          <div class="session-tools"><button class="danger mini" id="discard">Discard</button></div>
        </header>

        <article class="card" style="text-align:center;padding:24px 19px">
          ${profileIcon('target', 34)}
          <h2 style="margin-top:10px">Pick your first exercise</h2>
          <p class="quiet">Search the exercise library or browse by category to start logging sets.</p>
        </article>

        <article class="card" style="margin-top:14px">
          <div style="display:flex;gap:8px">
            <input id="searchExercise" class="input" placeholder="Search known exercises" style="flex:1">
            <button type="button" class="secondary" id="browseExerciseLibrary" style="white-space:nowrap">Browse library</button>
          </div>
          <div id="exercisePicker" class="picker-list" style="margin-top:10px"></div>
        </article>
      </div>
    `;
    if (typeof renderPicker === 'function') renderPicker();
    if (typeof bindLog === 'function') bindLog();
    if (typeof bindSessionContext === 'function') bindSessionContext();
    return;
  }

  const exerciseSets = rx.exerciseName
    ? (active.sets || []).filter(s => (s.exerciseName || s.exercise) === rx.exerciseName || (s.exerciseName || s.exercise || '').toLowerCase() === rx.exerciseName.toLowerCase())
    : [];
  const completedForCurrent = exerciseSets.length;
  const setsTarget = prescribedSetsCount(block);
  const setsComplete = completedForCurrent >= setsTarget;
  const nextName = nextExerciseNameFor(rx.exerciseName);
  const showNext = setsComplete && !!nextName;

  const repsText = rx.reps
    ? (/\b(sec|min|s|m)\b/i.test(rx.reps) || rx.timed ? rx.reps : `${rx.reps} reps`)
    : '';

  const summary = [
    rx.load && ('Load ' + rx.load + (/\b(lb|lbs|kg)\b/i.test(rx.load) ? '' : ' lbs')),
    repsText,
    rx.tempo && ('Tempo ' + rx.tempo),
    rx.rir && ('RIR ' + rx.rir),
    rx.rest && ('Rest ' + rx.rest)
  ].filter(Boolean).join(' · ') || 'No planned target';

  let loadVal = '';
  if (exerciseSets.length > 0) {
    const lastSet = exerciseSets[exerciseSets.length - 1];
    const lastLoad = (lastSet.load != null && lastSet.load !== '')
      ? lastSet.load
      : (lastSet.weight_lbs != null ? lastSet.weight_lbs : '');
    loadVal = extractLoadNumber(lastLoad) || (lastLoad != null ? String(lastLoad).trim() : '');
  } else {
    const defaultLoad = rx.workingLoad || rx.load || (active && active.workingLoads && active.workingLoads[rx.exerciseName]) || '';
    loadVal = extractLoadNumber(defaultLoad) || (defaultLoad != null ? String(defaultLoad).trim() : '');
  }
  const repsVal = topEndReps(rx.reps);
  const tempoParts = String(rx.tempo || '').split('-');
  const baseRirOptions = ['0', '0-1', '1', '1-2', '2', '2+', '3+', '4+'];
  const editingSet = Number.isInteger(state.editingSetIndex) ? active.sets[state.editingSetIndex] : null;
  const isEditingSet = !!(editingSet && ((editingSet.exerciseName || editingSet.exercise) === rx.exerciseName || (rx.exerciseName && (editingSet.exerciseName || editingSet.exercise || '').toLowerCase() === rx.exerciseName.toLowerCase())));
  const editingLoad = editingSet ? (editingSet.load ?? editingSet.weight_lbs ?? '') : '';
  const activeRir = isEditingSet ? (editingSet.rir || '') : (rx.rir || '');
  // The prescribed/edited RIR may not be one of the standard chip values
  // (e.g. "2-3"), which previously matched nothing and left every chip
  // unselected. Insert it into the option list, in its correct numeric
  // position, so it's always present and can be defaulted-selected.
  const rirOptions = (activeRir && !baseRirOptions.includes(activeRir))
    ? insertRirOption(baseRirOptions, activeRir)
    : baseRirOptions;
  const activeTempo = isEditingSet ? String(editingSet.tempo || '') : String(rx.tempo || '');
  const activeTempoParts = activeTempo.split('-');

  const setNum = setsTarget > 0 ? Math.min(completedForCurrent + 1, setsTarget) : (completedForCurrent + 1);
  const setLabel = setsTarget > 0
    ? 'Set ' + setNum + ' of ' + setsTarget + (setsComplete ? ' ✓' : '')
    : 'Set ' + setNum;
  const setBadge = setsTarget > 0
    ? (setsComplete ? setsTarget + '/' + setsTarget + ' ✓' : setNum + '/' + setsTarget)
    : String(setNum);

  root.innerHTML = `
    <div class="log-shell">
      <header class="active-session compact-bar">
        <div class="bar-title-wrap">
          <h1 class="bar-title">${esc(rx.exerciseName || 'Choose exercise')}${rx.optional ? ' <span class="badge" style="font-size:11px;padding:2px 6px;background:#334155;border-radius:4px;color:#94a3b8;vertical-align:middle;margin-left:6px">OPTIONAL</span>' : ''}</h1>
          <span class="bar-badge">${esc(setBadge)}</span>
        </div>
        <div class="session-tools">
          <button class="primary mini" id="finish">Finish</button>
          <button class="danger mini" id="discard">Discard</button>
        </div>
      </header>

      ${restBannerMarkup()}

      <article class="card set-entry-card">
        <div class="rx-head">
          <span class="rx-badge">${esc(setLabel)}</span>
          <span class="rx-line">${esc(summary)}</span>
        </div>
        <div class="set-form">
          <label class="field">Load<input id="load" class="input" inputmode="decimal" value="${esc(isEditingSet ? editingLoad : loadVal)}" placeholder="0"></label>
          <label class="field">${rx.timed ? 'Duration' : 'Reps'}<input id="result" class="input" inputmode="text" value="${esc(isEditingSet ? (editingSet.reps || editingSet.result || '') : repsVal)}" placeholder="${rx.timed ? '60 sec' : '0'}"></label>
          <div class="field full">RIR<div class="rir-chips">${rirOptions.map(x => `<button class="chip ${activeRir === x ? 'active' : ''}" data-rir="${x}">${x}</button>`).join('')}</div></div>
          <div class="field full">Tempo<div class="tempo"><input id="tempoE" class="input" value="${esc((isEditingSet ? activeTempoParts[0] : tempoParts[0]) || '')}" placeholder="E"><input id="tempoP" class="input" value="${esc((isEditingSet ? activeTempoParts[1] : tempoParts[1]) || '')}" placeholder="P"><input id="tempoC" class="input" value="${esc((isEditingSet ? activeTempoParts[2] : tempoParts[2]) || '')}" placeholder="C"></div></div>
        </div>
        <div class="actions">
          <button class="primary" id="addSet">${isEditingSet ? `Update Set #${state.editingSetIndex + 1}` : 'Add set'}</button>
          ${isEditingSet ? '<button class="secondary btn-delete-set" id="deleteSet" type="button">Delete Set</button>' : ''}
          ${showNext ? `<button class="primary next-exercise" id="nextExercise">Next: ${esc(nextName)} &rarr;</button>` : ''}
          ${!showNext && setsComplete ? '<button class="primary" id="finishDone">Finish workout</button>' : ''}
        </div>
      </article>

      <article class="card session-log">
        <div class="card-head"><div><h2>Sets</h2>${completedForCurrent} of ${setsTarget || '&mdash;'} completed</div></div>
        ${typeof logMarkup === 'function' ? logMarkup() : ''}
      </article>

      <details class="card collapsible"><summary>Notes &amp; coach questions</summary>
        <div class="set-form" style="margin-top:11px">
          <label class="field full">Set note<textarea id="note" placeholder="Substitution or technique note"></textarea></label>
          <label class="field full">Questions for Coach<textarea data-context="coachQuestions">${esc(active.coachQuestions || '')}</textarea></label>
        </div>
      </details>

      <details class="card collapsible"><summary>Switch exercise</summary>
        <div style="display:flex;gap:8px;margin-top:10px">
          <input id="searchExercise" class="input" placeholder="Search known exercises" style="flex:1">
          <button type="button" class="secondary" id="browseExerciseLibrary" style="white-space:nowrap">Browse library</button>
        </div>
        <div id="exercisePicker" class="picker-list" style="margin-top:8px"></div>
      </details>
    </div>
  `;

  if (typeof renderPicker === 'function') renderPicker();
  if (typeof bindLog === 'function') bindLog();
  if (typeof bindSessionContext === 'function') bindSessionContext();
}

/* ---------- single bindReview (keep only this one) ---------- */
function bindReview(session) {
  const reviewQuestions = $('#reviewQuestions');
  if (reviewQuestions) {
    reviewQuestions.oninput = () => {
      const all = getDone();
      const item = all.find(x => x.id === session.id);
      if (!item) return;
      item.coachQuestions = reviewQuestions.value;
      saveDone(all);
    };
  }

  const undoFinishBtn = $('#undoFinish');
  if (undoFinishBtn) {
    undoFinishBtn.onclick = () => {
      restoreStagedSession(session.id);
    };
  }

  const copyDebriefBtn = $('#copyDebrief');
  if (copyDebriefBtn) {
    copyDebriefBtn.onclick = async () => {
      const reviewQuestionsEl = $('#reviewQuestions');
      const questions = reviewQuestionsEl && typeof reviewQuestionsEl.value === 'string'
        ? reviewQuestionsEl.value
        : (session.coachQuestions || '');

      const payload = {
        ...session,
        coachQuestions: questions
      };

      await copy(debrief(payload));

      const all = getDone();
      const item = all.find(x => x.id === session.id);
      if (item) {
        item.coachQuestions = questions;
        if (item.status === 'staged') item.status = 'shared';
        saveDone(all);
      }

      renderReview();
    };
  }

  const exportCsvBtn = $('#exportCsv');
  if (exportCsvBtn) {
    exportCsvBtn.onclick = () => {
      const reviewQuestionsEl = $('#reviewQuestions');
      const questions = reviewQuestionsEl && typeof reviewQuestionsEl.value === 'string'
        ? reviewQuestionsEl.value
        : (session.coachQuestions || '');

      download(
        `momentum-${dateIso(session.completedAt)}.csv`,
        'text/csv;charset=utf-8',
        csv({
          ...session,
          coachQuestions: questions
        })
      );
    };
  }

  const syncSessionBtn = $('#syncSessionCloud');
  if (syncSessionBtn) {
    syncSessionBtn.onclick = () => {
      if (window.MomentumSync && typeof MomentumSync.pushSession === 'function') {
        const reviewQuestionsEl = $('#reviewQuestions');
        const questions = reviewQuestionsEl && typeof reviewQuestionsEl.value === 'string'
          ? reviewQuestionsEl.value
          : (session.coachQuestions || '');
        MomentumSync.pushSession({
          ...session,
          coachQuestions: questions
        });
      }
    };
  }

  const markCompleteBtn = $('#markComplete');
  if (markCompleteBtn) {
    markCompleteBtn.onclick = () => {
      const all = getDone();
      const item = all.find(x => x.id === session.id);
      if (!item) return;
      item.status = 'complete';
      saveDone(all);
      toast('Review marked complete');
      renderReview();
      renderHistory();
      renderHome();
    };
  }

  const reopenReviewBtn = $('#reopenReview');
  if (reopenReviewBtn) {
    reopenReviewBtn.onclick = () => {
      const all = getDone();
      const item = all.find(x => x.id === session.id);
      if (!item) return;
      item.status = 'shared';
      saveDone(all);
      toast('Review reopened');
      renderReview();
      renderHistory();
      renderHome();
    };
  }
}

/* ---------- renderReview ---------- */
function renderReview() {
  const root = $('#review');
  if (!root) return;

  const all = getDone();
  const sessions = all.filter(s => s.status !== 'complete');
  if (!selectedReviewId && sessions[0]) selectedReviewId = sessions[0].id;
  const selected = all.find(x => x.id === selectedReviewId) || sessions[0] || null;

  root.innerHTML = `
    <div class="review-grid">
      <aside class="card">
        <div class="eyebrow">Review queue</div>
        <h2 style="margin-top:6px">Saved sessions</h2>
        <div style="margin-top:12px">
          ${
            sessions.length
              ? sessions.map(s => `
                <button class="session-item ${s.id === selected?.id ? 'active' : ''}" data-review="${s.id}">
                  <b>${esc(s.workoutName)}</b>
                  <small class="quiet">${dateText(s.completedAt)} · ${s.sets.length} sets · ${s.status === 'shared' ? 'Debrief copied' : 'Needs review'}</small>
                </button>
              `).join('')
              : '<div class="empty">Sessions awaiting review appear here.</div>'
          }
        </div>
      </aside>

      <section class="card">
        ${selected ? reviewDetail(selected) : '<div class="empty">Select a saved session to review or export.</div>'}
      </section>
    </div>
  `;

  $$('[data-review]').forEach(b => b.onclick = () => {
    selectedReviewId = b.dataset.review;
    renderReview();
  });

  if (selected) bindReview(selected);
}
/* -----------renderHistory---------------- */

function renderHistory() {
  const root = $('#history');
  if (!root) return;

  const sessions = getDone()
    .slice()
    .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));

  root.innerHTML = `
    <div class="card section">
      <div class="eyebrow">History</div>
      <h2 style="margin-top:6px">Completed workouts</h2>
      <p class="quiet">${sessions.length} finished session${sessions.length === 1 ? '' : 's'} on this device. Tap one to reopen its review.</p>
      <div class="stack" style="margin-top:14px">
        ${
          sessions.length
            ? sessions.map(s => `
              <button class="session-item" data-history="${s.id}">
                <b>${esc(s.workoutName || 'Workout')}</b>
                <small class="quiet">${dateText(s.completedAt)} · ${s.sets.length} set${s.sets.length === 1 ? '' : 's'} · ${s.status === 'complete' ? 'Reviewed' : (s.status === 'shared' ? 'Debrief copied' : 'Needs review')}</small>
              </button>
            `).join('')
            : '<div class="empty">Finished workouts will appear here once you complete one.</div>'
        }
      </div>
    </div>
  `;

  $$('[data-history]').forEach(b => b.onclick = () => {
    selectedReviewId = b.dataset.history;
    renderReview();
    show('review');
  });
}




async function syncExerciseCatalog() {
  try {
    // Use the real token accessor (sync.js) instead of a hardcoded key —
    // the original doc read 'bulldog_sanctum_token', which does not exist;
    // your actual key is 'momentum_sanctum_token' via MomentumSync.getToken().
    const token = (typeof MomentumSync !== 'undefined' && typeof MomentumSync.getToken === 'function')
      ? MomentumSync.getToken()
      : '';
 
    if (navigator.onLine && token) {
      // Build off API_BASE_URL (defined in sync.js) so this respects the
      // momentum_api_url local override, same as every other sync call.
      const res = await fetch(`${API_BASE_URL}/exercises`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data)) {
          localStorage.setItem('momentum_exercise_catalog', JSON.stringify(json.data));
          console.log(`Momentum: Exercise catalog synced (${json.data.length} exercises cached)`);
        }
      }
    }
  } catch (e) {
    console.warn('Momentum: Exercise catalog sync skipped (offline or unauthenticated)', e);
  }
}

// --- Exercise Picker Modal Engine ---
let activePickerCallback = null;
 
function openExercisePickerModal(onSelectCallback) {
  activePickerCallback = onSelectCallback;
  const modal = document.getElementById('exercisePickerModal');
  const searchInput = document.getElementById('modalExerciseSearch');
  if (searchInput) searchInput.value = '';
 
  renderModalExerciseList();
  if (modal) modal.classList.remove('hidden');
 
  const cancelBtn = document.getElementById('modalExerciseCancelBtn');
  if (cancelBtn) cancelBtn.onclick = closeExercisePickerModal;
 
  const customBtn = document.getElementById('modalCustomExerciseBtn');
  if (customBtn) customBtn.onclick = selectCustomExerciseModal;
 
  if (searchInput) searchInput.oninput = filterModalExercises;
}
 
function closeExercisePickerModal() {
  const modal = document.getElementById('exercisePickerModal');
  if (modal) modal.classList.add('hidden');
  activePickerCallback = null;
}
 
function renderModalExerciseList(query = '') {
  const container = document.getElementById('modalExerciseList');
  if (!container) return;
 
  let catalog = [];
  try {
    const cached = localStorage.getItem('momentum_exercise_catalog');
    catalog = cached ? JSON.parse(cached) : [];
  } catch (e) {
    catalog = [];
  }
 
  // Fallback to allExercises() if the catalog cache isn't populated yet
  // (first load, offline, or not yet authenticated).
  if (!Array.isArray(catalog) || !catalog.length) {
    catalog = (typeof allExercises === 'function' ? allExercises() : []).map(name => ({
      canonical_name: name,
      exercise_category: 'Library'
    }));
  }
 
  const q = query.toLowerCase().trim();
  const filtered = catalog.filter(ex => (ex.canonical_name || '').toLowerCase().includes(q));
 
  if (!filtered.length) {
    container.innerHTML = '<div class="empty">No matching exercises found.</div>';
    return;
  }
 
  const grouped = filtered.reduce((acc, ex) => {
    const cat = ex.exercise_category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ex);
    return acc;
  }, {});
 
  container.innerHTML = Object.keys(grouped).sort().map(category => `
    <div class="eyebrow" style="margin-top:14px">${esc(category)}</div>
    <div class="stack" style="margin-top:6px">
      ${grouped[category].map(ex => `
        <button type="button" class="pick" data-modal-select="${esc(ex.canonical_name)}">
          <b>${esc(ex.canonical_name)}</b>
        </button>
      `).join('')}
    </div>
  `).join('');
 
  container.querySelectorAll('[data-modal-select]').forEach(btn => {
    btn.onclick = () => selectExerciseFromModal(btn.dataset.modalSelect);
  });
}
 
function filterModalExercises() {
  const query = document.getElementById('modalExerciseSearch')?.value || '';
  renderModalExerciseList(query);
}
 
function selectExerciseFromModal(name) {
  if (typeof activePickerCallback === 'function') {
    activePickerCallback(name);
  }
  closeExercisePickerModal();
}
 
function selectCustomExerciseModal() {
  // NOTE: native prompt() is a placeholder for parity with the original spec.
  // It breaks the app's own toast/inline-validation/skeleton-state standards
  // (no styling, blocks the main thread, poor mobile keyboard behavior).
  // Flag for a follow-up patch: swap for an inline text field inside this
  // modal instead. Not blocking — ship as-is if you want it working today.
  const customName = prompt('Enter custom exercise name:');
  if (customName && customName.trim()) {
    selectExerciseFromModal(customName.trim());
  }
}

/* ---------- startup / bootstrap ---------- */
// Render every section once, then reveal the restored view. Each render is
// isolated so a failure in one section cannot prevent the others from drawing.
function bootstrap() {
  const renders = [
    ['renderHome', renderHome],
    ['renderToday', renderToday],
    ['renderLog', renderLog],
    ['renderReview', renderReview],
    ['renderHistory', renderHistory],
  ];
  for (const [name, fn] of renders) {
    try {
      if (typeof fn === 'function') fn();
    } catch (e) {
      console.error('Momentum: ' + name + ' failed', e);
    }
  }
  if (typeof syncExerciseCatalog === 'function') syncExerciseCatalog();
  try {
    if (typeof show === 'function') {
      show(typeof restoreCurrentView === 'function' ? restoreCurrentView() : 'today');
    }
  } catch (e) {
    console.error('Momentum: show failed', e);
  }

  const gearBtn = document.getElementById('openProfileSettings');
  if (gearBtn) gearBtn.onclick = () => openProfileModal('settings');
  const profileCloseBtn = document.getElementById('profileModalClose');
  if (profileCloseBtn) profileCloseBtn.onclick = () => closeProfileModal();

  if (profile.onboardingStatus === 'not_started') {
    openProfileModal('onboarding');
  }
}

// Preserve the original window.load timing for dependencies that may only be
// ready by then — but if the load event has already fired (script included
// late, async-after-load, or dynamically injected), bootstrap immediately.
let bootstrapStarted = false;
function startBootstrap() {
  if (bootstrapStarted) return;
  bootstrapStarted = true;
  bootstrap();
}

if (document.readyState === 'complete') {
  startBootstrap();
} else {
  window.addEventListener('load', startBootstrap, { once: true });
}

/* ---------- unload persistence ---------- */
window.addEventListener('beforeunload', () => {
  if (typeof persist === 'function') persist();
});

window.addEventListener('pagehide', () => {
  if (typeof persist === 'function') persist();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && typeof persist === 'function') {
    persist();
  }
});

/* =========================
   MISSING CORE FUNCTIONS
   app.js references these helpers but none are defined in app.js / planner.js.
   Each is assigned only if not already present, so existing definitions in
   data.js / workout-cards.js always win and we only fill the gaps.
   ========================= */
(function () {
  const has = name => typeof window[name] === 'function';
  const uid = (prefix = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  if (!has('momentumUid')) window.momentumUid = function momentumUid(prefix) { return uid(prefix); };

  // Deep-clone helper. planner.js keeps its own private `clone` inside the IIFE;
  // app.js references a bare global `clone` when opening the editor, so expose
  // one to avoid the "Editor is unavailable right now" guard firing.
  if (!has('clone')) {
    window.clone = function clone(value) { return JSON.parse(JSON.stringify(value)); };
  }

  if (!has('toast')) {
    window.toast = function toast(msg) {
      const el = document.getElementById('toast');
      if (!el) return;
      el.textContent = msg == null ? '' : String(msg);
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
      clearTimeout(toast._t);
      toast._t = setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(10px)';
      }, 2200);
    };
  }

  if (!has('clock')) {
    window.clock = function clock(total) {
      const s = Math.max(0, Math.floor(Number(total) || 0));
      const pad = n => String(n).padStart(2, '0');
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
    };
  }

  if (!has('dateIso')) {
    window.dateIso = function dateIso(value) {
      const d = value ? new Date(value) : new Date();
      if (isNaN(d)) return '';
      return d.toISOString().slice(0, 10);
    };
  }
  if (!has('dateText')) {
    window.dateText = function dateText(value) {
      const d = value ? new Date(value) : new Date();
      if (isNaN(d)) return '';
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };
  }

  if (!has('canonicalExerciseName')) {
    window.canonicalExerciseName = function canonicalExerciseName(name) {
      return String(name == null ? '' : name).trim().replace(/\s+/g, ' ');
    };
  }

  if (!has('normalizeNumericEntry')) {
    window.normalizeNumericEntry = function normalizeNumericEntry(value, isLoad) {
      const raw = String(value == null ? '' : value).trim();
      if (!raw) return '';
      // Preserve the prescribed value as-entered. Loads like "50 lb total, 25/arm"
      // and descriptors like "conservative load" are legitimate, so we only
      // collapse runs of whitespace — never strip punctuation or slashes.
      return raw.replace(/\s+/g, ' ').trim();
    };
  }

  if (!has('newWorkoutShell')) {
    window.newWorkoutShell = function newWorkoutShell(source) {
      if (typeof MomentumPlanner !== 'undefined' && typeof MomentumPlanner.blankWorkout === 'function') {
        const w = MomentumPlanner.blankWorkout();
        w.sourceType = source || 'manual';
        return w;
      }
      return {
        id: uid('plan'), title: 'Untitled workout', subtitle: '', scheduledDate: '',
        phaseId: '', week: '', day: '', sourceType: source || 'manual', sourceRawText: '',
        status: 'queued', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        exerciseBlocks: []
      };
    };
  }

  if (!has('basePlan')) {
    window.basePlan = function basePlan() { return newWorkoutShell('reference'); };
  }

  if (!has('newSession')) {
    window.newSession = function newSession(plan) {
      const now = new Date().toISOString();
      const session = fallbackSession();
      session.id = uid('session');
      session.startedAt = now;
      session.updatedAt = now;
      if (plan) {
        session.status = 'active';
        session.planId = plan.id || '';
        session.plannedWorkout = plan;
        session.phase = plan.phaseId || '';
        session.week = plan.week || '';
        session.day = plan.day || '';
        session.workoutName = plan.title || 'Planned workout';
        session.activeExercise = (Array.isArray(plan.exerciseBlocks) && plan.exerciseBlocks[0] && plan.exerciseBlocks[0].exerciseName) || '';
        if (typeof MomentumPlanner !== 'undefined' && typeof MomentumPlanner.buildCockpitWorkout === 'function') {
          state.cockpit = MomentumPlanner.buildCockpitWorkout(plan);
        }
      }
      return session;
    };
  }

if (!has('allExercises')) {
  window.allExercises = function allExercises() {
    const names = new Set();
    const add = b => { if (b && b.exerciseName) names.add(String(b.exerciseName).trim()); };
 
    // Canonical DB catalog (kept fresh by syncExerciseCatalog) is the
    // standardization source of truth — ADR-001 / Exercise Standardization.
    // A corrupt or missing cache must never block the picker.
    try {
      const cached = localStorage.getItem('momentum_exercise_catalog');
      const catalog = cached ? JSON.parse(cached) : null;
      if (Array.isArray(catalog)) {
        catalog.forEach(ex => {
          if (ex && ex.canonical_name) names.add(String(ex.canonical_name).trim());
        });
      }
    } catch (e) {
      // fall through to local sources below
    }
 
    const cards = (typeof starterCards === 'function') ? starterCards() : [];
    cards.forEach(c => (Array.isArray(c.exerciseBlocks) ? c.exerciseBlocks : []).forEach(add));
    if (typeof MomentumPlanner !== 'undefined' && typeof MomentumPlanner.load === 'function') {
      MomentumPlanner.load().forEach(p => (Array.isArray(p.exerciseBlocks) ? p.exerciseBlocks : []).forEach(add));
    }
    if (state.cockpit && Array.isArray(state.cockpit.exercises)) {
      state.cockpit.exercises.forEach(add);
    }
    return [...names].filter(Boolean).sort();
  };
}

  if (!has('plannerTeachingCopy')) {
    window.plannerTeachingCopy = function plannerTeachingCopy(editor) {
      return {
        tempoLabel: 'Tempo (eccentric · pause · concentric)',
        tempoExample: 'Example: 3-1-2 = lower 3s, pause 1s, lift 2s',
        rirLine: 'RIR (Reps in Reserve)',
        scienceLine: 'RIR helps autoregulate load as fatigue changes.'
      };
    };
  }

  // Editable exercise block for the Workout Builder. Inputs carry data-block +
  // data-field so renderEditor's existing handlers keep them in sync.
  if (!has('builderBlock')) {
    window.builderBlock = function builderBlock(block, index) {
      block = block || { id: uid('block'), exerciseName: '' };
      if (!block.id) block.id = uid('block');
      const bid = esc(block.id);
      const input = (field, label, attrs = '') =>
        `<label class="field">${esc(label)}<input class="input" data-block="${bid}" data-field="${esc(field)}" value="${esc(block[field] ?? '')}" ${attrs}></label>`;
      const area = (field, label) =>
        `<label class="field full">${esc(label)}<textarea data-block="${bid}" data-field="${esc(field)}">${esc(block[field] ?? '')}</textarea></label>`;
      return `<div class="exercise-card" data-block-card="${bid}">
        <div class="card-head"><div><div class="eyebrow">Exercise ${index + 1}</div><h2 style="margin-top:4px">${esc(block.exerciseName || 'Untitled exercise')}</h2></div></div>
        <div class="set-form" style="margin-top:10px">
         <label class="field full">Exercise name
            <div style="display:flex;gap:8px;align-items:center">
              <input class="input" data-block="${bid}" data-field="exerciseName" value="${esc(block.exerciseName ?? '')}" style="flex:1">
              <button type="button" class="secondary" data-browse-exercise="${bid}" style="white-space:nowrap">Browse</button>
            </div>
          </label>
          ${input('targetSets', 'Target sets', 'inputmode="numeric"')}
          ${input('targetRepsOrDuration', 'Reps / duration')}
          ${input('targetWeightOrLoad', 'Load (lbs)', 'inputmode="decimal"')}
          ${input('tempo', 'Tempo')}
          ${input('rir', 'RIR')}
          ${input('rest', 'Rest')}
          ${area('notes', 'Notes')}
          ${area('checkpoints', 'Technical checkpoint')}
        </div>
        <div class="actions"><button class="danger" data-remove-block="${bid}">Remove exercise</button></div>
      </div>`;
    };
  }

  // Preview a starter card in the planner editor with a "Use this card" action.
  if (!has('renderStarterPreview')) {
    window.renderStarterPreview = function renderStarterPreview(key) {
      const root = $('#plannerEditor');
      if (!root) return;
      const cards = (typeof starterCards === 'function') ? starterCards() : [];
      const card = cards.find(c => c && c.key === key);
      if (!card) {
        root.innerHTML = '<div class="empty">That starter card could not be found.</div>';
        return;
      }
      const blocks = Array.isArray(card.exerciseBlocks) ? card.exerciseBlocks : [];
      root.innerHTML = `
        <article class="card">
          <div class="eyebrow">Starter card preview</div>
          <h2 style="margin-top:6px">${esc(card.title)}</h2>
          <p class="quiet">${esc(card.descriptor || '')} · ${esc(card.equipment || '—')} · ${esc(card.duration || '—')}</p>
          <div class="workout-card" style="margin-top:12px">
            ${blocks.length ? blocks.map((b, i) => `
              <div class="exercise-card">
                <div class="exercise-title"><b>${esc(b.exerciseName || ('Exercise ' + (i + 1)))}</b></div>
                <div class="quiet">${esc([b.targetSets && (b.targetSets + ' sets'), b.targetRepsOrDuration, b.targetWeightOrLoad && (b.targetWeightOrLoad + ' lbs'), b.tempo && ('Tempo ' + b.tempo), b.rir && ('RIR ' + b.rir)].filter(Boolean).join(' · ') || 'No target')}</div>
              </div>`).join('') : '<div class="empty">No exercises in this card.</div>'}
          </div>
          <div class="actions" style="margin-top:14px">
            <button class="primary" id="useStarterCard">Use this card</button>
            <button class="secondary" id="cancelStarterPreview">Cancel</button>
          </div>
        </article>`;

      const use = $('#useStarterCard');
      if (use) use.onclick = () => {
        const workout = newWorkoutShell('starter');
        workout.title = card.title || 'Starter workout';
        workout.subtitle = card.descriptor || '';
        workout.sourceType = 'starter';
        const mkBlock = (i) => {
          const base = (typeof MomentumPlanner !== 'undefined' && typeof MomentumPlanner.blankBlock === 'function')
            ? MomentumPlanner.blankBlock(i + 1) : { id: uid('block'), order: i + 1, exerciseName: '' };
          const src = blocks[i] || {};
          return { ...base, ...src, id: uid('block') };
        };
        workout.exerciseBlocks = blocks.map((_, i) => mkBlock(i));
        if (typeof MomentumPlanner !== 'undefined' && typeof MomentumPlanner.upsert === 'function') {
          MomentumPlanner.upsert(workout);
        }
        editor = null;
        starterPreviewKey = null;
        if (typeof renderToday === 'function') renderToday();
        if (typeof renderHome === 'function') renderHome();
        if (typeof toast === 'function') toast('Starter card added to queue');
      };
      const cancel = $('#cancelStarterPreview');
      if (cancel) cancel.onclick = () => { editor = null; starterPreviewKey = null; root.innerHTML = ''; };
    };
  }

  if (!has('debrief')) {
    window.debrief = function debrief(session) {
      const sets = Array.isArray(session.sets) ? session.sets : [];
      const title = session.canonicalTitle || session.workoutName || 'Workout';
      const lines = [
        `Workout: ${title}`,
        `Date: ${dateText(session.completedAt || session.startedAt)}`,
        `Sets: ${sets.length}`
      ];
      if (session.coachQuestions) lines.push(`Questions for Coach: ${session.coachQuestions}`);
      lines.push('');
      sets.forEach((s, i) => {
        const exName = s.exerciseName || s.exercise || '—';
        const loadStr = (s.load && s.load !== '0' && s.load !== 0) ? `${s.load} lbs` : '';
        const rawReps = String(s.reps || s.result || '').trim();
        const repsClean = rawReps.replace(/\s*reps?$/i, '').trim();
        const isTimed = s.timed || /\b(sec|min|s|m)\b/i.test(rawReps) || (typeof isTimedExercise === 'function' && isTimedExercise(exName, rawReps));

        let perf = '';
        if (loadStr && repsClean) {
          perf = isTimed ? `${loadStr} | ${repsClean}` : `${loadStr} × ${repsClean} reps`;
        } else if (repsClean) {
          perf = isTimed ? repsClean : `${repsClean} reps`;
        } else if (loadStr) {
          perf = loadStr;
        }

        const tags = [];
        if (s.tempo) tags.push(`Tempo ${s.tempo}`);
        if (s.rir) tags.push(`RIR ${s.rir}`);
        const tagStr = tags.length ? ` (${tags.join(' | ')})` : '';
        const noteStr = s.notes ? ` — ${s.notes}` : '';

        lines.push(`Set ${i + 1}: ${exName}${perf ? ' — ' + perf : ''}${tagStr}${noteStr}`);
      });
      return lines.join('\n');
    };
  }

  if (!has('csv')) {
    window.csv = function csv(session) {
      const sets = Array.isArray(session.sets) ? session.sets : [];
      const header = ['Set', 'Section', 'Exercise', 'Load', 'Reps_Or_Duration', 'Is_Timed', 'Tempo', 'RIR', 'Rest', 'Notes'];
      const rows = sets.map((s, i) => {
        const exName = s.exerciseName || s.exercise || '';
        const reps = s.reps || s.result || '';
        const isTimed = s.timed || /\b(sec|min|s|m)\b/i.test(reps) || (typeof isTimedExercise === 'function' && isTimedExercise(exName, reps));
        const section = s.section || (s.optional ? 'Optional' : (/warm-?up|preparation/i.test(exName) ? 'Warm-Up' : 'Primary'));
        return [
          i + 1,
          section,
          exName,
          s.load || '',
          reps,
          isTimed ? 'true' : 'false',
          s.tempo || '',
          s.rir || '',
          s.rest || '',
          s.notes || ''
        ];
      });
      const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
      return [header, ...rows].map(r => r.map(q).join(',')).join('\n');
    };
  }

  if (!has('copy')) {
    window.copy = async function copy(text) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(String(text));
        } else {
          const ta = document.createElement('textarea');
          ta.value = String(text);
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
        }
      } catch (_) { /* ignore */ }
    };
  }

  if (!has('download')) {
    window.download = function download(filename, mime, content) {
      const blob = new Blob([content], { type: (mime || 'text/plain') });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'download';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 120);
    };
  }

  if (!has('reviewDetail')) {
    window.reviewDetail = function reviewDetail(session) {
      if (!session) return '<div class="empty">No session selected.</div>';
      const sets = Array.isArray(session.sets) ? session.sets : [];
      const title = session.canonicalTitle || session.workoutName || 'Workout';
      return `
        <div class="card-head"><div><div class="eyebrow">Review</div><h2 style="margin-top:6px">${esc(title)}</h2></div>${esc(session.status || '')}</div>
        <p class="quiet">${dateText(session.completedAt)} · ${sets.length} set${sets.length === 1 ? '' : 's'}</p>
        <div class="stack" style="margin-top:12px">
          ${sets.length ? sets.map((s, i) => {
            const exName = s.exerciseName || s.exercise || '';
            const reps = s.reps || s.result || '';
            const isTimed = s.timed || /\b(sec|min|s|m)\b/i.test(reps) || (typeof isTimedExercise === 'function' && isTimedExercise(exName, reps));
            const perf = [
              s.load && (s.load + ' lbs'),
              reps && (isTimed ? reps : (reps + ' reps')),
              s.tempo && ('Tempo ' + s.tempo),
              s.rir && ('RIR ' + s.rir)
            ].filter(Boolean).join(' · ') || '—';
            return `
            <div class="exercise-card">
              <div class="exercise-title">
                <b>Set ${i + 1}</b>
                <span class="quiet">${esc(exName)}</span>
                ${s.optional ? '<span class="badge badge-optional" style="font-size:10px;padding:2px 6px;background:#334155;border-radius:4px;color:#94a3b8;margin-left:6px">OPTIONAL</span>' : ''}
              </div>
              <div class="quiet">${esc(perf)}</div>
              ${s.notes ? `<div class="quiet" style="margin-top:4px;font-style:italic">${esc(s.notes)}</div>` : ''}
            </div>`;
          }).join('') : '<div class="empty">No sets logged.</div>'}
        </div>
        <div class="set-form" style="margin-top:14px">
          <label class="field full">Questions for Coach<textarea id="reviewQuestions">${esc(session.coachQuestions || '')}</textarea></label>
        </div>
        <div class="actions" style="margin-top:12px">
          ${session.status === 'complete' ? '<button class="secondary" id="reopenReview">Reopen review</button>' : '<button class="primary" id="markComplete">Mark complete</button>'}
          <button class="primary" id="syncSessionCloud">Sync to Statbook</button>
          <button class="secondary" id="copyDebrief">Copy debrief</button>
          <button class="secondary" id="exportCsv">Export CSV</button>
          ${session.status === 'staged' ? '<button class="secondary" id="undoFinish">Undo finish</button>' : ''}
        </div>`;
    };
  }

  // Log screen handlers: add/duplicate set, finish, discard, rir chips, search.
  if (!has('bindLog')) {
    window.bindLog = function bindLog() {
      const addSet = $('#addSet');
      if (addSet) addSet.onclick = () => {
        const session = ensureActiveSession();
        const loadEl = $('#load');
        const resultEl = $('#result');
        const load = loadEl ? loadEl.value.trim() : '';
        const reps = resultEl ? resultEl.value.trim() : '';
        if (!load && !reps) { if (typeof toast === 'function') toast('Enter a load or rep count'); return; }
        const block = (typeof activeBlock === 'function' ? activeBlock() : null) || {};
        const rx = (typeof prescriptionOf === 'function') ? prescriptionOf(block) : block;
        const te = $('#tempoE'), tp = $('#tempoP'), tc = $('#tempoC');
        const tempoInput = [te, tp, tc].map(el => el ? el.value.trim() : '').filter(Boolean).join('-');
        const tempo = tempoInput || rx.tempo || rx.prescribedTempo || '';
        const rirChip = $('[data-rir].active');
        const rir = rirChip ? rirChip.dataset.rir : (rx.rir || rx.prescribedRir || '');
        const rest = rx.rest || rx.prescribedRest || '';
        const noteEl = $('#note');
        const exerciseName = block.exerciseName || session.activeExercise || '';
        const isOpt = block.optional || rx.optional || false;
        const isTimed = block.timed || rx.timed || (typeof isTimedExercise === 'function' && isTimedExercise(exerciseName, reps));
        const section = block.section || rx.section || (isOpt ? 'optional' : (/warm-?up|preparation/i.test(exerciseName) ? 'warmup' : 'primary'));

        session.sets = Array.isArray(session.sets) ? session.sets : [];
        const editingIndex = Number.isInteger(state.editingSetIndex) ? state.editingSetIndex : null;
        const setRecord = {
          exerciseName, exercise: exerciseName,
          load, weight_lbs: load, result: reps, reps,
          tempo, rir, rest,
          set_number: (editingIndex !== null ? (session.sets[editingIndex]?.set_number || editingIndex + 1) : session.sets.filter(set => (set.exerciseName || set.exercise) === exerciseName).length + 1),
          optional: isOpt,
          timed: isTimed,
          section,
          notes: noteEl ? noteEl.value.trim() : '',
          loggedAt: new Date().toISOString()
        };
        if (editingIndex !== null && session.sets[editingIndex]) {
          session.sets[editingIndex] = { ...session.sets[editingIndex], ...setRecord };
          state.editingSetIndex = null;
        } else {
          session.sets.push(setRecord);
        }
        session.sets
          .filter(set => (set.exerciseName || set.exercise) === exerciseName)
          .forEach((set, index) => { set.set_number = index + 1; });
        // persist the chosen load as the working load so the next set pre-fills with it and exercise switching preserves it
        if (state.cockpit) {
          const ex = Array.isArray(state.cockpit.exercises) ? state.cockpit.exercises : [];
          let idx = ex.findIndex(e => e && (e.exerciseName === exerciseName || (e.exerciseName && exerciseName && e.exerciseName.toLowerCase() === exerciseName.toLowerCase())));
          if (idx < 0 && typeof state.cockpit.exerciseIndex === 'number') idx = state.cockpit.exerciseIndex;
          if (idx >= 0) {
            if (window.MomentumPlanner && typeof MomentumPlanner.setCockpitWorkingLoad === 'function') {
              state.cockpit = MomentumPlanner.setCockpitWorkingLoad(state.cockpit, idx, load);
            }
            if (state.cockpit && Array.isArray(state.cockpit.exercises) && state.cockpit.exercises[idx]) {
              state.cockpit.exercises[idx].workingLoad = load;
            }
          }
        }
        if (session) {
          if (!session.workingLoads || typeof session.workingLoads !== 'object') {
            session.workingLoads = {};
          }
          if (exerciseName) {
            session.workingLoads[exerciseName] = load;
          }
          if (session.plannedWorkout && Array.isArray(session.plannedWorkout.exerciseBlocks)) {
            const pb = session.plannedWorkout.exerciseBlocks.find(b => b && (b.exerciseName === exerciseName || (b.exerciseName && exerciseName && b.exerciseName.toLowerCase() === exerciseName.toLowerCase())));
            if (pb) pb.workingLoad = load;
          }
        }
        if (block && typeof block === 'object') {
          block.workingLoad = load;
        }
        // start the prescribed rest timer
        const restSecs = (typeof restSecondsFromPrescription === 'function') ? restSecondsFromPrescription(rx.rest) : 0;
        state.restTimer = restSecs > 0 ? { total: restSecs, startedAt: Date.now() } : null;
        if (typeof persist === 'function') persist();
        if (typeof renderLog === 'function') renderLog();
        // Compensate for the rest-timer banner shifting the action buttons out of view
        requestAnimationFrame(() => {
          const actionsRow = document.querySelector('.set-entry-card .actions');
          if (actionsRow) actionsRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
      };

      $$('[data-edit-set]').forEach(row => row.onclick = () => {
        const index = Number(row.dataset.editSet);
        const set = active.sets[index];
        if (!set) return;
        state.editingSetIndex = index;
        state.restTimer = null;
        if (typeof renderLog === 'function') renderLog();
      });

      $$('[data-delete-set]').forEach(button => button.onclick = event => {
        event.stopPropagation();
        const session = ensureActiveSession();
        const index = Number(button.dataset.deleteSet);
        if (!Number.isInteger(index) || !session.sets[index]) return;
        const exerciseName = session.sets[index].exerciseName || session.sets[index].exercise;
        session.sets.splice(index, 1);
        session.sets
          .filter(set => (set.exerciseName || set.exercise) === exerciseName)
          .forEach((set, setIndex) => { set.set_number = setIndex + 1; });
        state.editingSetIndex = null;
        if (typeof persist === 'function') persist();
        if (typeof renderLog === 'function') renderLog();
      });

      const deleteSet = $('#deleteSet');
      if (deleteSet) deleteSet.onclick = () => {
        const session = ensureActiveSession();
        const index = Number.isInteger(state.editingSetIndex) ? state.editingSetIndex : -1;
        if (index < 0 || !session.sets[index]) return;
        const exerciseName = session.sets[index].exerciseName || session.sets[index].exercise;
        session.sets.splice(index, 1);
        session.sets
          .filter(set => (set.exerciseName || set.exercise) === exerciseName)
          .forEach((set, setIndex) => { set.set_number = setIndex + 1; });
        state.editingSetIndex = null;
        if (typeof persist === 'function') persist();
        if (typeof renderLog === 'function') renderLog();
      };

      const loadInput = $('#load');
      if (loadInput) loadInput.oninput = () => {
        const session = ensureActiveSession();
        const block = (typeof activeBlock === 'function' ? activeBlock() : null) || {};
        const exerciseName = block.exerciseName || session.activeExercise || '';
        const curLoad = loadInput.value.trim();
        if (state.cockpit) {
          const exercises = Array.isArray(state.cockpit.exercises) ? state.cockpit.exercises : [];
          let index = exercises.findIndex(exercise => exercise && (exercise.exerciseName === exerciseName || (exercise.exerciseName && exerciseName && exercise.exerciseName.toLowerCase() === exerciseName.toLowerCase())));
          if (index < 0 && typeof state.cockpit.exerciseIndex === 'number') index = state.cockpit.exerciseIndex;
          if (index >= 0) {
            if (window.MomentumPlanner && typeof MomentumPlanner.setCockpitWorkingLoad === 'function') {
              state.cockpit = MomentumPlanner.setCockpitWorkingLoad(state.cockpit, index, curLoad);
            }
            if (state.cockpit && Array.isArray(state.cockpit.exercises) && state.cockpit.exercises[index]) {
              state.cockpit.exercises[index].workingLoad = curLoad;
            }
          }
        }
        if (session) {
          if (!session.workingLoads || typeof session.workingLoads !== 'object') {
            session.workingLoads = {};
          }
          if (exerciseName) {
            session.workingLoads[exerciseName] = curLoad;
          }
          if (session.plannedWorkout && Array.isArray(session.plannedWorkout.exerciseBlocks)) {
            const pb = session.plannedWorkout.exerciseBlocks.find(b => b && (b.exerciseName === exerciseName || (b.exerciseName && exerciseName && b.exerciseName.toLowerCase() === exerciseName.toLowerCase())));
            if (pb) pb.workingLoad = curLoad;
          }
        }
        if (block && typeof block === 'object') block.workingLoad = curLoad;
      };

      const dup = $('#duplicateLast');
      if (dup) dup.onclick = () => {
        const session = ensureActiveSession();
        session.sets = Array.isArray(session.sets) ? session.sets : [];
        const last = session.sets[session.sets.length - 1];
        if (!last) { if (typeof toast === 'function') toast('No previous set to duplicate'); return; }
        session.sets.push({ ...last, loggedAt: new Date().toISOString() });
        if (typeof persist === 'function') persist();
        if (typeof renderLog === 'function') renderLog();
      };

      const finish = $('#finish');
      if (finish) finish.onclick = () => {
        const session = ensureActiveSession();
        session.status = 'staged';
        session.completedAt = new Date().toISOString();
        const done = getDone();
        done.unshift(session);
        saveDone(done);
        active = (typeof newSession === 'function') ? newSession() : fallbackSession();
        state.cockpit = null;
        state.cockpitEditOpen = false;
        state.restTimer = null;
        if (typeof persist === 'function') persist();
        if (typeof renderLog === 'function') renderLog();
        if (typeof renderReview === 'function') renderReview();
        if (typeof renderHome === 'function') renderHome();
        if (typeof toast === 'function') toast('Workout finished — moved to Review');
      };

      const discard = $('#discard');
      if (discard) discard.onclick = () => { if (typeof discardActiveWorkout === 'function') discardActiveWorkout(); };

      const nextBtn = $('#nextExercise');
      if (nextBtn) nextBtn.onclick = () => {
        const session = ensureActiveSession();
        const cur = (typeof activeBlock === 'function' ? activeBlock() : null);
        const curName = (cur && cur.exerciseName) || session.activeExercise || '';
        const nx = (typeof nextExerciseNameFor === 'function') ? nextExerciseNameFor(curName) : '';
        if (!nx) { if (typeof toast === 'function') toast('No next exercise'); return; }
        session.activeExercise = nx;
        if (state.cockpit && Array.isArray(state.cockpit.exercises)) {
          const idx = state.cockpit.exercises.findIndex(e => e && e.exerciseName === nx);
          if (idx >= 0) state.cockpit.exerciseIndex = idx;
        }
        state.restTimer = null;
        state.editingSetIndex = null;
        if (typeof persist === 'function') persist();
        if (typeof renderLog === 'function') renderLog();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };

      const finishDone = $('#finishDone');
      if (finishDone) finishDone.onclick = () => { const f = $('#finish'); if (f) f.click(); };

      const skipRest = $('#skipRest');
      if (skipRest) skipRest.onclick = () => {
        state.restTimer = null;
        if (typeof persist === 'function') persist();
        if (typeof renderLog === 'function') renderLog();
      };

      $$('[data-type]').forEach(b => b.onclick = () => {
        $$('[data-type]').forEach(x => x.classList.toggle('active', x === b));
      });

      $$('[data-rir]').forEach(b => b.onclick = () => {
        $$('[data-rir]').forEach(x => x.classList.toggle('active', x === b));
      });

      const search = $('#searchExercise');
      if (search) search.oninput = () => { if (typeof renderPicker === 'function') renderPicker(search.value); };
    };
  }

const browseLibrary = $('#browseExerciseLibrary');
      if (browseLibrary) browseLibrary.onclick = () => {
        openExercisePickerModal(name => {
          active.activeExercise = (typeof canonicalExerciseName === 'function') ? canonicalExerciseName(name) : name;
          persist();
          renderLog();
        });
      };

  function triggerTimerAlert() {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch (e) {}
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {}
  }

  // Live session timer: updates #timer once per second when on the Log view.
  if (!has('_momentumTimerStarted')) {
    window._momentumTimerStarted = true;
    setInterval(() => {
      const el = document.getElementById('timer');
      if (el && active && active.startedAt && typeof window.clock === 'function') {
        const secs = Math.max(0, Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000));
        el.textContent = window.clock(secs);
      }
      // rest-timer tick: countdown from the prescribed rest after a set is logged
      const rt = state && state.restTimer;
      if (rt && rt.startedAt && rt.total) {
        const elapsed = Math.floor((Date.now() - rt.startedAt) / 1000);
        const remaining = rt.total - elapsed;
        const banner = document.getElementById('restBanner');
        const timeEl = document.getElementById('restTime');
        if (remaining <= 0) {
          if (timeEl) timeEl.textContent = '0s';
          triggerTimerAlert();
          if (banner) banner.remove();
          state.restTimer = null;
        } else if (timeEl) {
          timeEl.textContent = remaining + 's';
        }
      }
    }, 1000);
  }

})();