/* Momentum MVP: local-first planning, logging, review, export, and history. */  
(async () => {  
  const data = await MomentumData.load();  
  const fallbackCard = WorkoutCards.phase9week3day2;

  const ACTIVE_KEY = 'momentum.active.v3';  
  const DONE_KEY = 'momentum.sessions.v3';

  const $ = (selector, root = document) => root.querySelector(selector);  
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const esc = value =>  
  String(value ?? '').replace(/[&<>'"]/g, ch => ({  
    '&': '&amp;',  
    '<': '&lt;',  
    '>': '&gt;',  
    "'": '&#39;',  
    '"': '&quot;'  
  }[ch]));

  const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;  
  const clone = value => JSON.parse(JSON.stringify(value));

  const dateIso = value => new Date(value || Date.now()).toISOString().slice(0, 10);  
  const dateText = value =>  
    new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })  
      .format(new Date(value));

  const toast = text => {  
    const el = $('#toast');  
    if (!el) return;  
    el.textContent = text;  
    el.classList.add('show');  
    clearTimeout(toast.timer);  
    toast.timer = setTimeout(() => el.classList.remove('show'), 2500);  
  };

  const copy = async text => {  
    try {  
      await navigator.clipboard.writeText(text);  
      toast('Copied to clipboard');  
    } catch {  
      window.prompt('Copy this text:', text);  
    }  
  };

  const download = (name, type, text) => {  
    const a = document.createElement('a');  
    a.href = URL.createObjectURL(new Blob([text], { type }));  
    a.download = name;  
    a.click();  
    URL.revokeObjectURL(a.href);  
    toast(`${name} downloaded`);  
  };

  const getDone = () => {  
    try { return JSON.parse(localStorage.getItem(DONE_KEY) || '[]'); }  
    catch { return []; }  
  };

  const saveDone = sessions => localStorage.setItem(DONE_KEY, JSON.stringify(sessions));

  const basePlan = () => ({  
    id: 'reference-phase-9-w3-d2',  
    title: fallbackCard.name,  
    phaseId: String(fallbackCard.phase),  
    week: String(fallbackCard.week),  
    day: String(fallbackCard.day),  
    sourceType: 'reference',  
    sourceRawText: '',  
    status: 'reference',  
    exerciseBlocks: fallbackCard.exercises.map((x, i) => ({  
      id: `reference-${i}`,  
      order: i + 1,  
      exerciseName: x.name,  
      targetSets: '',  
      targetRepsOrDuration: x.target,  
      targetWeightOrLoad: '',  
      tempo: x.tempo || '',  
      rir: x.rir || '',  
      notes: x.intent || '',  
      checkpoints: x.checkpoint || '',  
      tags: []  
    }))  
  });

setInterval(() => {  
  if (!state.restTimer) return;

  const remaining = getRestTimerRemaining();  
  const el = document.getElementById('restTimerValue');

  if (remaining <= 0) {  
    state.restTimer = null;  
    if (el) el.textContent = '0:00';  
    return;  
  }

  if (el) el.textContent = formatTimer(remaining);  
}, 1000);    

function startCockpitForWorkout(workout) {  
  state.cockpit = MomentumPlanner.buildCockpitWorkout(workout);  
  renderLog();  
}  

  function newSession(plan = null) {  
  const source = plan || basePlan();  
  return {  
    id: uid(),  
    status: 'draft',  
    planId: source.status === 'reference' ? '' : source.id,  
    plannedWorkout: clone(source),  
    phase: source.phaseId || '',  
    week: source.week || '',  
    day: source.day || '',  
    workoutName: source.title || 'Ad hoc workout',  
    startedAt: new Date().toISOString(),  
    updatedAt: new Date().toISOString(),  
    activeExercise: source.exerciseBlocks?.[0]?.exerciseName || '',  
    sets: [],  
    tags: [],  
    coachQuestions: ''  
  };  
}  

const state = {  
  cockpit: null,  
  cockpitEditOpen: false,  
  restTimer: null
};    

function parseRestSeconds(value) {  
  const raw = String(value || '').trim().toLowerCase();  
  if (!raw) return 90;

  const m = raw.match(/^(\d+)\s*(sec|s|min|m)$/);  
  if (!m) return 90;

  const n = Number(m[1]);  
  const unit = m[2];

  if (unit === 'min' || unit === 'm') return n * 60;  
  return n;  
}

function startRestTimer(seconds) {  
  state.restTimer = {  
    seconds,  
    endsAt: Date.now() + seconds * 1000  
  };  
  renderLog();  
}

function stopRestTimer() {  
  state.restTimer = null;  
  renderLog();  
}    


function getRestTimerRemaining() {  
  if (!state.restTimer) return 0;  
  return Math.max(0, Math.ceil((state.restTimer.endsAt - Date.now()) / 1000));  
}

function formatTimer(seconds) {  
  const m = Math.floor(seconds / 60);  
  const s = seconds % 60;  
  return `${m}:${String(s).padStart(2, '0')}`;  
}  

function parseTopEndForDisplay(value) {  
  const raw = String(value || '').trim();  
  if (!raw) return '';  
  const m = raw.match(/^(\d+)\s*-\s*(\d+)$/);  
  if (m) return m[2];  
  return raw;  
}  

function parseRestTopEndForDisplay(value) {  
  const raw = String(value || '').trim();  
  if (!raw) return '';  
  const m = raw.match(/^(\d+)\s*-\s*(\d+)\s*(sec|min|s|m)$/i);  
  if (m) return `${m[2]} ${m[3]}`;  
  return raw;  
}  

