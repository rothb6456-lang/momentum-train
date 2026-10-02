/* Offline lessons; server confirmation, never a local read flag, grants XP. */
window.MomentumEducation = (() => {
  const KEY = 'momentum.education.v1';
  const owner = () => window.MomentumAccount?.owner() || 'local';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let library, anatomy, dialog, previousFocus, region = '', layer = 'muscles', side = 'front', contextExercise = '', selectionCallback;
  let syncing = false;
  const regions = ['Chest', 'Back', 'Shoulders', 'Arms', 'Core', 'Hips & Legs'];
  const points = {front: [[47,25],[47,38],[37,19],[65,37],[47,44],[47,65]], back: [[47,25],[47,36],[36,22],[64,43],[47,47],[47,65]]};
  async function load() {
    if (!library) {
      const response = await fetch('/education-lessons.json');
      if (!response.ok) throw new Error('Lessons are unavailable. Connect once to download them.');
      library = await response.json();
    }
    if (!anatomy) {
      const response = await fetch('/education-anatomy.json');
      if (!response.ok) throw new Error('Anatomy references are unavailable. Reconnect and reopen education.');
      anatomy = await response.json();
    }
    return library;
  }
  async function sync() {
    if (syncing || !navigator.onLine) return;
    const token = window.MomentumSync?.getToken?.() || localStorage.getItem('momentum_sanctum_token');
    const account = owner();
    if (!token || account === 'local') return;
    syncing = true;
    try {
      const state = read();
      for (const [id, completion] of Object.entries(state)) {
        if (completion.status !== 'pending') continue;
        if (owner() !== account) break;
        const base = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'https://statbook.bulldogstats.com/api/v1/training';
        const response = await fetch(`${base}/education/${encodeURIComponent(id)}/complete`, {
          method: 'POST', headers: {'Content-Type':'application/json', Accept:'application/json', Authorization:`Bearer ${token}`},
          body: JSON.stringify({version: completion.version, answer: completion.answer})
        });
        if (owner() !== account) break;
        if (!response.ok) break; // Keep pending; retry on reconnect or explicitly, not a tight loop.
        const result = await response.json();
        if (result.data?.completed !== true) break;
        const latest = read();
        latest[id] = {...completion, status:'confirmed'};
        localStorage.setItem(KEY, JSON.stringify(latest));
        if (result.data.awarded && typeof toast === 'function') toast(`+${result.data.xp} XP — lesson complete`);
      }
    } catch { /* Pending progress survives transport/auth/server failures. */ }
    finally { syncing = false; if (dialog?.open) updateProgress(); }
  }
  function updateProgress() {
    const node = dialog?.querySelector('[data-progress]');
    if (!node) return;
    const state = Object.values(read());
    const pending = state.filter(x => x.status === 'pending').length;
    node.textContent = `${state.length} ${state.length === 1 ? 'lesson' : 'lessons'} completed · ${state.filter(x => x.status === 'confirmed').length} confirmed${pending ? ` · ${pending} awaiting account sync` : ''}`;
  }
  function structures() {
    try { return JSON.parse(localStorage.getItem('momentum_body_structure_library')) || []; } catch { return []; }
  }
  function catalog() {
    try { return JSON.parse(localStorage.getItem('momentum_exercise_catalog')) || []; } catch { return []; }
  }
  function close() { dialog.close(); previousFocus?.focus(); }
  async function open(options = {}) {
    previousFocus = document.activeElement;
    region = options.region || ''; contextExercise = options.exercise || ''; selectionCallback = options.onSelect;
    if (options.structure) region = structures().find(x => x.id === options.structure)?.region || region;
    if (!dialog) {
      dialog = document.createElement('dialog'); dialog.className = 'education-dialog';
      dialog.setAttribute('aria-label', 'Body and movement education');
      document.body.append(dialog);
      dialog.addEventListener('close', () => previousFocus?.focus());
    }
    dialog.innerHTML = '<p role="status">Loading education…</p><button data-close>Close</button>';
    dialog.querySelector('[data-close]').onclick = close;
    if (!dialog.open) dialog.showModal();
    try { await load(); render(); if (options.structure) detail(options.structure); sync(); }
    catch (error) { dialog.querySelector('p').textContent = error.message; }
  }
  function render() {
    const selected = structures().filter(x => !region || x.region === region);
    const exercise = catalog().find(x => x.canonical_name === contextExercise);
    const links = exercise?.bodyStructures || exercise?.body_structures || [];
    const lesson = library.lessons.find(x => x.layer === layer);
    dialog.innerHTML = `<header class="education-header"><div><div class="eyebrow">Learn with Coach</div><h2>Body & movement</h2></div><button class="secondary" data-close aria-label="Close education">Close</button></header>
      <p data-progress role="status"></p>
      ${contextExercise ? `<h3>${escape(contextExercise)}</h3><p>Catalog-linked structures: ${links.length ? links.map(x => escape(x.name)).join(', ') : 'Not yet mapped. No anatomy association has been inferred.'}</p>` : ''}
      <div class="education-controls" aria-label="View">${['front','back'].map(x => `<button class="secondary" data-side="${x}" aria-pressed="${side===x}">${x==='front'?'Front (anterior)':'Back (posterior)'}</button>`).join('')}</div>
      <label>Education layer<select data-layer aria-label="Education layer">${[['muscles','Muscles'],['tendons','Tendons'],['ligaments','Ligaments'],['joints','Bones & joints'],['science','Exercise science']].map(([id,label])=>`<option value="${id}" ${layer===id?'selected':''}>${label}</option>`).join('')}</select></label>
      <div class="education-layout"><div><div class="education-map ${side}"><img src="/assets/anatomy/openstax-muscles.jpg" alt="OpenStax labelled ${side==='front'?'anterior':'posterior'} muscle illustration; includes superficial and deeper structures." />${regions.map((name,i) => ((side === 'front' && name === 'Back') || (side === 'back' && name === 'Chest')) ? '' : `<button class="education-point" style="left:${points[side][i][0]}%;top:${points[side][i][1]}%" data-region="${escape(name)}" aria-label="Explore ${escape(name)}" aria-pressed="${region===name}">${i+1}</button>`).join('')}</div>
      <p class="quiet">Muscle reference image. Numbered regions navigate the selected lesson layer; they are not tissue boundaries or a tissue dissection.</p>
      <p class="quiet">Illustration: <a href="https://commons.wikimedia.org/wiki/File:1105_Anterior_and_Posterior_Views_of_Muscles.jpg" target="_blank" rel="noopener noreferrer">OpenStax</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. Display cropped; navigation added.</p></div>
      <div><div class="education-controls">${regions.map((name,i)=>`<button class="secondary" data-region="${escape(name)}" aria-pressed="${region===name}">${i+1}. ${escape(name)}</button>`).join('')}</div>
      <h3>${escape(region || 'Choose a region')}</h3><div class="education-controls">${selected.map(x => `<button class="secondary" data-structure="${escape(x.id)}">${escape(x.name)}</button>`).join('') || '<p>Connect to download the anatomy catalog. Introductory lessons remain available below.</p>'}</div>
      <div data-structure-detail></div></div></div>
      <section class="card"><h3>${escape(lesson.title)}</h3><p>${escape(lesson.text)}</p><p><a href="${escape(lesson.source)}" target="_blank" rel="noopener noreferrer">${escape(lesson.sourceLabel)}</a></p>
      <button class="primary" data-start-check>I've read this — check my understanding</button><div data-check></div></section>
      <p class="quiet">Education does not diagnose symptoms or clear a training restriction. Existing guardrails stay in place.</p>
      <button class="secondary" data-sync>Retry progress sync</button>`;
    dialog.querySelector('[data-close]').onclick = close;
    dialog.querySelector('[data-sync]').onclick = sync;
    dialog.querySelector('[data-layer]').onchange = e => { layer = e.target.value; render(); };
    dialog.querySelectorAll('[data-side]').forEach(b => b.onclick = () => { side=b.dataset.side; render(); });
    dialog.querySelectorAll('[data-region]').forEach(b => b.onclick = () => { region=b.dataset.region; render(); });
    dialog.querySelectorAll('[data-structure]').forEach(b => b.onclick = () => detail(b.dataset.structure));
    dialog.querySelector('[data-start-check]').onclick = () => check(lesson);
    updateProgress();
  }
  function detail(id) {
    const structure = structures().find(x=>x.id===id);
    if (!structure) return;
    const exercises = catalog().filter(ex => (ex.bodyStructures || ex.body_structures || []).some(s => s.id===id));
    const node = dialog.querySelector('[data-structure-detail]');
    const reference = anatomy.structures[structure.name];
    node.innerHTML = `<h4>${escape(structure.name)}</h4><p>Catalog classification: ${escape(structure.type)} · ${escape(structure.region)}</p><details><summary>${exercises.length} associated exercises</summary><p>Catalog mapping, not a recommendation: ${exercises.length ? exercises.map(ex=>escape(ex.canonical_name)).join(', ') : 'No mapped exercises in this downloaded catalog.'}</p></details>${selectionCallback ? '<button class="primary" data-use>Use this structure for my guardrail</button>' : ''}`;
    if (reference) {
      const summary = document.createElement('p'); summary.textContent = reference[0];
      const source = document.createElement('a'); source.href = anatomy.sources[reference[1]];
      source.textContent = 'Anatomy reference: OpenStax (textbook)'; source.target = '_blank'; source.rel = 'noopener noreferrer';
      node.querySelector('h4').after(summary, source);
    }
    if (selectionCallback) node.querySelector('[data-use]').onclick = () => { selectionCallback(structure); close(); };
  }
  function check(lesson) {
    const node = dialog.querySelector('[data-check]');
    node.innerHTML = `<fieldset><legend>${escape(lesson.question)}</legend>${lesson.choices.map((choice,i)=>`<label class="education-answer"><input type="radio" name="education-answer" value="${i}"> ${escape(choice)}</label>`).join('')}</fieldset><button class="primary" data-submit>Check answer</button><p role="status" data-feedback></p>`;
    node.querySelector('[data-submit]').onclick = () => {
      const chosen = node.querySelector('input:checked');
      const feedback = node.querySelector('[data-feedback]');
      if (!chosen) { feedback.textContent='Choose an answer first.'; return; }
      if (Number(chosen.value)!==lesson.answer) { feedback.textContent=`Not quite. ${lesson.explanation} Try again.`; return; }
      try {
        const state=read();
        if (!state[lesson.id]) { state[lesson.id]={version:library.version,answer:lesson.answer,status:'pending'}; localStorage.setItem(KEY,JSON.stringify(state)); }
        feedback.textContent=`Correct. ${lesson.explanation} Completion saved on this device; XP is awarded once after account sync.`;
        updateProgress(); sync();
      } catch { feedback.textContent='Your browser could not save progress. Free storage and try again.'; }
    };
    node.querySelector('input')?.focus();
  }
  window.addEventListener('online', sync);
  window.addEventListener('focus', sync);
  return {open, sync};
})();
