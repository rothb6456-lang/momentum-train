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
  if (!confirm('Discard this active session?')) return;

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
    ? matchingSets.map((set, index) => `
        <div class="exercise-card">
          <div class="exercise-title">
            <b>Set ${index + 1}</b>
            <span class="quiet">
              ${esc(set.reps ?? set.result ?? '—')} reps ·
              ${esc(set.weight ?? set.load ?? '—')} load ·
              ${esc(set.rir ?? '—')} RIR
            </span>
          </div>
          ${set.notes ? `<div class="quiet">${esc(set.notes)}</div>` : ''}
        </div>
      `).join('')
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
      </div>
    `;
  } else {
    $('#home').innerHTML = `
      <div class="hero">
        <article class="card hero-main">
          <div class="eyebrow">Today / command center</div>
          <h1>${hasActiveSession ? 'Your session is in progress.' : 'Know what changed. Capture what matters.'}</h1>
          <p class="quiet">
            ${hasActiveSession
              ? `${activeSetCount} set${activeSetCount === 1 ? '' : 's'} are saved locally on this device.`
              : 'Queue Coach’s next card, execute it on the gym floor, and carry both plan and performance into review.'}
          </p>
          <div class="actions">
            ${hasActiveSession
              ? `<button class="primary" id="homeResumeWorkout">Resume workout</button><button class="secondary" id="homeOpenPlan">Open plan</button>`
              : hasQueuedPlan
                ? `<button class="primary" id="homeStartQueuedWorkout">Start queued workout</button><button class="secondary" id="homeOpenPlan">Open plan</button>`
                : `<button class="primary" id="homeCreatePlan">Create a plan from scratch</button><button class="secondary" id="homePastePlan">Paste plan from outside source</button>`
            }
          </div>
        </article>

        <aside class="card">
          <div class="eyebrow">Next planned workout</div>
          ${
            safeNext
              ? `
                <h2 style="margin-top:8px">${esc(safeNext.title)}</h2>
                <p class="quiet">${esc(planSummary(safeNext))}</p>
                <div class="signal-card">
                  <b>${safeNext.exerciseBlocks.length} planned exercise${safeNext.exerciseBlocks.length === 1 ? '' : 's'}</b>
                  Queued from ${esc(safeNext.sourceType)}. Planned and performed values remain separate.
                </div>
                <div class="actions">
                  <button class="primary" data-start="${safeNext.id}">Start workout</button>
                </div>
              `
              : `
                <h2 style="margin-top:8px">Nothing queued</h2>
                <p class="quiet">Choose a starter card, paste your next Coach card, or create a custom plan.</p>
              `
          }
        </aside>
      </div>

      <section class="metrics">
        ${metric('Historical sessions', m.sessions, 'Markdown source data')}
        ${metric('Historical sets', m.sets.toLocaleString(), 'Loaded training rows')}
        ${metric('Planned workouts', queued().length, safeNext ? 'Next plan ready' : 'Nothing scheduled')}
        ${metric('Completed locally', done.length, done[0] ? dateText(done[0].completedAt) : 'On this device')}
      </section>

      <section class="grid">
        <article class="card">
          <div class="card-head">
            <div><h2>Current cycle</h2>What is queued and what it asks of you next.</div>
            ${safeNext ? esc(safeNext.sourceType || 'queued') : '—'}
          </div>
          <div class="stack">
            ${
              safeNext
                ? `
                  <div class="signal-card">
                    <b>${esc(safeNext.title)}</b>
                    ${esc(planSummary(safeNext))}
                  </div>
                  <div class="today-grid-mini">
                    <div class="metric-card">
                      <div class="quiet">Exercises</div>
                      <b>${safeNext.exerciseBlocks.length}</b>
                    </div>
                    <div class="metric-card">
                      <div class="quiet">Source</div>
                      <b>${esc(safeNext.sourceType || 'manual')}</b>
                    </div>
                  </div>
                `
                : `
                  <div class="empty">No queued workout yet. Use the actions above to choose a card, paste a plan, or build one from scratch.</div>
                `
            }
          </div>
        </article>

        <article class="card">
          <h2>Phase workload</h2>
          <div class="stack">
            ${
              phases.length
                ? phases.map(p => `
                  <div class="bar-row">
                    Phase ${esc(p.phase)}
                    <div class="bar"><i style="width:${(p.sets / max) * 100}%"></i></div>
                    ${p.sets}
                  </div>
                `).join('')
                : '<div class="empty">Historical rows are not currently available.</div>'
            }
          </div>
        </article>

        <article class="card">
          <h2>What matters now</h2>
          <div class="insight"><i class="dot"></i><div><b>Plan → execute → review</b> Every queued workout keeps its raw Coach card and structured exercise blocks alongside actual sets.</div></div>
          <div class="insight"><i class="dot amber"></i><div><b>Questions stay lightweight</b> Session-level notes stay in Questions for Coach, while set-level notes capture specific gym-floor observations.</div></div>
          <div class="insight"><i class="dot"></i><div><b>${esc(m.primary[0])} is the largest loaded category</b> ${Number(m.primary[1]).toLocaleString()} historical training sets are in the current snapshot.</div></div>
        </article>
      </section>
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
        editor = parsed;
        editor.exerciseBlocks = safeBlocks(editor.exerciseBlocks);
        renderEditor('builder');
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
  const plan = safePlan((typeof planForActive === 'function') ? planForActive() : null);
  const plannedContext = active.planId && plan
    ? `
      <article class="card" style="margin-bottom:12px">
        <div class="eyebrow">Planned context</div>
        <b>${esc(plan.title)}</b> · ${esc(planSummary(plan))}
      </article>
    `
    : '';

  root.innerHTML = `
    <div class="log-shell">
      <header class="active-session">
        <div>
          <div class="eyebrow">${active.planId ? 'Planned session · autosaved' : 'Ad hoc session · autosaved'}</div>
          <h1>${esc(active.workoutName || 'Workout in progress')}</h1>
          <div class="quiet" style="margin-top:6px">Session time</div>
          <div id="timer">${
            typeof clock === 'function'
              ? clock(Math.max(0, Math.floor((Date.now() - new Date(active.startedAt || new Date().toISOString())) / 1000)))
              : ''
          }</div>
        </div>
        <div class="session-tools">
          <button class="secondary" id="finish">Finish</button>
          <button class="danger" id="discard">Discard</button>
        </div>
      </header>

      ${plannedContext}

      <div class="logger-layout">
        <aside class="card">
          <div class="card-head"><div><h2>Exercise flow</h2>Planned exercises are pinned first.</div></div>
          <input id="searchExercise" class="input" placeholder="Search known exercises">
          <div id="exercisePicker" class="picker-list"></div>
        </aside>

        <section>
          <article class="card">
            <div class="eyebrow">Set entry</div>
            <h2 style="margin-top:6px">${esc(block.exerciseName || 'Choose exercise')}</h2>
            <p class="quiet">
              ${esc([
                block.targetSets && `${block.targetSets} sets`,
                block.targetRepsOrDuration || block.targetReps,
                block.targetWeightOrLoad && `${block.targetWeightOrLoad} lbs`,
                block.tempo && `Tempo ${block.tempo}`,
                block.rir && `RIR ${block.rir}`
              ].filter(Boolean).join(' · ') || 'No planned target')}
            </p>

            <div class="set-form">
              <label class="field">
                Load (lbs)
                <input
                  id="load"
                  class="input"
                  inputmode="decimal"
                  pattern="[0-9]*[.]?[0-9]*"
                  placeholder="0"
                >
              </label>

              <label class="field">
                Reps
                <input
                  id="result"
                  class="input"
                  inputmode="text"
                  pattern="[0-9]*"
                  placeholder="0"
                >
              </label>

              <div class="field full">
                Result type
                <div class="segment">
                  <button class="secondary active" data-type="reps">Reps</button>
                  <button class="secondary" data-type="duration">Duration</button>
                </div>
              </div>

              <div class="field full">
                Tempo (eccentric · pause · concentric)
                <div class="tempo">
                  <input id="tempoE" class="input" value="${esc((block.tempo || '').split('-')[0] || '')}" placeholder="E">
                  <input id="tempoP" class="input" value="${esc((block.tempo || '').split('-')[1] || '')}" placeholder="P">
                  <input id="tempoC" class="input" value="${esc((block.tempo || '').split('-')[2] || '')}" placeholder="C">
                </div>
              </div>

              <div class="field full">
                RIR
                <div class="rir-chips">
                  ${['0', '0-1', '1', '1-2', '2', '2+', '3+', '4+'].map(x => `<button class="chip ${block.rir === x ? 'active' : ''}" data-rir="${x}">${x}</button>`).join('')}
                </div>
              </div>

              <label class="field full">Technical checkpoint<textarea id="checkpoint" placeholder="Position, path, cue, or execution observation">${esc(block.checkpoints || '')}</textarea></label>
              <label class="field full">Set note<textarea id="note" placeholder="Substitution, technique note, tolerance note, or performance detail"></textarea></label>
            </div>

            <div class="actions">
              <button class="primary" id="addSet">Add completed set</button>
              <button class="secondary" id="duplicateLast">Duplicate previous</button>
            </div>
          </article>

          <article class="card session-log">
            <div class="card-head">
              <div><h2>Live session log</h2>${active.sets.length} completed set${active.sets.length === 1 ? '' : 's'} · saved automatically</div>
              ${new Set((active.sets || []).map(x => x.exercise || x.exerciseName).filter(Boolean)).size} exercises
            </div>
            ${typeof logMarkup === 'function' ? logMarkup() : ''}
          </article>

          <article class="card section">
            <h2>Session context</h2>
            <div class="set-form" style="margin-top:11px">
              <label class="field full">Questions for Coach<textarea data-context="coachQuestions">${esc(active.coachQuestions || '')}</textarea></label>
            </div>
          </article>
        </section>
      </div>
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
}

/* ---------- renderReview ---------- */
function renderReview() {
  const root = $('#review');
  if (!root) return;

  const sessions = getDone();
  if (!selectedReviewId && sessions[0]) selectedReviewId = sessions[0].id;
  const selected = sessions.find(x => x.id === selectedReviewId) || sessions[0] || null;

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
                  <small class="quiet">${dateText(s.completedAt)} · ${s.sets.length} sets · ${esc(s.status)}</small>
                </button>
              `).join('')
              : '<div class="empty">Finished Momentum sessions appear here.</div>'
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

  root.innerHTML = `
    <div class="card section">
      <div class="eyebrow">History</div>
      <h2 style="margin-top:6px">History view</h2>
      <p class="quiet">History is not available yet.</p>
    </div>
  `;
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
  try {
    if (typeof show === 'function') {
      show(typeof restoreCurrentView === 'function' ? restoreCurrentView() : 'today');
    }
  } catch (e) {
    console.error('Momentum: show failed', e);
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
      // keep digits, decimals, ranges, and unit letters; drop the rest
      const cleaned = raw.replace(/[^0-9.\-–\s/a-zA-Z]/g, '').replace(/\s+/g, ' ').trim();
      return cleaned || raw;
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

  if (!has('exerciseDatalistMarkup')) {
    window.exerciseDatalistMarkup = function exerciseDatalistMarkup() {
      const list = (typeof allExercises === 'function') ? allExercises() : [];
      return list.map(name => `<option value="${esc(name)}"></option>`).join('');
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
          ${input('exerciseName', 'Exercise name')}
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
      const lines = [
        `Workout: ${session.workoutName || 'Workout'}`,
        `Date: ${dateText(session.completedAt)}`,
        `Sets: ${sets.length}`
      ];
      if (session.coachQuestions) lines.push(`Questions for Coach: ${session.coachQuestions}`);
      lines.push('');
      sets.forEach((s, i) => {
        lines.push(`Set ${i + 1}: ${s.exerciseName || s.exercise || '—'} — ${s.load || '—'} lbs × ${s.reps || '—'} reps${s.rir ? ' (RIR ' + s.rir + ')' : ''}${s.notes ? ' — ' + s.notes : ''}`);
      });
      return lines.join('\n');
    };
  }

  if (!has('csv')) {
    window.csv = function csv(session) {
      const sets = Array.isArray(session.sets) ? session.sets : [];
      const header = ['Set', 'Exercise', 'Load', 'Reps', 'RIR', 'Notes'];
      const rows = sets.map((s, i) => [i + 1, s.exerciseName || s.exercise || '', s.load || '', s.reps || '', s.rir || '', s.notes || '']);
      const q = v => `"${String(v).replace(/"/g, '""')}"`;
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
      return `
        <div class="card-head"><div><div class="eyebrow">Review</div><h2 style="margin-top:6px">${esc(session.workoutName || 'Workout')}</h2></div>${esc(session.status || '')}</div>
        <p class="quiet">${dateText(session.completedAt)} · ${sets.length} set${sets.length === 1 ? '' : 's'}</p>
        <div class="stack" style="margin-top:12px">
          ${sets.length ? sets.map((s, i) => `
            <div class="exercise-card">
              <div class="exercise-title"><b>Set ${i + 1}</b> <span class="quiet">${esc(s.exerciseName || s.exercise || '')}</span></div>
              <div class="quiet">${esc([s.load && (s.load + ' lbs'), s.reps && (s.reps + ' reps'), s.rir && ('RIR ' + s.rir)].filter(Boolean).join(' · ') || '—')}</div>
              ${s.notes ? `<div class="quiet">${esc(s.notes)}</div>` : ''}
            </div>`).join('') : '<div class="empty">No sets logged.</div>'}
        </div>
        <div class="set-form" style="margin-top:14px">
          <label class="field full">Questions for Coach<textarea id="reviewQuestions">${esc(session.coachQuestions || '')}</textarea></label>
        </div>
        <div class="actions" style="margin-top:12px">
          <button class="primary" id="copyDebrief">Copy debrief</button>
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
        const te = $('#tempoE'), tp = $('#tempoP'), tc = $('#tempoC');
        const tempo = [te, tp, tc].map(el => el ? el.value.trim() : '').filter(Boolean).join('-');
        const rirChip = $('[data-rir].active');
        const rir = rirChip ? rirChip.dataset.rir : (block.rir || '');
        const noteEl = $('#note');
        const exerciseName = block.exerciseName || session.activeExercise || '';
        session.sets = Array.isArray(session.sets) ? session.sets : [];
        session.sets.push({
          exerciseName, exercise: exerciseName,
          load, result: reps, reps,
          tempo, rir,
          notes: noteEl ? noteEl.value.trim() : '',
          loggedAt: new Date().toISOString()
        });
        if (typeof persist === 'function') persist();
        if (typeof renderLog === 'function') renderLog();
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

  // Live session timer: updates #timer once per second when on the Log view.
  if (!has('_momentumTimerStarted')) {
    window._momentumTimerStarted = true;
    setInterval(() => {
      const el = document.getElementById('timer');
      if (!el) return;
      if (typeof active === 'undefined' || !active || !active.startedAt) return;
      if (typeof window.clock === 'function') {
        const secs = Math.max(0, Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000));
        el.textContent = window.clock(secs);
      }
    }, 1000);
  }
})();
