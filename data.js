/* Static Markdown data layer. It deliberately never opens Training_Database.xlsx. */
const MomentumData = (() => {
  const state = { core: [], reference: [], analysis: [], loaded: false };

  function parseTable(markdown) {
    const lines = markdown.split(/\r?\n/);
    const tables = [];
    for (let i = 0; i < lines.length; i++) {
      if (!/^\|/.test(lines[i]) || !/^\|\s*[-:|\s]+\|\s*$/.test(lines[i + 1] || '')) continue;
      const headers = lines[i].split('|').slice(1, -1).map(x => x.trim());
      const rows = [];
      i += 2;
      while (lines[i]?.trim() === 'MarkdownRow') i++;
      for (; i < lines.length && /^\|/.test(lines[i]); i++) {
        const cells = lines[i].split('|').slice(1, -1).map(x => x.trim());
        if (cells.length === headers.length) rows.push(Object.fromEntries(headers.map((h, n) => [h, cells[n]])));
      }
      tables.push(rows); i--;
    }
    return tables;
  }

  async function load() {
    if (state.loaded) return state;
    const [core, reference, analysis] = await Promise.all([
      fetch('/data/01_Training_Core.md').then(r => r.text()),
      fetch('/data/02_Training_Reference.md').then(r => r.text()),
      fetch('/data/03_Training_Analysis.md').then(r => r.text())
    ]);
    state.core = parseTable(core).flat();
    state.reference = parseTable(reference).flat();
    state.analysis = parseTable(analysis).flat();
    state.loaded = true;
    return state;
  }

  const norm = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  function exercisesByPhase(phase) { return state.core.filter(x => +x.PhaseID === +phase); }
  function sessionsByRange(start, end) { return state.core.filter(x => x.SessionDate >= start && x.SessionDate <= end); }
  function progression(name) { return state.core.filter(x => norm(x.ExerciseName) === norm(name)); }
  function prs(name) { return state.analysis.filter(x => x.ExerciseName && (!name || norm(x.ExerciseName) === norm(name)) && x.PRType); }
  function weeklyVolume(phase) { return state.analysis.filter(x => x.WeekStart && (!phase || +x.PhaseID === +phase)); }
  function compliance(phase) { return state.analysis.filter(x => x.ProgramDay && (!phase || +x.PhaseID === +phase)); }
  function assumptions() { return state.analysis.filter(x => x.Assumption || x.Description); }
  function recentExercises(limit = 10) { return [...state.core].sort((a,b) => String(b.SessionDate).localeCompare(String(a.SessionDate))).map(x => x.ExerciseName).filter((x,i,a) => x && a.indexOf(x) === i).slice(0, limit); }
  return { load, state, exercisesByPhase, sessionsByRange, progression, prs, weeklyVolume, compliance, assumptions, recentExercises };
})();
