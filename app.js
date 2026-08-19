/* Enhancement layer for the static PWA. */
(async () => {
  const data = await MomentumData.load();
  const card = WorkoutCards.phase9week3day2;
  const byId = id => document.getElementById(id);

  function number(value) { return Number(value || 0); }
  function setMetric(label, value, detail) {
    const metric = [...document.querySelectorAll('.metric')].find(x => x.querySelector('.label')?.textContent.trim() === label);
    if (!metric) return;
    metric.querySelector('.value').textContent = value;
    metric.querySelector('.delta').textContent = detail;
  }
  const sessions = [...new Set(data.core.map(x => x.SessionDate + x.WorkoutName))].length;
  setMetric('Sessions', sessions, 'source export through Phase 8');
  setMetric('Working sets', data.core.length.toLocaleString(), 'source export through Phase 8');
  setMetric('Recorded PRs', data.prs().length, 'verified source records');

  const select = byId('logExercise');
  if (select) {
    const recent = MomentumData.recentExercises();
    const names = [...new Set([...recent, ...data.reference.map(x => x.ExerciseName).filter(Boolean)])].sort();
    select.innerHTML = '<option value="">Select exercise</option>' +
      '<optgroup label="Recent exercises">' + recent.map(x => `<option>${x}</option>`).join('') + '</optgroup>' +
      '<optgroup label="Exercise library">' + names.filter(x => !recent.includes(x)).map(x => `<option>${x}</option>`).join('') + '</optgroup>';
  }

  function renderCard() {
    const root = byId('workoutCard');
    if (!root) return;
    root.innerHTML = '<h2>Workout card</h2><p class="quiet small">The card is prescribed. Logging a set does not alter it.</p>' + card.exercises.map((exercise, index) => `
      <div class="exercise">
        <div class="exercise-title"><b>${index + 1}. ${exercise.name}</b><button class="secondary card-log" data-exercise="${index}">Log</button></div>
        <div class="execution">${exercise.target}</div>
        <div class="cue-row"><span>Intent</span><span>${exercise.intent}</span></div>
        <div class="cue-row"><span>Checkpoint</span><span>${exercise.checkpoint || 'Record performance and tolerance.'}</span></div>
        <div class="cue-row stop"><span>Stoplight</span><span>${exercise.stoplight || 'Controlled execution.'}</span></div>
      </div>`).join('');
    root.querySelectorAll('[data-exercise]').forEach(button => button.onclick = () => prepareExercise(card.exercises[+button.dataset.exercise]));
  }

  function prepareExercise(exercise) {
    if (![...select.options].some(x => x.value === exercise.name)) select.insertAdjacentHTML('beforeend', `<option>${exercise.name}</option>`);
    select.value = exercise.name;
    byId('logTempo').value = exercise.tempo || '';
    byId('logRir').value = exercise.rir || '';
    byId('logReps').placeholder = exercise.type === 'time' ? 'seconds' : 'reps';
    const holder = byId('activePrescription') || (() => { const d=document.createElement('div'); d.id='activePrescription'; d.className='prescription'; document.querySelector('.field-grid').before(d); return d; })();
    holder.innerHTML = `<b>${exercise.name}</b><span>Target: ${exercise.target}<br>Checkpoint: ${exercise.checkpoint || 'Record performance and tolerance.'}</span>`;
    show('log');
  }
  renderCard();

  const sessionKey = 'momentum-active-session-v1';
  const saved = JSON.parse(localStorage.getItem(sessionKey) || '{}');
  const fields = ['phase','week','day','workoutName','startedAt','shoulderPre','shoulderDuring','shoulderPost','gripNotes','coachQuestions'];
  const meta = { phase: card.phase, week: card.week, day: card.day, workoutName: card.name, startedAt: saved.startedAt || new Date().toISOString(), ...saved };
  const sessionBox = document.createElement('section');
  sessionBox.className = 'card'; sessionBox.style.marginBottom = '15px';
  sessionBox.innerHTML = `<h2>Session context</h2><p class="quiet small">Saved with the session and included in the Coach export.</p><div class="log-notes"><label>Shoulder status<textarea id="shoulderStatus" placeholder="Pre / during pressing / post-session"></textarea></label><label>Grip + questions for Coach<textarea id="gripQuestions" placeholder="Grip events, substitutions, questions"></textarea></label></div>`;
  document.querySelector('#log .logger .card')?.before(sessionBox);
  byId('shoulderStatus').value = saved.shoulderStatus || '';
  byId('gripQuestions').value = saved.gripQuestions || '';
  ['shoulderStatus','gripQuestions'].forEach(id => byId(id).addEventListener('input', () => localStorage.setItem(sessionKey, JSON.stringify({...meta, [id]: byId(id).value}))));

  const originalFinish = byId('finishSession')?.onclick;
  if (byId('finishSession')) byId('finishSession').onclick = () => {
    originalFinish?.();
    const draft = JSON.parse(localStorage.getItem('momentum-draft-sets') || '[]');
    const finished = {...meta, completedAt:new Date().toISOString(), sets:draft, shoulderStatus:byId('shoulderStatus').value, gripQuestions:byId('gripQuestions').value};
    localStorage.setItem('momentum-last-session', JSON.stringify(finished));
    localStorage.removeItem(sessionKey);
  };

  function coachDebrief() {
    const draft = JSON.parse(localStorage.getItem('momentum-draft-sets') || '[]');
    const grouped = draft.reduce((all, row) => {
      const name = row.exercise || 'Unassigned exercise';
      (all[name] ||= []).push(row);
      return all;
    }, {});
    const start = new Date(meta.startedAt);
    const minutes = Math.max(1, Math.round((Date.now() - start.getTime()) / 60000));
    const setLog = Object.entries(grouped).map(([name, rows]) => `${name}\n` + rows.map((row, index) =>
      `  Set ${index + 1}: ${row.load || 'bodyweight'}${row.load ? ' lb' : ''} x ${row.reps || '?'} | Tempo ${row.tempo || 'not logged'} | RIR ${row.rir || 'not logged'}${row.checkpoint ? ' | Checkpoint: ' + row.checkpoint : ''}${row.note ? ' | Note: ' + row.note : ''}`).join('\n')).join('\n\n');
    return `Phase: ${card.phase} | Week: ${card.week} | Day: ${card.day}\nDate: ${new Date().toISOString().slice(0,10)}\nWorkout: ${card.name}\n\nSESSION SUMMARY\nDuration: ${minutes} min\nTotal sets: ${draft.length}\nExercises: ${Object.keys(grouped).length}\n\nSET LOG\n${setLog || 'No sets logged.'}\n\nSHOULDER STATUS\n${byId('shoulderStatus').value || 'Not recorded'}\n\nGRIP STATUS\n${byId('gripQuestions').value || 'Not recorded'}\n\nQUESTIONS FOR COACH\n${byId('gripQuestions').value || 'None recorded'}`;
  }
  if (byId('copyWorkout')) byId('copyWorkout').onclick = async () => {
    const text = coachDebrief();
    byId('sessionSummary').textContent = text; byId('sessionSummary').classList.add('show');
    try { await navigator.clipboard.writeText(text); byId('savedNote').textContent = 'Structured Coach debrief copied.'; }
    catch { byId('savedNote').textContent = 'Debrief ready below. Select and copy it.'; }
  };

  const rirInput = byId('logRir');
  if (rirInput?.tagName === 'INPUT') {
    const selector = document.createElement('select'); selector.id = 'logRir'; selector.setAttribute('aria-label', 'RIR');
    selector.innerHTML = '<option value="">RIR</option>' + ['0','0-1','1','1-2','2','2+','3+','4+'].map(x => `<option>${x}</option>`).join('');
    rirInput.replaceWith(selector);
  }
  const tempo = byId('logTempo');
  if (tempo) tempo.placeholder = 'E-P-C e.g. 3-1-2';
})();
