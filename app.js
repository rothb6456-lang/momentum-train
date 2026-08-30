/* =========================  
   MOMENTUM STABILITY + UX PATCH  
   Replace your existing matching blocks with this single patch.  
   ========================= */

/* ---------- escaping helpers ---------- */  
const esc = value =>  
  String(value ?? '').replace(/[&<>'"]/g, ch => ({  
    '&': '&',  
    '<': '<',  
    '>': '>',  
    "'": ''',  
    '"': '"'  
  }[ch]));

function escapeHtml(value) {  
  return String(value ?? '')  
    .replace(/&/g, '&')  
    .replace(/</g, '<')  
    .replace(/>/g, '>')  
    .replace(/"/g, '"')  
    .replace(/'/g, ''');  
}  

/* ---------- state + init ---------- */  
const state = {  
  cockpit: null,  
  cockpitEditOpen: false,  
  cockpitEditingLastSet: null,  
  restTimer: null  
};

let active = loadJson(ACTIVE_KEY, null);  
if (!active || !Array.isArray(active.sets)) {  
  active = newSession();  
}

let editor = loadJson(EDITOR_KEY, null);  
let selectedReviewId = '';

const restoredCockpit = loadJson(COCKPIT_KEY, null);  
if (restoredCockpit && Array.isArray(restoredCockpit.exercises)) {  
  state.cockpit = restoredCockpit;  
} else {  
  state.cockpit = null;  
}

function persist() {  
  if (active) {  
    active.updatedAt = new Date().toISOString();  
    saveJson(ACTIVE_KEY, active);  
  }  
  persistCockpit();  
  persistEditor();  
}

/* ---------- safer planner shell helpers ---------- */  
function newWorkoutShell(sourceType) {  
  if (typeof MomentumPlanner !== 'undefined' && typeof MomentumPlanner.blankWorkout === 'function') {  
    const workout = MomentumPlanner.blankWorkout();  
    workout.sourceType = sourceType || workout.sourceType || 'manual';  
    workout.exerciseBlocks = Array.isArray(workout.exerciseBlocks) ? workout.exerciseBlocks : [];  
    return workout;  
  }

  return {  
    id: momentumUid('plan'),  
    title: '',  
    subtitle: '',  
    scheduledDate: '',  
    sourceType: sourceType || 'manual',  
    phaseId: '',  
    week: '',  
    day: '',  
    status: 'draft',  
    sourceRawText: '',  
    exerciseBlocks: []  
  };  
}

function newBlockFromTemplate(template, order) {  
  const base = typeof MomentumPlanner !== 'undefined' && typeof MomentumPlanner.blankBlock === 'function'  
    ? MomentumPlanner.blankBlock(order)  
    : { id: momentumUid('block'), order };

  return Object.assign(base, {  
    id: base.id || momentumUid('block'),  
    order,  
    exerciseName: template.exerciseName || '',  
    targetSets: template.targetSets || '',  
    targetRepsOrDuration: template.targetRepsOrDuration || '',  
    targetWeightOrLoad: template.targetWeightOrLoad || '',  
    tempo: template.tempo || '',  
    rir: template.rir || '',  
    notes: template.notes || '',  
    checkpoints: template.checkpoints || ''  
  });  
}

/* ---------- startup view restore ---------- */  
function persistCurrentView(view) {  
  try {  
    localStorage.setItem('momentum:lastView', view);  
  } catch (e) {}  
}

function restoreCurrentView() {  
  try {  
    const hasActive =  
      active &&  
      (  
        (Array.isArray(active.sets) && active.sets.length) ||  
        (state.cockpit && Array.isArray(state.cockpit.exercises) && state.cockpit.exercises.length)  
      );

    if (hasActive) return 'log';

    const saved = localStorage.getItem('momentum:lastView') || 'today';  
    return ['home', 'today', 'log', 'review', 'history'].includes(saved) ? saved : 'today';  
  } catch (e) {  
    return 'today';  
  }  
}

/* ---------- active plan helpers ---------- */  
function planForActive() {  
  if (typeof active === 'undefined' || !active || !active.planId) return null;  
  if (typeof MomentumPlanner === 'undefined' || typeof MomentumPlanner.load !== 'function') return null;  
  return MomentumPlanner.load().find(x => x.id === active.planId) || null;  
}

