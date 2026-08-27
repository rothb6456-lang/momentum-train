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
      '&': '&',  
      '<': '<',  
'>': '>',  
"'": "'",  
'"': '"'  
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
      readiness: { energy: '', shoulder: '', grip: '', note: '' },  
      shoulder: { pre: '', during: '', post: '' },  
      gripNotes: '',  
      coachQuestions: ''  
    };  
  }

let active;  
const state = {  
  cockpit: null  
};

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
    .replace(/&/g, '&')  
    .replace(/</g, '<')  
    .replace(/>/g, '>')  
    .replace(/"/g, '"')  
    .replace(/'/g, '&#39;');  
}  

function logCockpitSetAction() {  
  const cockpit = state.cockpit;  
  if (!cockpit) return;

  const ex = getActiveCockpitExercise();  
  if (!ex) return;

  try {  
    let next = cockpit;

    if (ex.establishLoad) {  
      const input = document.getElementById('cockpitWorkingLoad');  
      const load = input ? input.value : '';  
      next = MomentumPlanner.setCockpitWorkingLoad(next, cockpit.exerciseIndex, load);  
    }

    next = MomentumPlanner.logCockpitSet(next, next.exerciseIndex);  
    state.cockpit = next;  
    renderLog();  
  } catch (err) {  
    showToast(err.message || 'Could not log set.');  
  }  
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
  renderLog();  
}

function cockpitNext() {  
  if (!state.cockpit) return;  
  state.cockpit.exerciseIndex = Math.min(state.cockpit.exercises.length - 1, state.cockpit.exerciseIndex + 1);  
  renderLog();  
}

function openCockpitDifferentToday() {  
  showToast('Sprint 1B: exception editing coming next.');  
}  

  let active;  
  try {  
    active = JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null');  
  } catch {  
    active = null;  
  }  
  if (!active || !Array.isArray(active.sets)) active = newSession();

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
          <div class="insight"><i class="dot amber"></i><div><b>Shoulder and grip are capture fields</b> Momentum preserves observed tolerance rather than generating a readiness score.</div></div>  
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
            <button class="secondary" id="referenceCard">Use Phase 9 reference card</button>  
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
    $('#pasteCard').onclick = () => {  
      editor = MomentumPlanner.blankWorkout();  
      editor.sourceType = 'chatgpt';  
      renderEditor('paste');  
    };

    $('#blankCard').onclick = () => {  
      editor = MomentumPlanner.blankWorkout();  
      renderEditor('builder');  
    };

    $('#referenceCard').onclick = () => {  
      editor = clone(basePlan());  
      editor.id = MomentumPlanner.blankWorkout().id;  
      editor.status = 'queued';  
      editor.sourceType = 'reference';  
      renderEditor('builder');  
    };

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
      if (block) block[input.dataset.field] = input.value;  
    });

    $$('[data-remove-block]').forEach(b => b.onclick = () => {  
      editor.exerciseBlocks = editor.exerciseBlocks.filter(x => x.id !== b.dataset.removeBlock);  
      if (!editor.exerciseBlocks.length) editor.exerciseBlocks = [MomentumPlanner.blankBlock()];  
      renderEditor('builder');  
    });

    $('#addBlock').onclick = () => {  
      editor.exerciseBlocks.push(MomentumPlanner.blankBlock(editor.exerciseBlocks.length + 1));  
      renderEditor('builder');  
    };

    $('#saveQueue').onclick = () => {  
      editor.exerciseBlocks.forEach((x, i) => x.order = i + 1);  
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
    const field = (label, key, value, full = '') => `  
      <label class="field ${full}">  
        ${label}  
        <input class="input" data-block="${block.id}" data-field="${key}" value="${esc(value)}">  
      </label>  
    `;

    return `  
      <div class="exercise-card">  
        <div class="exercise-title">  
          <b>${index + 1}. Planned exercise</b>  
          <button class="icon-btn" data-remove-block="${block.id}" title="Remove exercise">×</button>  
        </div>  
        <div class="set-form" style="margin-top:9px">  
          ${field('Exercise name', 'exerciseName', block.exerciseName, 'full')}  
          ${field('Sets', 'targetSets', block.targetSets)}  
          ${field('Reps / duration', 'targetRepsOrDuration', block.targetRepsOrDuration)}  
          ${field('Load', 'targetWeightOrLoad', block.targetWeightOrLoad)}  
          ${field('Tempo', 'tempo', block.tempo)}  
          ${field('RIR', 'rir', block.rir)}  
          ${field('Notes', 'notes', block.notes, 'full')}  
          ${field('Checkpoint', 'checkpoints', block.checkpoints, 'full')}  
        </div>  
      </div>  
    `;  
  }

  function startPlan(id) {  
    const plan = MomentumPlanner.load().find(x => x.id === id);  
    if (!plan) return;  
    active = newSession(plan);  
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
    return [...new Set([  
      ...(planForActive().exerciseBlocks || []).map(x => x.exerciseName),  
      ...MomentumData.recentExercises(),  
      ...data.core.map(x => x.ExerciseName).filter(Boolean)  
    ].filter(Boolean))];  
  }

