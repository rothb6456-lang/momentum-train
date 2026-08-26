/* Markdown-first data service. It never opens the Excel workbook. */
const MomentumData = (() => {
  const state = { core: [], reference: [], analysis: [], loaded: false, errors: [] };
  const coreColumns = ['PhaseID','WeekID','ProgramDay','SessionDate','WorkoutName','ExerciseName','Category','SetNumber','Weight','Repetitions','DistanceOrDuration','Metric','RIR','Note'];
  const normalize = value => String(value ?? '').trim();
  function pipeRows(markdown) { return markdown.split(/\r?\n/).filter(line => /^\|/.test(line)).map(line => line.split('|').slice(1,-1).map(normalize)); }
  function headerTable(markdown) {
    const lines = markdown.split(/\r?\n/); const tables=[];
    for (let i=0;i<lines.length-1;i++) {
      if (!/^\|/.test(lines[i]) || !/^\|\s*[-:|\s]+\|\s*$/.test(lines[i+1])) continue;
      const headers=pipeRows(lines[i])[0]; const rows=[]; i+=2;
      while(lines[i]?.trim()==='MarkdownRow') i++;
      for (;i<lines.length&&/^\|/.test(lines[i]);i++) { const cells=pipeRows(lines[i])[0]; if(cells.length===headers.length) rows.push(Object.fromEntries(headers.map((h,n)=>[h,cells[n]]))); }
      tables.push(rows); i--;
    } return tables.flat();
  }
  function parseCore(markdown) { const tables=headerTable(markdown); return tables.length ? tables : pipeRows(markdown).filter(cells => cells.length>=8 && /^\d+$/.test(cells[0])).map(cells => Object.fromEntries(coreColumns.map((key,index)=>[key,cells[index]||'']))); }
  async function getFile(path, parser) { const response=await fetch(path); if(!response.ok) throw new Error(`${path}: ${response.status}`); return parser(await response.text()); }
  async function load() {
    if(state.loaded) return state;
    const results=await Promise.allSettled([getFile('/data/01_Training_Core.md',parseCore),getFile('/data/02_Training_Reference.md',headerTable),getFile('/data/03_Training_Analysis.md',headerTable)]);
    ['core','reference','analysis'].forEach((key,index)=>{ if(results[index].status==='fulfilled') state[key]=results[index].value; else state.errors.push(results[index].reason.message); }); state.loaded=true; return state;
  }
  const num=value=>Number(String(value||'').replace(/[^0-9.-]/g,''))||0;
  function recentExercises(limit=12){return [...state.core].sort((a,b)=>String(b.SessionDate).localeCompare(String(a.SessionDate))).map(x=>x.ExerciseName).filter((x,i,a)=>x&&a.indexOf(x)===i).slice(0,limit);}
  function lastValue(exercise){return [...state.core].filter(x=>x.ExerciseName===exercise).sort((a,b)=>String(b.SessionDate).localeCompare(String(a.SessionDate)))[0]||null;}
  function sessions(){const map=new Map();state.core.forEach(row=>{const key=[row.SessionDate,row.WorkoutName,row.PhaseID,row.ProgramDay].join('|');if(!map.has(key))map.set(key,{key,date:row.SessionDate,name:row.WorkoutName,phase:row.PhaseID,day:row.ProgramDay,sets:0});map.get(key).sets++;});return [...map.values()].sort((a,b)=>String(b.date).localeCompare(String(a.date)));}
  function phases(){const map={};state.core.forEach(row=>{const phase=row.PhaseID||'?';(map[phase]??={phase,sets:0,sessions:new Set()}).sets++;map[phase].sessions.add(`${row.SessionDate}|${row.WorkoutName}`)});return Object.values(map).sort((a,b)=>num(a.phase)-num(b.phase)).map(x=>({...x,sessions:x.sessions.size}));}
  function metrics(){const rows=state.core;const cats={};rows.forEach(r=>cats[r.Category||'Other']=(cats[r.Category||'Other']||0)+1);const primary=Object.entries(cats).sort((a,b)=>b[1]-a[1])[0]||['—',0];return {sets:rows.length,sessions:sessions().length,prs:state.analysis.filter(x=>x.PRType).length,primary,lastDate:rows.map(x=>x.SessionDate).filter(Boolean).sort().pop(),categories:cats};}
  return {state,load,num,recentExercises,lastValue,sessions,phases,metrics};
})();