function activeBlock() {  
  const plan = planForActive();  
  return plan?.exerciseBlocks?.find(x => x.exerciseName === active.activeExercise) || {  
    exerciseName: active?.activeExercise || '',  
    targetRepsOrDuration: '',  
    tempo: '',  
    rir: '',  
    notes: '',  
    checkpoints: ''  
  };  
}

function knownExerciseNames() {  
  const names = new Set();

  const activePlan = planForActive();  
  if (activePlan && Array.isArray(activePlan.exerciseBlocks)) {  
    activePlan.exerciseBlocks.forEach(block => {  
      const name = String(block?.exerciseName || '').trim();  
      if (name) names.add(name);  
    });  
  }

  if (typeof MomentumPlanner !== 'undefined' && typeof MomentumPlanner.load === 'function') {  
    MomentumPlanner.load().forEach(workout => {  
      (workout.exerciseBlocks || []).forEach(block => {  
        const name = String(block?.exerciseName || '').trim();  
        if (name) names.add(name);  
      });  
    });  
  }

  return Array.from(names).sort((a, b) => a.localeCompare(b));  
}

function allExercises() {  
  return knownExerciseNames();  
}

function exerciseOptionsMarkup(selected = '') {  
  return knownExerciseNames().map(name =>  
    `<option value="${esc(name)}"${name === selected ? ' selected' : ''}>${esc(name)}</option>`  
  ).join('');  
}

function canonicalExerciseName(name) {  
  const value = normalizeExerciseLookupName(name);  
  if (!value) return '';  
  return knownExerciseNames().find(x => normalizeExerciseLookupName(x) === value) || String(name || '').trim();  
}

function exerciseDatalistMarkup() {  
  const names = Array.isArray(knownExerciseNames()) ? knownExerciseNames() : [];  
  return names.map(name => `<option value="${esc(name)}"></option>`).join('');  
}