function getActiveCockpitExercise() {  
  if (!state.cockpit || !state.cockpit.exercises?.length) return null;  
  return state.cockpit.exercises[state.cockpit.exerciseIndex] || null;  
}

function renderCockpitHeader(cockpit) {  
  return `  
    <div class="active-session">  
      <div>  
        <div class="eyebrow">Execute</div>  
        <h1>${escapeHtml(cockpit.title || 'Workout')}</h1>  
        <div class="quiet">  
          ${cockpit.phaseId ? `Phase ${escapeHtml(cockpit.phaseId)} • ` : ''}  
          ${cockpit.week ? `Week ${escapeHtml(cockpit.week)} • ` : ''}  
          ${cockpit.day ? `Day ${escapeHtml(cockpit.day)}` : ''}  
        </div>  
      </div>  
      <div class="pill">  
        Exercise ${cockpit.exerciseIndex + 1} of ${cockpit.exercises.length}  
      </div>  
    </div>  
  `;  
}

function renderCompletedSets(ex) {  
  const total = ex.prescribedSets || 0;  
  const rows = [];

  for (let i = 1; i <= total; i++) {  
    const set = ex.completedSets[i - 1];  
    if (set) {  
      rows.push(`  
        <div class="log-row">  
          <div><b>${i}</b></div>  
          <div class="set-main">  
            ${escapeHtml(set.actualLoad || '—')} × ${escapeHtml(set.actualRepsOrDuration || '—')}  
          </div>  
          <div class="set-meta">  
            ${escapeHtml(set.actualTempo || '')}${set.actualTempo && set.actualRir ? ' | ' : ''}  
            ${set.actualRir ? `RIR ${escapeHtml(set.actualRir)}` : ''}  
          </div>  
        </div>  
      `);  
    } else {  
      rows.push(`  
        <div class="log-row">  
          <div><b>${i}</b></div>  
          <div class="set-main">—</div>  
          <div class="set-meta">Pending</div>  
        </div>  
      `);  
    }  
  }

  return rows.join('');  
}