function escapeHtml(value) {  
  return String(value ?? '')  
    .replace(/&/g, '&amp;')  
    .replace(/</g, '&lt;')  
    .replace(/>/g, '&gt;')  
    .replace(/"/g, '&quot;')  
    .replace(/'/g, '&#39;');  
}  

function normalizePerformedReps(value) {  
  const raw = String(value || '').trim();  
  if (!raw) return '';

  const m = raw.match(/^(\d+)\s*-\s*(\d+)(.*)$/);  
  if (m) return `${m[2]}${m[3] || ''}`.trim();

  return raw;  
}  

function discardActiveWorkout() {  
  if (!confirm('Discard this active session?')) return;

  active = newSession();  
  state.cockpit = null;  
  state.cockpitEditOpen = false;  
  state.restTimer = null;  
  persist();  
  renderLog();  
  renderToday();  
  renderHome();  
  toast('Draft discarded');  
}    

function finishWorkoutAction() {  
  const cockpit = state.cockpit;

  if (!cockpit || !Array.isArray(cockpit.exercises)) {  
    if (Array.isArray(active?.sets) && active.sets.length) {  
      finish();  
      return;  
    }

    toast('No active workout.');  
    return;  
  }

  const plannedBlocks = Array.isArray(active.plannedWorkout?.exerciseBlocks)  
    ? active.plannedWorkout.exerciseBlocks  
    : [];

  const loggedSets = cockpit.exercises.flatMap((ex, exerciseIndex) => {  
    const plannedName = plannedBlocks[exerciseIndex]?.exerciseName;  
    const exerciseName =  
      plannedName ||  
      ex.exerciseName ||  
      ex.name ||  
      ex.title ||  
      `Exercise ${exerciseIndex + 1}`;

    const sets = Array.isArray(ex.completedSets) ? ex.completedSets : [];

    return sets.map((set, setIndex) => ({  
      id: uid(),  
      exercise: exerciseName,  
      name: exerciseName,  
      exerciseName,  
      result: set.actualRepsOrDuration || '',  
      repsOrDuration: set.actualRepsOrDuration || '',  
      actualRepsOrDuration: set.actualRepsOrDuration || '',  
      load: normalizeLoadValue(set.actualLoad || ''),  
      actualLoad: normalizeLoadValue(set.actualLoad || ''),  
      tempo: set.actualTempo || '',  
      actualTempo: set.actualTempo || '',  
      rir: set.actualRir || '',  
      actualRir: set.actualRir || '',  
      checkpoint: '',  
      note: set.note || '',  
      at: set.at || set.loggedAt || new Date().toISOString(),  
      setNumber: set.setNumber || (setIndex + 1),  
      extra: !!set.extra  
    }));  
  });

  if (!loggedSets.length) {  
    if (Array.isArray(active?.sets) && active.sets.length) {  
      finish();  
      return;  
    }

    toast('Log at least one set first');  
    return;  
  }

  active.sets = loggedSets;  
  persist();  
  finish();  
}  
function cockpitHasLoggedSets(cockpit) {  
  if (!cockpit || !Array.isArray(cockpit.exercises)) return false;

  return cockpit.exercises.some(ex => {  
    const completedCount = Array.isArray(ex.completedSets) ? ex.completedSets.length : 0;  
    return completedCount > 0;  
  });  
}   

function deleteLastCockpitSet() {  
  const cockpit = state.cockpit;  
  if (!cockpit || !Array.isArray(cockpit.exercises)) return;

  const ex = cockpit.exercises[cockpit.exerciseIndex];  
  if (!ex) return;

  const sets = Array.isArray(ex.completedSets) ? ex.completedSets : [];  
  if (!sets.length) {  
    toast('No completed set to remove.');  
    return;  
  }

  sets.pop();  
  ex.completedSets = sets;

  renderLog();  
  toast('Last set removed');  
}      

function updateReviewQuestions(sessionId, value) {  
  const sessions = getDone();  
  const idx = sessions.findIndex(x => x.id === sessionId);  
  if (idx === -1) return;

  sessions[idx].coachQuestions = value || '';  
  saveDone(sessions);  
}  

function normalizeNumericEntry(value, allowDecimal = false) {  
  const raw = String(value || '').trim();  
  if (!raw) return '';

  const cleaned = allowDecimal  
    ? raw.replace(/[^0-9.]/g, '')  
    : raw.replace(/[^0-9]/g, '');

  if (!allowDecimal) return cleaned;

  const parts = cleaned.split('.');  
  return parts.length <= 1 ? cleaned : `${parts[0]}.${parts.slice(1).join('')}`;  
}  

function logCockpitSetAction() {  
  const cockpit = state.cockpit;  
  if (!cockpit || !Array.isArray(cockpit.exercises)) return;

  const ex = cockpit.exercises[cockpit.exerciseIndex];  
  if (!ex) return;

  try {  
    let next = cockpit;

    if (ex.establishLoad) {  
      const input = document.getElementById('cockpitWorkingLoad');  
      const load = normalizeLoadValue(input ? input.value : '');  
      next = MomentumPlanner.setCockpitWorkingLoad(next, cockpit.exerciseIndex, load);  
    }

    try {  
      next = MomentumPlanner.logCockpitSet(next, next.exerciseIndex);  
    } catch (err) {  
      const msg = String(err?.message || '').toLowerCase();  
      if (!msg.includes('complete') && !msg.includes('already')) throw err;

      const current = next.exercises[next.exerciseIndex];  
      const actualLoad = normalizeLoadValue(current.workingLoad || current.prescribedLoad || '');  
      const actualRepsOrDuration = normalizeRepValue('', current.prescribedRepsOrDuration || '');  
      const actualTempo = current.prescribedTempo || '';  
      const actualRir = normalizeRirValue('', current.prescribedRir || '');

      current.completedSets = Array.isArray(current.completedSets) ? current.completedSets : [];  
      current.completedSets.push({  
        actualLoad,  
        actualRepsOrDuration,  
        actualTempo,  
        actualRir,  
        note: '',  
        extra: true,  
        at: new Date().toISOString()  
      });  
    }

    state.cockpit = next;  
    state.cockpitEditOpen = false;

    startRestTimer(parseRestSeconds(  
      ex.prescribedRest ||  
      ex.rest ||  
      (String(ex.notes || '').match(/rest:\s*([^\|]+)/i)?.[1]?.trim()) ||  
      '90 sec'  
    ));

    renderLog();  
  } catch (err) {  
    toast(err.message || 'Could not log set.');  
  }  
}  

function normalizeLoadValue(value) {  
  const raw = String(value || '').trim();  
  if (!raw) return '';  
  const match = raw.replace(/,/g, '').match(/\d+(\.\d+)?/);  
  return match ? match[0] : '';  
}  

function normalizeRepValue(value, fallback = '') {  
  const raw = String(value || '').trim();  
  if (raw) {  
    const numeric = raw.match(/\d+(\.\d+)?/);  
    return numeric ? numeric[0] : '';  
  }

  const fallbackRaw = String(fallback || '').trim();  
  if (!fallbackRaw) return '';

  const range = fallbackRaw.match(/^(\d+)\s*-\s*(\d+)(.*)$/);  
  if (range) return `${range[2]}${range[3] || ''}`.trim();

  return fallbackRaw;  
}

function normalizeRirValue(value, fallback = '') {  
  const raw = String(value || '').trim();  
  if (raw) {  
    const cleaned = raw.replace(/[^0-9+\-]/g, '');  
    const range = cleaned.match(/^(\d+)\s*-\s*(\d+)$/);  
    if (range) return `${range[1]}-${range[2]}`;  
    const plus = cleaned.match(/^(\d+)\+$/);  
    if (plus) return `${plus[1]}+`;  
    const numeric = cleaned.match(/^\d+$/);  
    return numeric ? numeric[0] : '';  
  }

  const fallbackRaw = String(fallback || '').trim();  
  if (!fallbackRaw) return '';

  const fallbackCleaned = fallbackRaw.replace(/[^0-9+\-]/g, '');  
  const fallbackRange = fallbackCleaned.match(/^(\d+)\s*-\s*(\d+)$/);  
  if (fallbackRange) return `${fallbackRange[1]}-${fallbackRange[2]}`;

  const fallbackPlus = fallbackCleaned.match(/^(\d+)\+$/);  
  if (fallbackPlus) return `${fallbackPlus[1]}+`;

  const fallbackNumeric = fallbackCleaned.match(/^\d+$/);  
  return fallbackNumeric ? fallbackNumeric[0] : '';  
}  
function formatLoadLbs(value) {  
  const raw = String(value || '').trim();  
  if (!raw) return 'bodyweight';  
  return `${raw} lbs`;  
}   

function startOptionalExercise() {  
  if (!state.cockpit) return;  
  state.cockpit = MomentumPlanner.startOptionalCockpitExercise(state.cockpit, state.cockpit.exerciseIndex);  
  renderLog();  
}

function skipOptionalExercise() {  
  if (!state.cockpit) return;  
  state.cockpit = MomentumPlanner.skipCockpitExercise(state.cockpit, state.cockpit.exerciseIndex);  
  renderLog();  
}

function cockpitPrev() {  
  if (!state.cockpit) return;  
  state.cockpit.exerciseIndex = Math.max(0, state.cockpit.exerciseIndex - 1);  
  state.cockpitEditOpen = false;  
  renderLog();  
}

function cockpitNext() {  
  if (!state.cockpit) return;  
  state.cockpit.exerciseIndex = Math.min(state.cockpit.exercises.length - 1, state.cockpit.exerciseIndex + 1);  
  state.cockpitEditOpen = false;  
  renderLog();  
}    

function renderRestTimer() {  
  if (!state.restTimer) return '';

  const remaining = getRestTimerRemaining();

  return `  
    <div class="section" style="margin-top:12px">  
      <div class="eyebrow">Rest timer</div>  
      <div id="restTimerValue" style="font-size:2rem;font-weight:800;line-height:1">${formatTimer(remaining)}</div>  
      <div class="actions" style="margin-top:10px">  
        <button class="secondary" onclick="startCurrentExerciseRestTimer()">Restart</button>  
        <button class="secondary" onclick="stopRestTimer()">Stop</button>  
      </div>  
    </div>  
  `;  
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

function startCurrentExerciseRestTimer() {  
  const ex = getActiveCockpitExercise();  
  if (!ex) return;  
  startRestTimer(parseRestSeconds(ex.prescribedRest || '90 sec'));  
}  

function getCockpitEditDefaults(ex) {  
  return {  
    load: ex.workingLoad || ex.prescribedLoad || '',  
    repsOrDuration: parseTopEndForDisplay(ex.prescribedRepsOrDuration || ''),  
    tempo: ex.prescribedTempo || '',  
    rir: ex.prescribedRir || '',  
    note: ''  
  };  
}      

function openCockpitDifferentToday() {  
  state.cockpitEditOpen = true;  
  renderLog();  
}

function cancelCockpitDifferentToday() {  
  state.cockpitEditOpen = false;  
  renderLog();  
}  

function renderCockpitWorkingLoad(ex) {  
  return `  
    <div class="card section">  
      <div class="eyebrow">Working load</div>  
      <label class="field" style="margin-top:10px">  
        Load (lbs)  
        <input  
          id="cockpitWorkingLoad"  
          class="input"  
          inputmode="decimal"  
          pattern="[0-9]*[.]?[0-9]*"  
          placeholder="e.g. 85"  
          value="${esc(normalizeLoadValue(ex.workingLoad || ex.prescribedLoad || ''))}"  
          oninput="this.value = this.value.replace(/[^0-9.]/g, '').replace(/^([^.]*\.)|\./g, '$1')"  
        >  
      </label>  
    </div>  
  `;  
}  

function renderCockpitDifferentToday(ex) {  
  if (!state.cockpitEditOpen) return '';

  const d = getCockpitEditDefaults(ex);

  return `  
    <div class="card section">  
      <div class="eyebrow">Different today</div>

      <div class="set-form" style="margin-top:10px">  
        <label class="field">  
          <span>Load (lbs)</span>  
          <input  
            id="cockpitEditLoad"  
            class="input"  
            inputmode="decimal"  
            pattern="[0-9]*[.]?[0-9]*"  
            placeholder="e.g. 85"  
            value="${esc(normalizeLoadValue(ex.workingLoad || ex.prescribedLoad || ''))}"  
            oninput="this.value = this.value.replace(/[^0-9.]/g, '').replace(/^([^.]*\.)|\./g, '$1')"  
          >  
        </label>

        <label class="field">  
          <span>${ex.timed ? 'Duration (sec)' : 'Reps'}</span>  
          <input  
            id="cockpitEditReps"  
            class="input"  
            inputmode="numeric"  
            pattern="[0-9]*"  
            placeholder="${ex.timed ? 'e.g. 65' : 'e.g. 10'}"  
            value=""  
            oninput="this.value = this.value.replace(/[^0-9]/g, '')"  
          >  
        </label>

        <label class="field">  
          <span>Tempo</span>  
          <input  
            id="cockpitEditTempo"  
            class="input"  
            value="${escapeHtml(d.tempo)}"  
            placeholder="Tempo"  
          >  
        </label>

        <label class="field">  
          RIR  
          <input  
            id="cockpitEditRir"  
            class="input"  
            inputmode="text"  
            pattern="[0-9+\-]*"  
            value="${escapeHtml(d.rir)}"  
            placeholder="e.g. 1-2 or 2+"  
            oninput="this.value = this.value.replace(/[^0-9+\-]/g, '')"  
          >  
        </label>  
        <label class="field full">  
          <span>Set note</span>  
          <textarea  
            id="cockpitEditNote"  
            placeholder="Deviation, side-to-side note, pain/symptom, technique change"  
          ></textarea>  
        </label>  
      </div>

      <div class="actions">  
        <button class="primary" onclick="saveDifferentTodayAndLogSet()">Save & Log Set</button>  
        <button class="secondary" onclick="cancelCockpitDifferentToday()">Cancel</button>  
      </div>  
    </div>  
  `;  
}  

let active;  
try {  
  active = JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null');  
} catch {  
  active = null;  
}

if (!active || !Array.isArray(active.sets)) {  
  active = newSession();  
}

if (active?.plannedWorkout?.exerciseBlocks?.length) {  
  state.cockpit = MomentumPlanner.buildCockpitWorkout(active.plannedWorkout);  
}

const persist = () => {  
  active.updatedAt = new Date().toISOString();  
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(active));  
};

let editor = null;  
let selectedReviewId = '';  

  function show(view) {  
    $$('.view').forEach(x => x.classList.toggle('active', x.id === view));  
    $$('[data-view]').forEach(x => x.classList.toggle('active', x.dataset.view === view));  
    const title = { home: 'Home', today: 'Today', log: 'Log workout', review: 'Review', history: 'History' }[view];  
    if ($('#mobileTitle')) $('#mobileTitle').textContent = title;  
    window.scrollTo({ top: 0, behavior: 'smooth' });  
  }

  $$('[data-view]').forEach(b => b.onclick = () => show(b.dataset.view));

  function metric(label, value, detail) {  
    return `<article class="card metric"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div><div class="delta">${esc(detail)}</div></article>`;  
  }

  function queued() {  
    return MomentumPlanner.load().filter(x => x.status === 'queued' || x.status === 'active');  
  }

  function nextPlan() {  
    return queued()[0] || null;  
  }

  function planSummary(plan) {  
    return [  
      plan.phaseId ? `Phase ${plan.phaseId}` : '',  
      plan.week ? `Week ${plan.week}` : '',  
      plan.day ? `Day ${plan.day}` : '',  
      plan.sourceType || ''  
    ].filter(Boolean).join(' · ') || 'No phase metadata';  
  }

  function bindGo() {  
    $$('[data-go]').forEach(b => b.onclick = () => show(b.dataset.go));  
  }

  function renderHome() {  
    const m = MomentumData.metrics();  
    const next = nextPlan();  
    const done = getDone();  
    const phases = MomentumData.phases();  
    const max = Math.max(...phases.map(x => x.sets), 1);

    const primaryCtaView = active.sets.length ? 'log' : 'today';  
    const primaryCtaLabel = active.sets.length  
      ? 'Resume in-progress session'  
      : (next ? 'Open next workout' : 'Queue a workout');  
    const secondaryCtaLabel = next ? 'View queue' : 'Paste workout card';

    $('#home').innerHTML = `  
      <div class="hero">  
        <article class="card hero-main">  
          <div class="eyebrow">Momentum / command center</div>  
          <h1>${active.sets.length ? 'Your session is in progress.' : 'Know what changed. Capture what matters.'}</h1>  
          <p class="quiet">  
            ${active.sets.length  
              ? `${active.sets.length} set${active.sets.length === 1 ? '' : 's'} are saved locally on this device.`  
              : 'Queue Coach’s next card, execute it on the gym floor, and carry both plan and performance into review.'}  
          </p>  
          <div class="actions">  
            <button class="primary" data-go="${primaryCtaView}">${primaryCtaLabel}</button>  
            <button class="secondary" data-go="today">${secondaryCtaLabel}</button>  
          </div>  
        </article>

        <aside class="card">  
          <div class="eyebrow">Next workout</div>  
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
                <p class="quiet">Paste your next Coach card to create an editable queue item.</p>  
                <div class="actions">  
                  <button class="primary" data-go="today">Paste workout card</button>  
                </div>  
              `  
          }  
        </aside>  
      </div>

      <section class="metrics">  
        ${metric('Historical sessions', m.sessions, 'Markdown source data')}  
        ${metric('Historical sets', m.sets.toLocaleString(), 'Loaded training rows')}  
        ${metric('Queued workouts', queued().length, next ? 'Next card ready' : 'Nothing scheduled')}  
        ${metric('Completed locally', done.length, done[0] ? dateText(done[0].completedAt) : 'On this device')}  
      </section>

      <section class="grid">  
        <article class="card">  
          <div class="card-head">  
            <div><h2>Phase workload</h2>Historical working sets by phase</div>  
            Through ${m.lastDate || '—'}  
          </div>  
          <div class="stack">  
            ${  
              phases.length  
                ? phases.map(p => `  
                  <div class="bar-row">  
                    Phase ${esc(p.phase)}  
                    <div class="bar"><i style="width:${p.sets / max * 100}%"></i></div>  
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

    bindGo();  
    $$('[data-start]').forEach(b => b.onclick = () => startPlan(b.dataset.start));  
  }

  function renderToday() {  
    const list = queued();  
    const next = list[0];

    $('#today').innerHTML = `  
      <div class="today-layout">  
        <div class="eyebrow">Planning + execution</div>  
        <h1>Today starts in the queue.</h1>  
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
                <b style="color:var(--ink)">No next workout is queued.</b><br>  
                Paste a Coach card or create a blank workout below.  
              </div>  
            `}  
          <div class="actions">  
            <button class="primary" id="pasteCard">Paste workout card</button>  
            <button class="secondary" id="blankCard">Create blank workout</button>  
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

        <section id="plannerEditor" class="section"></section>  
      </div>  
    `;

    bindToday();  
  }

function bindToday() {  
  const pasteCard = $('#pasteCard');  
  if (pasteCard) {  
    pasteCard.onclick = () => {  
      editor = MomentumPlanner.blankWorkout();  
      editor.sourceType = 'chatgpt';  
      renderEditor('paste');  
    };  
  }

  const blankCard = $('#blankCard');  
  if (blankCard) {  
    blankCard.onclick = () => {  
      editor = MomentumPlanner.blankWorkout();  
      renderEditor('builder');  
    };  
  }

  const referenceCard = $('#referenceCard');  
  if (referenceCard) {  
    referenceCard.onclick = () => {  
      editor = clone(basePlan());  
      editor.id = MomentumPlanner.blankWorkout().id;  
      editor.status = 'queued';  
      editor.sourceType = 'reference';  
      renderEditor('builder');  
    };  
  }

  $$('[data-edit]').forEach(b => b.onclick = () => {  
    editor = clone(MomentumPlanner.load().find(x => x.id === b.dataset.edit));  
    renderEditor('builder');  
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

  function renderEditor(mode) {  
    const root = $('#plannerEditor');  
    if (!root || !editor) return;

    if (mode === 'paste') {  
      root.innerHTML = `  
        <article class="card">  
          <div class="eyebrow">Paste workout card</div>  
          <h2 style="margin-top:6px">Import from Coach / ChatGPT</h2>  
          <p class="quiet">Parsing is conservative. The original text is saved, and every extracted field remains editable.</p>  
          <textarea id="rawCard" placeholder="Paste the complete Coach workout card here…">${esc(editor.sourceRawText)}</textarea>  
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

    root.innerHTML = `  
      <article class="card">  
        <div class="eyebrow">Workout builder</div>  
        <h2 style="margin-top:6px">Edit planned structure</h2>

        <div class="set-form" style="margin-top:12px">  
          <label class="field full">Workout title<input class="input" data-plan="title" value="${esc(editor.title)}"></label>  
          <label class="field">Scheduled date<input class="input" type="date" data-plan="scheduledDate" value="${esc(editor.scheduledDate)}"></label>  
          <label class="field">Source  
            <select data-plan="sourceType">  
              ${['chatgpt', 'manual', 'duplicate', 'history', 'reference'].map(x => `<option ${editor.sourceType === x ? 'selected' : ''}>${x}</option>`).join('')}  
            </select>  
          </label>  
          <label class="field">Phase<input class="input" inputmode="numeric" data-plan="phaseId" value="${esc(editor.phaseId)}"></label>  
          <label class="field">Week<input class="input" inputmode="numeric" data-plan="week" value="${esc(editor.week)}"></label>  
          <label class="field">Day<input class="input" inputmode="numeric" data-plan="day" value="${esc(editor.day)}"></label>  
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
    });      $$('[data-remove-block]').forEach(b => b.onclick = () => {  
      editor.exerciseBlocks = editor.exerciseBlocks.filter(x => x.id !== b.dataset.removeBlock);  
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
      renderToday();  
      renderHome();  
      toast('Workout saved to queue');  
    };
    $('#cancelEditor').onclick = () => {  
      editor = null;  
      root.innerHTML = '';  
    };  
  }

function builderBlock(block, index) {  
  const field = (label, key, value, full = '', attrs = '') => `  
    <label class="field ${full}">  
      ${label}  
      <input class="input" data-block="${block.id}" data-field="${key}" value="${esc(value)}" ${attrs}>  
    </label>  
  `;

  return `  
    <div class="exercise-card">  
      <div class="exercise-title">  
        <b>${index + 1}. Planned exercise</b>  
        <button class="icon-btn" data-remove-block="${block.id}" title="Remove exercise">×</button>  
      </div>  
      <div class="set-form" style="margin-top:9px">  
        <label class="field full">  
          Exercise name  
          <input  
            class="input"  
            data-block="${block.id}"  
            data-field="exerciseName"  
            value="${esc(block.exerciseName)}"  
            list="knownExerciseList"  
            placeholder="Type to search known exercises"  
          >  
        </label>  
        ${field('Sets', 'targetSets', block.targetSets, '', `inputmode="numeric" pattern="[0-9]*" oninput="this.value = this.value.replace(/[^0-9]/g, '')"`)}  
        ${field('Reps / duration', 'targetRepsOrDuration', block.targetRepsOrDuration)}  
        ${field('Load (lbs)', 'targetWeightOrLoad', block.targetWeightOrLoad, '', `inputmode="decimal" pattern="[0-9]*[.]?[0-9]*" oninput="this.value = this.value.replace(/[^0-9.]/g, '').replace(/^([^.]*\\.)|\\./g, '$1')"`)}  
        ${field('Tempo', 'tempo', block.tempo)}  
        ${field('RIR', 'rir', block.rir, '', `inputmode="text" pattern="[0-9+\\-]*" oninput="this.value = this.value.replace(/[^0-9+\\-]/g, '')"`)}  
        ${field('Notes', 'notes', block.notes, 'full')}  
        ${field('Checkpoint', 'checkpoints', block.checkpoints, 'full')}  
      </div>  
    </div>  
  `;  
}  function startPlan(id) {  
  const plan = MomentumPlanner.load().find(x => x.id === id);  
  if (!plan) return;

  active = newSession(plan);  
  state.cockpit = MomentumPlanner.buildCockpitWorkout(plan);

  MomentumPlanner.mark(plan.id, 'active');  
  persist();  
  renderHome();  
  renderToday();  
  renderLog();  
  show('log');  
  toast('Planned workout started');  
}  
  function planForActive() {  
    return active.plannedWorkout || basePlan();  
  }

  function activeBlock() {  
    return planForActive().exerciseBlocks?.find(x => x.exerciseName === active.activeExercise) || {  
      exerciseName: active.activeExercise,  
      targetRepsOrDuration: '',  
      tempo: '',  
      rir: '',  
      notes: '',  
      checkpoints: ''  
    };  
  }

function allExercises() {  
  return knownExerciseNames();  
}  

function normalizeExerciseLookupName(name) {  
  return String(name || '')  
    .toLowerCase()  
    .replace(/[‐‑–—-]/g, ' ')  
    .replace(/[/]/g, ' ')  
    .replace(/[^a-z0-9\s]/g, '')  
    .replace(/\s+/g, ' ')  
    .trim();  
}

function knownExerciseNames() {  
  const sources = [  
    ...(planForActive().exerciseBlocks || []).map(x => x.exerciseName),  
    ...(editor?.exerciseBlocks || []).map(x => x.exerciseName),  
    ...MomentumData.recentExercises(),  
    ...data.core.map(x => x.ExerciseName).filter(Boolean)  
  ]  
    .map(x => String(x || '').trim())  
    .filter(Boolean);

  const seen = new Map();

  for (const name of sources) {  
    const key = normalizeExerciseLookupName(name);  
    if (!key) continue;  
    if (!seen.has(key)) seen.set(key, name);  
  }

  return [...seen.values()].sort((a, b) => a.localeCompare(b));  
} 

function isKnownExerciseName(name) {  
  const value = normalizeExerciseLookupName(name);  
  if (!value) return false;  
  return knownExerciseNames().some(x => normalizeExerciseLookupName(x) === value);  
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
  return knownExerciseNames().map(name =>  
    `<option value="${esc(name)}"></option>`  
  ).join('');  
}  

function getActiveCockpitExercise() {  
  if (!state.cockpit || !state.cockpit.exercises?.length) return null;  
  return state.cockpit.exercises[state.cockpit.exerciseIndex] || null;  
}

function renderCockpitHeader(cockpit) {  
  return `  
    <div class="active-session" style="margin-bottom:14px">  
      <div class="quiet">  
        ${cockpit.phaseId ? `Phase ${escapeHtml(cockpit.phaseId)} • ` : ''}  
        ${cockpit.week ? `Week ${escapeHtml(cockpit.week)} • ` : ''}  
        ${cockpit.day ? `Day ${escapeHtml(cockpit.day)}` : ''}  
      </div>  
      <div class="pill" style="margin-left:12px">  
        Exercise ${cockpit.exerciseIndex + 1} of ${cockpit.exercises.length}  
      </div>  
    </div>  
  `;  
}  
function renderCompletedSets(ex) {  
  const prescribed = Number(ex.prescribedSets || 0);  
  const completed = Array.isArray(ex.completedSets) ? ex.completedSets : [];  
  const total = Math.max(prescribed, completed.length);

  return Array.from({ length: total }, (_, idx) => {  
    const i = idx + 1;  
    const set = completed[idx];  
    const isExtra = i > prescribed;

    if (!set) {  
      return `  
        <div class="log-row">  
          <div><b>${i}</b></div>  
          <div>  
            <div class="set-main">—</div>  
            <div class="set-meta">Pending</div>  
          </div>  
        </div>  
      `;  
    }

    const meta = [  
      isExtra ? 'Extra set' : '',  
      set.actualTempo ? `Tempo ${escapeHtml(set.actualTempo)}` : '',  
      set.actualRir ? `RIR ${escapeHtml(set.actualRir)}` : '',  
      set.note ? `Note: ${escapeHtml(set.note)}` : ''  
    ].filter(Boolean).join(' · ');

    return `  
      <div class="log-row">  
        <div><b>${isExtra ? `${i}*` : i}</b></div>  
        <div>  
          <div class="set-main">  
            ${escapeHtml(formatLoadLbs(normalizeLoadValue(set.actualLoad || '')))} × ${escapeHtml(set.actualRepsOrDuration || '—')}  
          </div>  
          <div class="set-meta">${meta || 'Logged'}</div>  
        </div>  
      </div>  
    `;  
  }).join('');  
}  

function renderCockpitPrescription(ex) {  
  const parts = [  
    (ex.prescribedSets || ex.targetSets) ? `${ex.prescribedSets || ex.targetSets} sets` : '',  
    ex.prescribedRepsOrDuration || ex.targetRepsOrDuration || '',  
    (ex.prescribedLoad || ex.targetWeightOrLoad) ? `${normalizeLoadValue(ex.prescribedLoad || ex.targetWeightOrLoad)} lbs` : '',  
    ex.prescribedTempo ? `Tempo ${ex.prescribedTempo}` : '',  
    ex.prescribedRir ? `RIR ${ex.prescribedRir}` : '',  
    ex.prescribedRest || ex.rest ? `Rest ${parseRestTopEndForDisplay(ex.prescribedRest || ex.rest)}` : ''  
  ].filter(Boolean);

  const notes = [  
    ex.notes || '',  
    ex.checkpoints || ''  
  ].filter(Boolean).join(' · ');

  return `  
    <div class="card section">  
      <div class="eyebrow">Prescription</div>  
      <div style="margin-top:6px">  
        <b>${escapeHtml(parts.join(' · ') || 'No structured prescription')}</b>  
      </div>  
      ${notes ? `<div class="quiet" style="margin-top:8px">${escapeHtml(notes)}</div>` : ''}  
    </div>  
  `;  
}  

function renderCockpitExercise(ex) {  
  const cockpit = state.cockpit;  
  const title = ex.name || ex.exerciseName || ex.title || 'Exercise';

  const targetSets = Number(  
    ex.prescribedSets ?? ex.targetSets ?? ex.setsTarget ?? ex.sets ?? 0  
  );  
  const completedCount = Array.isArray(ex.completedSets) ? ex.completedSets.length : 0;  
  const complete = targetSets > 0 && completedCount >= targetSets;

  return `  
    <div class="card section">  
      <div class="eyebrow">Exercise ${cockpit.exerciseIndex + 1} of ${cockpit.exercises.length}</div>  
      <h2>${escapeHtml(title)}</h2>

      ${renderCockpitPrescription(ex)}

      ${ex.establishLoad ? renderCockpitWorkingLoad(ex) : ''}

      ${ex.optional && !ex.started && !ex.skipped ? `  
        <div class="actions">  
          <button class="secondary" onclick="startOptionalExercise()">Start optional</button>  
          <button class="secondary" onclick="skipOptionalExercise()">Skip optional</button>  
        </div>  
      ` : `  
        <div class="actions">  
          <button class="primary" onclick="logCockpitSetAction()">  
            ${complete ? 'Log extra set' : 'Log Set'}  
          </button>  
          <button class="secondary" onclick="openCockpitDifferentToday()">Different today</button>  
        </div>  
      `}

      ${renderCockpitDifferentToday(ex)}

      <div class="session-log">  
        <h3>Completed sets</h3>  
        ${renderCompletedSets(ex)}  
      </div>

      <div class="actions" style="margin-top:18px">  
        <button class="secondary" onclick="cockpitPrev()">Previous exercise</button>  
        <button class="secondary" onclick="cockpitNext()">Next exercise</button>  
        <button class="secondary" onclick="deleteLastCockpitSet()">Delete last set</button>  
      </div>

      <div style="margin-top:18px">  
        ${renderRestTimer()}  
      </div>

      <div class="actions" style="margin-top:18px; justify-content:flex-end">  
        <button class="primary" onclick="finishWorkoutAction()">Finish workout</button>  
      </div>  
    </div>  
  `;  
}

function saveDifferentTodayAndLogSet() {  
  const cockpit = state.cockpit;  
  if (!cockpit || !Array.isArray(cockpit.exercises)) return;

  const current = cockpit.exercises[cockpit.exerciseIndex];  
  if (!current) return;

  try {  
    const loadInput = document.getElementById('cockpitEditLoad');  
    const repsInput = document.getElementById('cockpitEditReps');  
    const tempoInput = document.getElementById('cockpitEditTempo');  
    const rirInput = document.getElementById('cockpitEditRir');  
    const noteInput = document.getElementById('cockpitEditNote');

    const loadValue = normalizeLoadValue(loadInput ? loadInput.value : '');  
    const repsRaw = repsInput ? String(repsInput.value || '').trim() : '';  
    const tempoValue = tempoInput ? tempoInput.value.trim() : '';  
    const rirValue = normalizeRirValue(  
      rirInput ? rirInput.value : '',  
      current.prescribedRir || ''  
    );  
    const noteValue = noteInput ? noteInput.value.trim() : '';

    const actualLoad =  
      loadValue || normalizeLoadValue(current.workingLoad || current.prescribedLoad || '');

    const actualRepsOrDuration = repsRaw  
      ? (  
          current.timed  
            ? `${normalizeNumericEntry(repsRaw, false)} sec`  
            : normalizeRepValue(repsRaw, current.prescribedRepsOrDuration || '')  
        )  
      : normalizeRepValue('', current.prescribedRepsOrDuration || '');

    const actualTempo = tempoValue || current.prescribedTempo || '';  
    const actualRir = rirValue || normalizeRirValue('', current.prescribedRir || '');

    current.completedSets = Array.isArray(current.completedSets) ? current.completedSets : [];  
    current.completedSets.push({  
      actualLoad,  
      actualRepsOrDuration,  
      actualTempo,  
      actualRir,  
      note: noteValue,  
      at: new Date().toISOString()  
    });

    state.cockpitEditOpen = false;

    startRestTimer(  
      parseRestSeconds(  
        current.prescribedRest ||  
        current.rest ||  
        (String(current.notes || '').match(/rest:\s*([^\|]+)/i)?.[1]?.trim()) ||  
        '90 sec'  
      )  
    );

    renderLog();  
    toast('Set logged');  
  } catch (err) {  
    toast(err.message || 'Could not save changes.');  
  }  
}  



function selectedReviewedSession() {  
  const sessions = getDone();  
  if (!sessions.length) return null;  
  return sessions.find(x => x.id === selectedReviewId) || sessions[0] || null;  
}  

function renderLog() {  
  const root = document.getElementById('log');  
  if (!root) return;

  if (state.cockpit && state.cockpit.exercises?.length) {  
    const ex = getActiveCockpitExercise();

    root.innerHTML = `  
      <div class="log-shell">  
        ${renderCockpitHeader(state.cockpit)}  
        ${renderCockpitExercise(ex)}  
      </div>  
    `;  
    return;  
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
            <b>Status:</b> ${esc(reviewed.status)}<br>  
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

  root.innerHTML = `  
    <div class="log-shell">  
      <header class="active-session">  
        <div>  
          <div class="eyebrow">${active.planId ? 'Planned session · autosaved' : 'Ad hoc session · autosaved'}</div>  
          <h1>${esc(active.workoutName)}</h1>  
          <div id="timer">${clock(Math.max(0, Math.floor((Date.now() - new Date(active.startedAt)) / 1000)))}</div>  
        </div>  
        <div class="session-tools">  
          <button class="secondary" id="finish">Finish</button>  
          <button class="danger" id="discard">Discard</button>  
        </div>  
      </header>

      ${active.planId ? `  
        <article class="card" style="margin-bottom:12px">  
          <div class="eyebrow">Planned context</div>  
          <b>${esc(planForActive().title)}</b> · ${esc(planSummary(planForActive()))}  
        </article>  
      ` : ''}

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
                  inputmode="numeric"  
                  pattern="[0-9]*"  
                  placeholder="0"  
                  oninput="this.value = this.value.replace(/[^0-9]/g, '')"  
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
              <label class="field full">Questions for Coach<textarea data-context="coachQuestions">${esc(active.coachQuestions)}</textarea></label>  
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

function renderPicker(query = '') {  
  const root = $('#exercisePicker');  
  if (!root) return;

  const planned = new Set((planForActive().exerciseBlocks || []).map(x => x.exerciseName));  
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

function bindLog() {  
  let type = 'reps';  
  let rir = $('.chip.active')?.dataset.rir || '';

  const searchExercise = $('#searchExercise');  
  if (searchExercise) {  
    searchExercise.oninput = e => renderPicker(e.target.value);  
  }

  $$('[data-type]').forEach(b => b.onclick = () => {  
    type = b.dataset.type;  
    $$('[data-type]').forEach(x => x.classList.toggle('active', x === b));

    const resultInput = $('#result');  
    if (resultInput) {  
      resultInput.value = normalizeNumericEntry(resultInput.value, false);  
      resultInput.placeholder = type === 'duration' ? 'Seconds' : 'Reps';  
    }  
  });

  $$('[data-rir]').forEach(b => b.onclick = () => {  
    rir = b.dataset.rir;  
    $$('[data-rir]').forEach(x => x.classList.toggle('active', x === b));  
  });

  const addSet = $('#addSet');  
  if (addSet) {  
    addSet.onclick = () => {  
      if (!isKnownExerciseName(active.activeExercise)) {  
        toast('Choose a known exercise first');  
        return;  
      }

      const load = normalizeNumericEntry($('#load')?.value || '', true);  
      const result = normalizeNumericEntry($('#result')?.value || '', false);

      if (!load && !result) {  
        toast('Enter load or reps first');  
        return;  
      }

      const tempo = [$('#tempoE').value.trim(), $('#tempoP').value.trim(), $('#tempoC').value.trim()].filter(Boolean).join('-');

      active.sets.push({  
        id: uid(),  
        exercise: active.activeExercise,  
        load,  
        result,  
        resultType: type,  
        tempo,  
        rir,  
        checkpoint: $('#checkpoint').value.trim(),  
        note: $('#note').value.trim(),  
        at: new Date().toISOString()  
      });

      persist();  
      renderLog();  
      toast('Set saved locally');  
    };  
  }

  const duplicateLast = $('#duplicateLast');  
  if (duplicateLast) {  
    duplicateLast.onclick = () => {  
      const prior = [...active.sets].reverse().find(x => x.exercise === active.activeExercise);  
      if (!prior) {  
        toast('No completed set to duplicate');  
        return;  
      }  
      active.sets.push({  
        ...prior,  
        id: uid(),  
        at: new Date().toISOString()  
      });  
      persist();  
      renderLog();  
      toast('Previous set duplicated');  
    };  
  }

  const finishBtn = $('#finish');  
  if (finishBtn) finishBtn.onclick = finish;

  const discardBtn = $('#discard');  
  if (discardBtn) discardBtn.onclick = discardActiveWorkout;

  $$('[data-delete-set]').forEach(b => b.onclick = () => {  
    active.sets = active.sets.filter(x => x.id !== b.dataset.deleteSet);  
    persist();  
    renderLog();  
  });  
}  
function logMarkup(session) {  
  if (!session.sets.length) {  
    return '<div class="empty">No sets logged yet. Completed sets remain here after refresh.</div>';  
  }

  const groups = session.sets.reduce((all, set) => {  
    const name = set.exercise || set.exerciseName || set.name || 'Unnamed exercise';  
    (all[name] ??= []).push(set);  
    return all;  
  }, {});

  return Object.entries(groups).map(([name, sets]) => `  
    <div class="exercise-log">  
      <div class="exercise-title"><b>${esc(name)}</b> ${sets.length} set${sets.length === 1 ? '' : 's'}</div>  
      ${sets.map((set, i) => `  
        <div class="log-row">  
          <b>${i + 1}</b>  
          <div>  
            <div class="set-main">${esc(formatLoadLbs(normalizeLoadValue(set.load || set.actualLoad || '')))} × ${esc(set.result || set.repsOrDuration || set.actualRepsOrDuration || '—')}</div>  
            <div class="set-meta">${[  
              set.tempo ? `Tempo ${esc(set.tempo)}` : '',  
              set.rir ? `RIR ${esc(set.rir)}` : '',  
              esc(set.note || set.checkpoint || 'No note')  
            ].filter(Boolean).join(' · ')}</div>  
          </div>  
          <div class="row-actions">  
            <button class="icon-btn" data-delete-set="${set.id || ''}" title="Delete set">×</button>  
          </div>  
        </div>  
      `).join('')}  
    </div>  
  `).join('');  
}    

function finish() {  
  if (!active.sets.length) {  
    toast('Log at least one set first');  
    return;  
  }

  const complete = {  
    ...clone(active),  
    id: uid(),  
    status: 'staged',  
    completedAt: new Date().toISOString()  
  };

  saveDone([complete, ...getDone()]);  
  selectedReviewId = complete.id;

  if (active.planId) {  
    MomentumPlanner.mark(active.planId, 'completed');  
  }

  active = newSession();  
  state.cockpit = null;  
  state.cockpitEditOpen = false;  
  state.restTimer = null;  
  persist();

  renderHome();  
  renderToday();  
  renderReview();  
  renderLog();  
  show('review');  
  toast('Workout complete. Review before sharing.');  
}  
window.startCockpitForWorkout = startCockpitForWorkout;  
window.logCockpitSetAction = logCockpitSetAction;  
window.openCockpitDifferentToday = openCockpitDifferentToday;  
window.cockpitPrev = cockpitPrev;  
window.cockpitNext = cockpitNext;  
window.startOptionalExercise = startOptionalExercise;  
window.skipOptionalExercise = skipOptionalExercise;  
window.cancelCockpitDifferentToday = cancelCockpitDifferentToday;  
window.saveDifferentTodayAndLogSet = saveDifferentTodayAndLogSet;  
window.startCurrentExerciseRestTimer = startCurrentExerciseRestTimer;  
window.stopRestTimer = stopRestTimer;
window.finishWorkoutAction = finishWorkoutAction;  
window.deleteLastCockpitSet = deleteLastCockpitSet;      

function debrief(session) {  
  const groups = (session.sets || []).reduce((all, set) => {  
    const name = set.exercise || set.exerciseName || set.name || 'Unnamed exercise';  
    (all[name] ??= []).push(set);  
    return all;  
  }, {});

  const elapsedMs = Math.max(  
    0,  
    new Date(session.completedAt || Date.now()) - new Date(session.startedAt || Date.now())  
  );

  const mins = Math.max(1, Math.ceil(elapsedMs / 60000));

  return `Phase: ${session.phase || '—'} | Week: ${session.week || '—'} | Day: ${session.day || '—'}  
Date: ${dateIso(session.completedAt || session.startedAt)}  
Workout: ${session.workoutName || 'Momentum session'}

SESSION SUMMARY  
Duration: ${mins} min  
Total sets: ${(session.sets || []).length}  
Exercises: ${Object.keys(groups).length}

SET LOG  
${Object.entries(groups).map(([name, sets]) => `${name}  
${sets.map((s, i) => {  
  const load = formatLoadLbs(normalizeLoadValue(s.load || s.actualLoad || ''));  
  const result = s.result || s.repsOrDuration || s.actualRepsOrDuration || '?';  
  const parts = [`  Set ${i + 1}: ${load} x ${result}`];

  if (s.tempo) parts.push(`Tempo ${s.tempo}`);  
  if (s.rir) parts.push(`RIR ${s.rir}`);  
  if (s.checkpoint) parts.push(`Checkpoint: ${s.checkpoint}`);  
  if (s.note) parts.push(`Note: ${s.note}`);

  return parts.join(' | ');  
}).join('\n')}`).join('\n\n')}

QUESTIONS FOR COACH  
${session.coachQuestions || 'None recorded'}`;  
}    

function csv(session) {  
  const fields = [  
    'Routine_Name',  
    'Activity_Date',  
    'Exercise_Name',  
    'Exercise_Muscle_Groups',  
    'Exercise_Equipment',  
    'Exercise_Date_Time',  
    'Repetitions_Or_Duration',  
    'Weight_Or_Distance',  
    'Use_Metric',  
    'Note',  
    'Superset'  
  ];

  const q = v => `"${String(v ?? '').replaceAll('"', '""')}"`;

  const rows = (session.sets || []).map((s, i) => ({  
    Routine_Name: session.workoutName || '',  
    Activity_Date: dateIso(session.completedAt || session.startedAt),  
    Exercise_Name: s.exercise || s.exerciseName || s.name || '',  
    Exercise_Muscle_Groups: '',  
    Exercise_Equipment: '',  
    Exercise_Date_Time: s.at || new Date(new Date(session.startedAt).getTime() + i * 1000).toISOString(),  
    Repetitions_Or_Duration: s.result || s.repsOrDuration || s.actualRepsOrDuration || '',  
    Weight_Or_Distance: normalizeLoadValue(s.load || s.actualLoad || ''),  
    Use_Metric: 'FALSE',  
    Note: [  
      s.tempo && `Tempo ${s.tempo}`,  
      s.rir && `RIR ${s.rir}`,  
      s.checkpoint,  
      s.note  
    ].filter(Boolean).join('; '),  
    Superset: ''  
  }));

  return [fields.join(','), ...rows.map(row => fields.map(key => q(row[key])).join(','))].join('\r\n');  
}  

  function comparison(session) {  
  const plan = session.plannedWorkout?.exerciseBlocks || [];

  const actual = session.sets.reduce((all, s) => {  
    const name = s.exercise || s.exerciseName || s.name || 'Unnamed exercise';  
    all[name] = (all[name] || 0) + 1;  
    return all;  
  }, {});

  if (!plan.length) {  
    return '<div class="quiet">This ad hoc session has no linked planned workout.</div>';  
  }

  return `  
    <div class="stack">  
      ${plan.map(block => {  
        const plannedName = block.exerciseName || 'Unnamed exercise';  
        const performed = actual[plannedName] || 0;

        return `  
          <div class="flag">  
            <b>${esc(plannedName)}</b><br>  
            Planned: ${esc([  
              block.targetSets && `${block.targetSets} sets`,  
              block.targetRepsOrDuration,  
              block.targetWeightOrLoad && `${block.targetWeightOrLoad} lb`,  
              block.tempo && `Tempo ${block.tempo}`,  
              block.rir && `RIR ${block.rir}`  
            ].filter(Boolean).join(' · ') || 'No structured target')}  
            <br>  
            Performed: ${performed} set${performed === 1 ? '' : 's'}  
          </div>  
        `;  
      }).join('')}

      ${Object.keys(actual)  
        .filter(name => !plan.some(x => (x.exerciseName || 'Unnamed exercise') === name))  
        .map(name => `  
          <div class="flag">  
            <b>${esc(name)}</b><br>  
            Performed as an unplanned exercise: ${actual[name]} sets.  
          </div>  
        `).join('')}  
    </div>  
  `;  
}  

function renderReview() {  
  const sessions = getDone();  
  if (!selectedReviewId && sessions[0]) selectedReviewId = sessions[0].id;  
  const selected = sessions.find(x => x.id === selectedReviewId) || sessions[0] || null;

  $('#review').innerHTML = `  
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

function hydrateCockpitFromSession(cockpit, session) {  
  if (!cockpit || !Array.isArray(cockpit.exercises)) return cockpit;

  const next = clone(cockpit);  
  const sets = Array.isArray(session?.sets) ? session.sets : [];

  next.exercises.forEach(ex => {  
    const exerciseName = ex.exerciseName || '';  
    ex.completedSets = sets  
      .filter(set => {  
        const setName = set.exercise || set.exerciseName || set.name || '';  
        return setName === exerciseName;  
      })  
      .map((set, idx) => ({  
        setNumber: set.setNumber || (idx + 1),  
        actualLoad: normalizeLoadValue(set.actualLoad || set.load || ''),  
        actualRepsOrDuration: set.actualRepsOrDuration || set.repsOrDuration || set.result || '',  
        actualTempo: set.actualTempo || set.tempo || '',  
        actualRir: set.actualRir || set.rir || '',  
        note: set.note || '',  
        extra: !!set.extra,  
        loggedAt: set.at || new Date().toISOString()  
      }));

    if (ex.completedSets.length) {  
      ex.started = true;  
      ex.skipped = false;  
    }

    if (ex.establishLoad && !ex.workingLoad && ex.completedSets.length) {  
      ex.workingLoad = ex.completedSets[0].actualLoad || '';  
    }  
  });

  return next;  
}  
  
function restoreStagedSession(sessionId) {  
  const sessions = getDone();  
  const idx = sessions.findIndex(x => x.id === sessionId);  
  if (idx === -1) return false;

  const session = clone(sessions[idx]);

  sessions.splice(idx, 1);  
  saveDone(sessions);

  active = {  
    ...clone(session),  
    status: 'draft',  
    completedAt: '',  
    updatedAt: new Date().toISOString()  
  };

  const rebuiltCockpit = active?.plannedWorkout?.exerciseBlocks?.length  
    ? MomentumPlanner.buildCockpitWorkout(active.plannedWorkout)  
    : null;

  state.cockpit = hydrateCockpitFromSession(rebuiltCockpit, active);  
  state.cockpitEditOpen = false;  
  state.restTimer = null;  
  persist();

  if (active.planId) {  
    MomentumPlanner.mark(active.planId, 'active');  
  }

  selectedReviewId = sessions[0]?.id || '';

  renderHome();  
  renderToday();  
  renderReview();  
  renderLog();  
  show('log');  
  toast('Workout restored to Log for revision.');  
  return true;  
}  
function bindReview(selected) {  
  const reviewQuestions = document.getElementById('reviewQuestions');  
  if (reviewQuestions) {  
    reviewQuestions.oninput = () => {  
      updateReviewQuestions(selected.id, reviewQuestions.value);  
    };  
  }

  const copyDebrief = document.getElementById('copyDebrief');  
  if (copyDebrief) {  
    copyDebrief.onclick = async () => {  
      const text = debrief(selected);  
      await navigator.clipboard.writeText(text);  
      toast('Debrief copied');  
    };  
  }

  const exportCsv = document.getElementById('exportCsv');  
  if (exportCsv) {  
    exportCsv.onclick = () => downloadFile(`${selected.workoutName || 'session'}.csv`, csv(selected), 'text/csv');  
  }

  
}  

function reviewDetail(session) {  
  const isStaged = session.status === 'staged';  
  const isShared = session.status === 'shared';

  return `  
    <div class="eyebrow">Session review</div>  
    <h1 style="font-size:25px">${esc(session.workoutName)}</h1>  
    <p class="quiet">${esc(planSummary({ phaseId: session.phase, week: session.week, day: session.day }))} · ${dateText(session.completedAt)}</p>

    ${isStaged ? `  
      <div class="signal-card" style="margin:12px 0">  
        <b>Workout complete</b><br>  
        Logging is finished. Review Questions for Coach here, or return to Log to revise completed sets before finalizing.  
      </div>  
    ` : ''}

    ${isShared ? `  
      <div class="signal-card" style="margin:12px 0">  
        <b>Workout finalized</b><br>  
        The Coach-ready debrief has already been copied once. You can still review this session or export CSV.  
      </div>  
    ` : ''}

    <section class="metrics" style="margin:14px 0">  
      ${metric('Sets', session.sets.length, 'Completed')}  
      ${metric('Exercises', new Set(session.sets.map(x => x.exercise)).size, 'Logged')}  
      ${metric('Plan link', session.planId ? 'Yes' : 'Ad hoc', session.planId ? 'Prescription retained' : 'No queue source')}  
      ${metric('Status', session.status || 'staged', isStaged ? 'Return to Log to revise' : 'Saved')}  
    </section>

    <h2>Planned vs performed</h2>  
    ${comparison(session)}

    <h2 style="margin-top:16px">Performed session</h2>  
    ${logMarkup(session)}

    <label class="field" style="margin-top:12px">Questions for Coach<textarea id="reviewQuestions">${esc(session.coachQuestions || '')}</textarea></label>

    <div class="export-box">  
      ${isStaged ? '<button class="secondary" id="undoFinish">Return to Log for revisions</button>' : ''}  
      <button class="primary" id="copyDebrief">Finalize workout - Create/copy Coach-ready debrief</button>  
      <button class="secondary" id="exportCsv">Export CSV</button>  
    </div>  
  `;  
}

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

function renderHistory() {  
  const historical = MomentumData.sessions();  
  const done = getDone();

  $('#history').innerHTML = `  
    <article class="card">  
      <div class="eyebrow">Training history</div>  
      <h1 style="font-size:27px">Patterns in context</h1>  
      <p class="quiet">Historical Markdown data and locally completed Momentum sessions.</p>

      <div class="history-filters">  
        <label class="field">Movement<input class="input" id="historyMove" placeholder="Filter sessions"></label>  
        <label class="field">Source  
          <select id="historySource">  
            <option value="all">All data</option>  
            <option value="momentum">Momentum only</option>  
            <option value="historical">Historical only</option>  
          </select>  
        </label>  
      </div>

      <div id="historyRows"></div>  
    </article>  
  `;

  const draw = () => {  
    const q = $('#historyMove').value.toLowerCase();  
    const source = $('#historySource').value;

    const rows = [  
      ...(source !== 'momentum'  
        ? historical.map(x => ({ date: x.date, name: x.name, sets: x.sets, source: 'Historical' }))  
        : []),  
      ...(source !== 'historical'  
        ? done.map(x => ({ date: x.completedAt, name: x.workoutName, sets: x.sets.length, source: 'Momentum', id: x.id }))  
        : [])  
    ]  
      .filter(x => (x.name || '').toLowerCase().includes(q))  
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));

    $('#historyRows').innerHTML = rows.length  
      ? `  
        <table class="table">  
          <thead><tr><th>Date</th><th>Session</th><th>Sets</th><th>Source</th></tr></thead>  
          <tbody>  
            ${rows.slice(0, 100).map(x => `  
              <tr>  
                <td>${dateText(x.date)}</td>  
                <td><b>${esc(x.name || 'Untitled')}</b></td>  
                <td>${x.sets}</td>  
                <td>${x.source}</td>  
              </tr>  
            `).join('')}  
          </tbody>  
        </table>  
      `  
      : '<div class="empty">No sessions match this filter.</div>';  
  };

  $('#historyMove').oninput = draw;  
  $('#historySource').oninput = draw;  
  draw();  
}

renderHome();  
renderToday();  
renderLog();  
renderReview();  
renderHistory();

setInterval(() => {  
  const el = $('#timer');  
  if (el) {  
    el.textContent = clock(  
      Math.max(0, Math.floor((Date.now() - new Date(active.startedAt)) / 1000))  
    );  
  }  
}, 1000);

const m = MomentumData.metrics();  
if ($('#dataStatus')) {  
  $('#dataStatus').textContent = m.lastDate  
    ? `Data through ${m.lastDate}`  
    : 'Local-first mode';  
}

})();  