/* ---------- today / home UX helpers ---------- */  
function openPlannerBuilder() {  
  starterPreviewKey = null;  
  editor = newWorkoutShell('manual');  
  show('today');  
  renderToday();  
  setTimeout(() => {  
    renderEditor('builder');  
    $('#plannerEditor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });  
  }, 30);  
}

function openPlannerPaste() {  
  starterPreviewKey = null;  
  editor = newWorkoutShell('chatgpt');  
  show('today');  
  renderToday();  
  setTimeout(() => {  
    renderEditor('paste');  
    $('#plannerEditor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });  
  }, 30);  
}

function openTrainingFocus() {  
  starterPreviewKey = null;  
  editor = null;  
  renderToday();  
  show('today');  
  setTimeout(() => {  
    const node = $('#trainingFocus');  
    if (node && node.scrollIntoView) node.scrollIntoView({ behavior: 'smooth', block: 'start' });  
  }, 40);  
}

/* ---------- renderHome ---------- */  
function renderHome() {  
  const m = MomentumData.metrics();  
  const next = nextPlan();  
  const done = getDone();  
  const phases = MomentumData.phases();  
  const max = Math.max(...phases.map(x => x.sets), 1);

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

  const hasQueuedPlan = !!next;  
  const mobile = isMobileHomeLayout();

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
            next  
              ? `  
                <h2 style="margin-top:8px">${esc(next.title)}</h2>  
                <p class="quiet">${esc(planSummary(next))}</p>  
                <div class="signal-card">  
                  <b>${next.exerciseBlocks.length} planned exercise${next.exerciseBlocks.length === 1 ? '' : 's'}</b>  
                  Queued from ${esc(next.sourceType)}. Planned and performed values remain separate.  
                </div>  
                <div class="actions">  
                  <button class="primary" data-start="${next.id}">Start workout</button>  
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
        ${metric('Planned workouts', queued().length, next ? 'Next plan ready' : 'Nothing scheduled')}  
        ${metric('Completed locally', done.length, done[0] ? dateText(done[0].completedAt) : 'On this device')}  
      </section>

      <section class="grid">  
        <article class="card">  
          <div class="card-head">  
            <div><h2>Current cycle</h2>What is queued and what it asks of you next.</div>  
            ${next ? esc(next.sourceType || 'queued') : '—'}  
          </div>  
          <div class="stack">  
            ${  
              next  
                ? `  
                  <div class="signal-card">  
                    <b>${esc(next.title)}</b>  
                    ${esc(planSummary(next))}  
                  </div>  
                  <div class="today-grid-mini">  
                    <div class="metric-card">  
                      <div class="quiet">Exercises</div>  
                      <b>${next.exerciseBlocks.length}</b>  
                    </div>  
                    <div class="metric-card">  
                      <div class="quiet">Source</div>  
                      <b>${esc(next.sourceType || 'manual')}</b>  
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
          <div class="insight"><i class="dot"></i><div><b>${esc(m.primary[0])} is the largest loaded category</b> ${m.primary[1].toLocaleString()} historical training sets are in the current snapshot.</div></div>  
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
  if (homeStartQueuedWorkout && next) {  
    homeStartQueuedWorkout.onclick = () => startPlan(next.id);  
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
function renderToday() {  
  const list = queued();  
  const next = list[0];  
  const cards = starterCards();

  $('#today').innerHTML = `  
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
                  <b>${(card.exerciseBlocks || []).length}</b>  
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
      renderStarterPreview(starterPreviewKey);  
      setTimeout(() => {  
        const node = $('#plannerEditor');  
        if (node && node.scrollIntoView) node.scrollIntoView({ behavior: 'smooth', block: 'start' });  
      }, 40);  
    };  
  });

  if (starterPreviewKey) renderStarterPreview(starterPreviewKey);  
}

/* ---------- bindToday ---------- */  
function bindToday() {  
  const pasteCard = $('#pasteCard');  
  if (pasteCard) {  
    pasteCard.onclick = () => {  
      editor = typeof MomentumPlanner !== 'undefined' && typeof MomentumPlanner.blankWorkout === 'function'  
        ? MomentumPlanner.blankWorkout()  
        : newWorkoutShell('chatgpt');  
      editor.sourceType = 'chatgpt';  
      renderEditor('paste');  
      $('#plannerEditor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });  
    };  
  }

  const blankCard = $('#blankCard');  
  if (blankCard) {  
    blankCard.onclick = () => {  
      editor = typeof MomentumPlanner !== 'undefined' && typeof MomentumPlanner.blankWorkout === 'function'  
        ? MomentumPlanner.blankWorkout()  
        : newWorkoutShell('manual');  
      editor.sourceType = 'manual';  
      renderEditor('builder');  
      $('#plannerEditor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });  
    };  
  }

  const referenceCard = $('#referenceCard');  
  if (referenceCard) {  
    referenceCard.onclick = () => {  
      editor = clone(basePlan());  
      editor.id = (typeof MomentumPlanner !== 'undefined' && typeof MomentumPlanner.blankWorkout === 'function')  
        ? MomentumPlanner.blankWorkout().id  
        : momentumUid('plan');  
      editor.status = 'queued';  
      editor.sourceType = 'reference';  
      renderEditor('builder');  
      $('#plannerEditor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });  
    };  
  }

  $$('[data-edit]').forEach(b => b.onclick = () => {  
    editor = clone(MomentumPlanner.load().find(x => x.id === b.dataset.edit));  
    renderEditor('builder');  
    $('#plannerEditor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });  
  });

  $$('[data-delete]').forEach(b => b.onclick = () => {  
    if (confirm('Delete this queued workout?')) {  
      MomentumPlanner.remove(b.dataset.delete);  
      renderToday();  
      renderHome();  
    }  
  });

  $$('[data-duplicate]').forEach(b => b.onclick = () => {  
    MomentumPlanner.duplicate(b.dataset.duplicate);  
    renderToday();  
    renderHome();  
    toast('Queued workout duplicated');  
  });

  $$('[data-move]').forEach(b => b.onclick = () => {  
    MomentumPlanner.move(b.dataset.move, +b.dataset.direction);  
    renderToday();  
    renderHome();  
  });

  $$('[data-start]').forEach(b => b.onclick = () => startPlan(b.dataset.start));  
}

/* ---------- renderEditor ---------- */  
function renderEditor(mode) {  
  const root = $('#plannerEditor');  
  if (!root || !editor) return;

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

    $('#parseCard').onclick = () => {  
      const raw = $('#rawCard').value.trim();  
      if (!raw) {  
        toast('Paste a workout card first');  
        return;  
      }  
      editor = MomentumPlanner.parse(raw);  
      renderEditor('builder');  
    };

    $('#cancelEditor').onclick = () => {  
      editor = null;  
      root.innerHTML = '';  
    };  
    return;  
  }

  const teaching = plannerTeachingCopy(editor);

  root.innerHTML = `  
    <article class="card">  
      <div class="eyebrow">Workout builder</div>  
      <h2 style="margin-top:6px">Edit planned structure</h2>

      <div class="signal-card" style="margin-top:12px">  
        <b>${esc(teaching.tempoLabel)}</b>  
        ${esc(teaching.tempoExample)}  
        <b>${esc(teaching.rirLine)}</b>  
        ${esc(teaching.scienceLine)}  
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
        ${exerciseDatalistMarkup()}  
      </datalist>

      <div class="workout-card">  
        ${editor.exerciseBlocks.map((block, index) => builderBlock(block, index)).join('')}  
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
      value = normalizeNumericEntry(value, false);  
      input.value = value;  
    }

    if (field === 'targetWeightOrLoad') {  
      value = normalizeNumericEntry(value, true);  
      input.value = value;  
    }

    if (field === 'rir') {  
      value = String(value || '').replace(/[^0-9+\-]/g, '');  
      input.value = value;  
    }

    block[field] = value;  
  });

  $$('[data-block][data-field="exerciseName"]').forEach(input => {  
    input.onchange = () => {  
      const block = editor.exerciseBlocks.find(x => x.id === input.dataset.block);  
      if (!block) return;

      const canon = canonicalExerciseName(input.value);  
      if (canon) {  
        input.value = canon;  
        block.exerciseName = canon;  
      }  
    };  
  });

  $$('[data-remove-block]').forEach(button => button.onclick = () => {  
    editor.exerciseBlocks = editor.exerciseBlocks.filter(x => x.id !== button.dataset.removeBlock);  
    if (!editor.exerciseBlocks.length) editor.exerciseBlocks = [MomentumPlanner.blankBlock()];  
    renderEditor('builder');  
  });

  $('#addBlock').onclick = () => {  
    editor.exerciseBlocks.push(MomentumPlanner.blankBlock(editor.exerciseBlocks.length + 1));  
    renderEditor('builder');  
  };

  $('#saveQueue').onclick = () => {  
    editor.exerciseBlocks.forEach((x, i) => {  
      x.order = i + 1;  
      x.exerciseName = canonicalExerciseName(String(x.exerciseName || '').trim());  
      x.targetSets = normalizeNumericEntry(x.targetSets, false);  
      x.targetWeightOrLoad = normalizeNumericEntry(x.targetWeightOrLoad, true);  
      x.rir = String(x.rir || '').replace(/[^0-9+\-]/g, '');  
    });

    const invalidBlock = editor.exerciseBlocks.find(block => !String(block.exerciseName || '').trim());

    if (invalidBlock) {  
      toast('Each exercise needs a name');  
      return;  
    }

    editor.status = 'queued';  
    MomentumPlanner.upsert(editor);  
    editor = null;  
    starterPreviewKey = null;  
    renderToday();  
    renderHome();  
    toast('Workout saved to queue');  
  };

  $('#cancelEditor').onclick = () => {  
    editor = null;  
    root.innerHTML = '';  
  };  
}

/* ---------- start workout ---------- */  
function startPlan(id) {  
  const plan = MomentumPlanner.load().find(x => x.id === id);  
  if (!plan) {  
    toast('Workout not found.');  
    return;  
  }

  active = newSession(plan);  
  active.status = 'active';  
  state.cockpit = MomentumPlanner.buildCockpitWorkout(plan);  
  state.cockpitEditOpen = false;  
  state.cockpitEditingLastSet = null;  
  state.restTimer = null;

  MomentumPlanner.mark(plan.id, 'active');  
  persist();  
  renderHome();  
  renderToday();  
  renderLog();  
  show('log');  
  toast('Planned workout started');  
}

/* ---------- cockpit / session safety ---------- */  
function discardActiveWorkout() {  
  if (!confirm('Discard this active session?')) return;  
  if (typeof active === 'undefined') return;

  active = newSession();  
  state.cockpit = null;  
  state.cockpitEditOpen = false;  
  state.cockpitEditingLastSet = null;  
  state.restTimer = null;

  if (typeof persist === 'function') persist();

  renderLog();  
  renderToday();  
  renderHome();  
  toast('Draft discarded');  
}

function bindSessionContext() {  
  $$('[data-context]').forEach(el => {  
    el.oninput = () => {  
      const key = el.dataset.context;  
      if (key === 'coachQuestions') {  
        if (typeof active === 'undefined' || !active) return;  
        active.coachQuestions = el.value;  
        if (typeof persist === 'function') persist();  
      }  
    };  
  });  
}

/* ---------- renderPicker ---------- */  
function renderPicker(query = '') {  
  const root = $('#exercisePicker');  
  if (!root || !active) return;

  const plan = planForActive();  
  const planned = new Set(((plan && plan.exerciseBlocks) || []).map(x => x.exerciseName));  
  const names = allExercises().filter(x => x.toLowerCase().includes(query.toLowerCase()));

  root.innerHTML =  
    [  
      ...names.filter(x => planned.has(x)),  
      ...names.filter(x => !planned.has(x))  
    ].map(x => `  
      <button class="pick ${x === active.activeExercise ? 'active' : ''}" data-pick="${esc(x)}">  
        <b>${esc(x)}</b>  
        <small>${planned.has(x) ? 'Planned workout' : 'Exercise library'}</small>  
      </button>  
    `).join('')  
    || '<div class="empty">No matching known exercises.</div>';

  $$('[data-pick]', root).forEach(b => b.onclick = () => {  
    active.activeExercise = b.dataset.pick;  
    persist();  
    renderLog();  
  });  
}

/* ---------- renderLog ---------- */  
function renderLog() {  
  const root = document.getElementById('log');  
  if (!root) return;

  if (!active || !Array.isArray(active.sets)) {  
    active = newSession();  
  }

  const reviewed = selectedReviewedSession();  
  const showCompletedState =  
    !active.sets.length &&  
    !state.cockpit &&  
    reviewed &&  
    (reviewed.status === 'staged' || reviewed.status === 'shared');

  if (showCompletedState) {  
    const next = nextPlan();

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

    const openReviewBtn = $('#openReviewFromLog');  
    if (openReviewBtn) {  
      openReviewBtn.onclick = () => {  
        selectedReviewId = reviewed.id;  
        renderReview();  
        show('review');  
      };  
    }

    const undoFinishBtn = $('#undoFinishFromLog');  
    if (undoFinishBtn) {  
      undoFinishBtn.onclick = () => {  
        restoreStagedSession(reviewed.id);  
      };  
    }

    const openNextBtn = $('#openNextWorkoutFromLog');  
    if (openNextBtn && next) {  
      openNextBtn.onclick = () => {  
        show('today');  
      };  
    }

    return;  
  }

  const block = activeBlock();  
  const plannedContext = (() => {  
    const plan = planForActive();  
    return active.planId && plan ? `  
      <article class="card" style="margin-bottom:12px">  
        <div class="eyebrow">Planned context</div>  
        <b>${esc(plan.title)}</b> · ${esc(planSummary(plan))}  
      </article>  
    ` : '';  
  })();

  root.innerHTML = `  
    <div class="log-shell">  
      <header class="active-session">  
        <div>  
          <div class="eyebrow">${active.planId ? 'Planned session · autosaved' : 'Ad hoc session · autosaved'}</div>  
          <h1>${esc(active.workoutName)}</h1>  
          <div class="quiet" style="margin-top:6px">Session time</div>  
          <div id="timer">${clock(Math.max(0, Math.floor((Date.now() - new Date(active.startedAt)) / 1000)))}</div>  
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
                block.targetRepsOrDuration,  
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
                  oninput="this.value = this.value.replace(/[^0-9.]/g, '').replace(/^([^.]*\\.)|\\./g, '$1')"  
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
                  oninput="this.value = this.value.replace(/[^0-9a-zA-Z/ ,.-]/g, '')"  
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
              ${new Set(active.sets.map(x => x.exercise)).size} exercises  
            </div>  
            ${logMarkup(active)}  
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

  renderPicker();  
  bindLog();  
  bindSessionContext();  
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

/* ---------- startup render: keep only this startup block ---------- */  
window.addEventListener('load', () => {  
  renderHome();  
  renderToday();  
  renderLog();  
  renderReview();  
  renderHistory();  
  show(restoreCurrentView());  
});

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
   IMPORTANT MANUAL CLEANUP AFTER PASTE  
   1. DELETE the old duplicate bindReview function.  
   2. DELETE the old mid-file startup block:  
        renderHome();  
        renderToday();  
        renderReview();  
        renderLog();  
        show('review');  
   3. Keep only the final window.addEventListener('load', ...) startup block above.  
   ========================= */  