function renderCockpitExercise(ex) {  
  const complete = ex.completedSets.length >= ex.prescribedSets && ex.prescribedSets > 0;

  return `  
    <div class="card">  
      <div class="card-head">  
        <div>  
          <div class="eyebrow">${ex.optional ? 'Optional exercise' : 'Active exercise'}</div>  
          <h2>${escapeHtml(ex.exerciseName)}</h2>  
          <div class="quiet">  
            ${ex.unilateral ? 'Bilateral set entry for unilateral work' : ''}  
          </div>  
        </div>  
        ${complete ? '<div class="pill">Exercise complete</div>' : ''}  
      </div>

      <div class="stack">  
        <div class="signal-card">  
          <b>${escapeHtml(ex.prescribedSets)} x ${escapeHtml(ex.prescribedRepsOrDuration)}</b>  
          <span>  
            Load: ${escapeHtml(ex.workingLoad || ex.prescribedLoad || '—')}<br>  
            Tempo: ${escapeHtml(ex.prescribedTempo || '—')}<br>  
            RIR: ${escapeHtml(parseTopEndForDisplay(ex.prescribedRir) || '—')}<br>  
            Rest: ${escapeHtml(parseRestTopEndForDisplay(ex.prescribedRest) || '—')}  
          </span>  
        </div>

        ${ex.establishLoad ? `  
          <div class="field">  
            <label>Working load</label>  
            <input class="input" id="cockpitWorkingLoad" value="${escapeHtml(ex.workingLoad || '')}" placeholder="Enter working load">  
          </div>  
        ` : ''}

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

        <div class="session-log">  
          <h3>Completed sets</h3>  
          ${renderCompletedSets(ex)}  
        </div>  
      </div>  
    </div>  
  `;  
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
        <div class="actions section">  
          <button class="secondary" onclick="cockpitPrev()" ${state.cockpit.exerciseIndex === 0 ? 'disabled' : ''}>Previous</button>  
          <button class="secondary" onclick="cockpitNext()" ${state.cockpit.exerciseIndex === state.cockpit.exercises.length - 1 ? 'disabled' : ''}>Next</button>  
        </div>  
      </div>  
    `;  
    return;  
  }

  const block = activeBlock();

  $('#log').innerHTML = `  
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
          <input id="searchExercise" class="input" placeholder="Search or add custom exercise">  
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
                block.targetWeightOrLoad && `${block.targetWeightOrLoad} lb`,  
                block.tempo && `Tempo ${block.tempo}`,  
                block.rir && `RIR ${block.rir}`  
              ].filter(Boolean).join(' · ') || 'No planned target')}  
            </p>

            <div class="set-form">  
              <label class="field">Load (lb)<input id="load" class="input" inputmode="decimal" placeholder="0"></label>  
              <label class="field">Result<input id="result" class="input" inputmode="decimal" placeholder="Reps / sec"></label>

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
              <label class="field full">Joint / performance note<textarea id="note" placeholder="Shoulder, grip, substitution, or performance detail"></textarea></label>  
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
              <label class="field">Shoulder pre-session<textarea data-context="pre">${esc(active.shoulder.pre)}</textarea></label>  
              <label class="field">During pressing<textarea data-context="during">${esc(active.shoulder.during)}</textarea></label>  
              <label class="field">Post-session<textarea data-context="post">${esc(active.shoulder.post)}</textarea></label>  
              <label class="field">Grip status<textarea data-context="gripNotes">${esc(active.gripNotes)}</textarea></label>  
              <label class="field full">Questions for Coach<textarea data-context="coachQuestions">${esc(active.coachQuestions)}</textarea></label>  
            </div>  
          </article>  
        </section>  
      </div>  
    </div>  
  `;

  renderPicker();  
  bindLog();  
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
          <small>${planned.has(x) ? 'Planned workout' : 'Recent / exercise library'}</small>  
        </button>  
      `).join('')  
      + `  
        <button class="pick" id="custom">  
          <b>＋ Use “${esc(query || 'Custom exercise')}”</b>  
          <small>Capture an unplanned substitution or custom movement.</small>  
        </button>  
      `;

    $$('[data-pick]', root).forEach(b => b.onclick = () => {  
      active.activeExercise = b.dataset.pick;  
      persist();  
      renderLog();  
    });

    $('#custom', root).onclick = () => {  
      const name = query.trim() || window.prompt('Custom exercise name');  
      if (name) {  
        active.activeExercise = name;  
        persist();  
        renderLog();  
      }  
    };  
  }

  function bindLog() {  
    let type = 'reps';  
    let rir = $('.chip.active')?.dataset.rir || '';

    $('#searchExercise').oninput = e => renderPicker(e.target.value);

    $$('[data-type]').forEach(b => b.onclick = () => {  
      type = b.dataset.type;  
      $$('[data-type]').forEach(x => x.classList.toggle('active', x === b));  
    });

    $$('[data-rir]').forEach(b => b.onclick = () => {  
      rir = b.dataset.rir;  
      $$('[data-rir]').forEach(x => x.classList.toggle('active', x === b));  
    });

    $$('[data-context]').forEach(i => i.oninput = () => {  
      const key = i.dataset.context;  
      if (key === 'gripNotes' || key === 'coachQuestions') active[key] = i.value;  
      else active.shoulder[key] = i.value;  
      persist();  
    });

    $('#addSet').onclick = () => {  
      const load = $('#load').value.trim();  
      const result = $('#result').value.trim();  
      if (!load && !result) {  
        toast('Enter load, reps, or duration first');  
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

    $('#duplicateLast').onclick = () => {  
      const prior = [...active.sets].reverse().find(x => x.exercise === active.activeExercise);  
      if (!prior) {  
        toast('No completed set to duplicate');  
        return;  
      }  
      active.sets.push({ ...prior, id: uid(), at: new Date().toISOString() });  
      persist();  
      renderLog();  
      toast('Previous set duplicated');  
    };

    $('#finish').onclick = finish;

    $('#discard').onclick = () => {  
      if (confirm('Discard this active session?')) {  
        if (active.planId) MomentumPlanner.mark(active.planId, 'queued');  
        active = newSession();  
        persist();  
        renderLog();  
        renderToday();  
        renderHome();  
        toast('Draft discarded');  
      }  
    };

    $$('[data-delete-set]').forEach(b => b.onclick = () => {  
      active.sets = active.sets.filter(x => x.id !== b.dataset.deleteSet);  
      persist();  
      renderLog();  
    });  
  }

  const clock = seconds =>  
    `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  function logMarkup(session) {  
    if (!session.sets.length) return '<div class="empty">No sets logged yet. Completed sets remain here after refresh.</div>';

    const groups = session.sets.reduce((all, set) => {  
      (all[set.exercise] ??= []).push(set);  
      return all;  
    }, {});

    return Object.entries(groups).map(([name, sets]) => `  
      <div class="exercise-log">  
        <div class="exercise-title"><b>${esc(name)}</b>${sets.length} set${sets.length === 1 ? '' : 's'}</div>  
        ${sets.map((set, i) => `  
          <div class="log-row">  
            <b>${i + 1}</b>  
            <div>  
              <div class="set-main">${esc(set.load || 'BW')}${set.load ? ' lb' : ''} × ${esc(set.result || '—')}${set.resultType === 'duration' ? ' sec' : ''}</div>  
              <div class="set-meta">${set.tempo ? `Tempo ${esc(set.tempo)} · ` : ''}${set.rir ? `RIR ${esc(set.rir)} · ` : ''}${esc(set.note || set.checkpoint || 'No note')}</div>  
            </div>  
            <div class="row-actions">  
              <button class="icon-btn" data-delete-set="${set.id}" title="Delete set">×</button>  
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
    if (active.planId) MomentumPlanner.mark(active.planId, 'completed');  
    active = newSession();  
    persist();

    renderHome();  
    renderToday();  
    renderReview();  
    renderLog();  
    show('review');  
    toast('Session saved and staged for review');  
  }

  function debrief(session) {  
    const groups = session.sets.reduce((all, set) => {  
      (all[set.exercise] ??= []).push(set);  
      return all;  
    }, {});  
    const mins = Math.max(1, Math.round((new Date(session.completedAt || Date.now()) - new Date(session.startedAt)) / 60000));

    return `Phase: ${session.phase || '—'} | Week: ${session.week || '—'} | Day: ${session.day || '—'}  
Date: ${dateIso(session.completedAt || session.startedAt)}  
Workout: ${session.workoutName || 'Momentum session'}

SESSION SUMMARY  
Duration: ${mins} min  
Total sets: ${session.sets.length}  
Exercises: ${Object.keys(groups).length}

SET LOG  
${Object.entries(groups).map(([name, sets]) => `${name}  
${sets.map((s, i) => `  Set ${i + 1}: ${s.load || 'bodyweight'}${s.load ? ' lb' : ''} x ${s.result || '?'}${s.resultType === 'duration' ? ' sec' : ''} | Tempo ${s.tempo || 'not logged'} | RIR ${s.rir || 'not logged'}${s.checkpoint ? ' | Checkpoint: ' + s.checkpoint : ''}${s.note ? ' | Note: ' + s.note : ''}`).join('\n')}`).join('\n\n')}

SHOULDER STATUS  
Pre-session: ${session.shoulder?.pre || 'Not recorded'}  
During pressing: ${session.shoulder?.during || 'Not recorded'}  
Post-session: ${session.shoulder?.post || 'Not recorded'}

GRIP STATUS  
${session.gripNotes || 'Not recorded'}

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

    const rows = session.sets.map((s, i) => ({  
      Routine_Name: session.workoutName,  
      Activity_Date: dateIso(session.completedAt || session.startedAt),  
      Exercise_Name: s.exercise,  
      Exercise_Muscle_Groups: '',  
      Exercise_Equipment: '',  
      Exercise_Date_Time: new Date(new Date(session.startedAt).getTime() + i * 1000).toISOString(),  
      Repetitions_Or_Duration: s.result,  
      Weight_Or_Distance: s.load,  
      Use_Metric: 'FALSE',  
      Note: [s.tempo && `Tempo ${s.tempo}`, s.rir && `RIR ${s.rir}`, s.checkpoint, s.note].filter(Boolean).join('; '),  
      Superset: ''  
    }));

    return [fields.join(','), ...rows.map(row => fields.map(key => q(row[key])).join(','))].join('\r\n');  
  }

  function comparison(session) {  
    const plan = session.plannedWorkout?.exerciseBlocks || [];  
    const actual = session.sets.reduce((all, s) => ((all[s.exercise] = (all[s.exercise] || 0) + 1), all), {});

    if (!plan.length) return '<div class="quiet">This ad hoc session has no linked planned workout.</div>';

    return `  
      <div class="stack">  
        ${plan.map(block => `  
          <div class="flag">  
            <b>${esc(block.exerciseName)}</b><br>  
            Planned: ${esc([  
              block.targetSets && `${block.targetSets} sets`,  
              block.targetRepsOrDuration,  
              block.targetWeightOrLoad && `${block.targetWeightOrLoad} lb`,  
              block.tempo && `Tempo ${block.tempo}`,  
              block.rir && `RIR ${block.rir}`  
            ].filter(Boolean).join(' · ') || 'No structured target')}  
            <br>  
            Performed: ${actual[block.exerciseName] || 0} set${actual[block.exerciseName] === 1 ? '' : 's'}  
          </div>  
        `).join('')}  
        ${Object.keys(actual)  
          .filter(name => !plan.some(x => x.exerciseName === name))  
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
    const selected = sessions.find(x => x.id === selectedReviewId) || sessions[0];

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
          ${selected ? reviewDetail(selected) : '<div class="empty">Select a saved session to review, export, or re-queue.</div>'}  
        </section>  
      </div>  
    `;

    $$('[data-review]').forEach(b => b.onclick = () => {  
      selectedReviewId = b.dataset.review;  
      renderReview();  
    });

    if (selected) bindReview(selected);  
  }

  function reviewDetail(session) {  
    return `  
      <div class="eyebrow">Session review</div>  
      <h1 style="font-size:25px">${esc(session.workoutName)}</h1>  
      <p class="quiet">${esc(planSummary({ phaseId: session.phase, week: session.week, day: session.day }))} · ${dateText(session.completedAt)}</p>

      <section class="metrics" style="margin:14px 0">  
        ${metric('Sets', session.sets.length, 'Completed')}  
        ${metric('Exercises', new Set(session.sets.map(x => x.exercise)).size, 'Logged')}  
        ${metric('Plan link', session.planId ? 'Yes' : 'Ad hoc', session.planId ? 'Prescription retained' : 'No queue source')}  
        ${metric('Export', 'Ready', 'CSV · JSON · Coach')}  
      </section>

      <h2>Planned vs performed</h2>  
      ${comparison(session)}

      <h2 style="margin-top:16px">Performed session</h2>  
      ${logMarkup(session)}

      <label class="field" style="margin-top:12px">Questions for Coach<textarea id="reviewQuestions">${esc(session.coachQuestions || '')}</textarea></label>

      <div class="export-box">  
        <button class="primary" id="copyDebrief">Copy Coach-ready debrief</button>  
        <button class="secondary" id="exportCsv">Export CSV</button>  
        <button class="secondary" id="exportJson">Export JSON</button>  
        <button class="secondary" id="requeue">Re-queue workout</button>  
      </div>  
    `;  
  }

  function bindReview(session) {  
    $('#reviewQuestions').oninput = () => {  
      const all = getDone();  
      const item = all.find(x => x.id === session.id);  
      if (!item) return;  
      item.coachQuestions = $('#reviewQuestions').value;  
      saveDone(all);  
    };

    $('#copyDebrief').onclick = () => copy(debrief(session));  
    $('#exportCsv').onclick = () => download(`momentum-${dateIso(session.completedAt)}.csv`, 'text/csv;charset=utf-8', csv(session));  
    $('#exportJson').onclick = () => download(`momentum-${dateIso(session.completedAt)}.json`, 'application/json', JSON.stringify(session, null, 2));  
    $('#requeue').onclick = () => {  
      MomentumPlanner.upsert(MomentumPlanner.fromCompleted(session));  
      renderHome();  
      renderToday();  
      toast('Workout re-queued');  
      show('today');  
    };  
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
        ...(source !== 'momentum' ? historical.map(x => ({ date: x.date, name: x.name, sets: x.sets, source: 'Historical' })) : []),  
        ...(source !== 'historical' ? done.map(x => ({ date: x.completedAt, name: x.workoutName, sets: x.sets.length, source: 'Momentum', id: x.id })) : [])  
      ]  
        .filter(x => (x.name || '').toLowerCase().includes(q))  
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));

      $('#historyRows').innerHTML = rows.length ? `  
        <table class="table">  
          <thead><tr><th>Date</th><th>Session</th><th>Sets</th><th>Source</th></tr></thead>  
          <tbody>  
            ${rows.slice(0, 100).map(x => `  
              <tr>  
                <td>${dateText(x.date)}</td>  
                <td>  
                  <b>${esc(x.name || 'Untitled')}</b>  
                  ${x.id ? `<br><button class="secondary" style="min-height:30px;padding:4px 7px;margin-top:5px" data-history-requeue="${x.id}">Re-queue</button>` : ''}  
                </td>  
                <td>${x.sets}</td>  
                <td>${x.source}</td>  
              </tr>  
            `).join('')}  
          </tbody>  
        </table>  
      ` : '<div class="empty">No sessions match this filter.</div>';

      $$('[data-history-requeue]').forEach(b => b.onclick = () => {  
        const session = getDone().find(x => x.id === b.dataset.historyRequeue);  
        if (!session) return;  
        MomentumPlanner.upsert(MomentumPlanner.fromCompleted(session));  
        renderHome();  
        renderToday();  
        toast('Workout re-queued');  
        show('today');  
      });  
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
    if (el) el.textContent = clock(Math.max(0, Math.floor((Date.now() - new Date(active.startedAt)) / 1000)));  
  }, 1000);

  const m = MomentumData.metrics();  
  if ($('#dataStatus')) $('#dataStatus').textContent = m.lastDate ? `Data through ${m.lastDate}` : 'Local-first mode';

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');  
})();  