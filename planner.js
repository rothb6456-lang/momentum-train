/* Local-first planning layer: Coach card -> queue -> active session -> review. */
const MomentumPlanner = (() => {
  const QUEUE_KEY = 'momentum.queued-workouts.v1';
  const clean = value => String(value ?? '').trim();
  const id = () => `workout-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const clone = value => JSON.parse(JSON.stringify(value));
  const load = () => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; } };
  const save = workouts => localStorage.setItem(QUEUE_KEY, JSON.stringify(workouts));
  const blankBlock = (order = 1) => ({ id: id(), order, exerciseName: '', targetSets: '', targetRepsOrDuration: '', targetWeightOrLoad: '', tempo: '', rir: '', notes: '', checkpoints: '', tags: [] });
  const blankWorkout = () => ({ id: id(), title: 'Untitled workout', scheduledDate: '', phaseId: '', week: '', day: '', sourceType: 'manual', sourceRawText: '', status: 'queued', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), exerciseBlocks: [blankBlock()] });
  function parseLine(line, order) {
    const text = clean(line).replace(/^\s*(?:\d+[.)]|[-•])\s*/, '');
    const tempo = text.match(/(?:tempo\s*)?(\d+\s*-\s*\d+\s*-\s*(?:\d+|x))/i)?.[1]?.replace(/\s/g, '') || '';
    const rir = text.match(/RIR\s*([\d+\-– ]+)/i)?.[1]?.trim() || '';
    const load = text.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?)/i)?.[1] || '';
    const target = text.match(/(?:\b(\d+)\s*[x×]\s*)?(\d+(?:\s*[-–]\s*\d+)?\s*(?:reps?|sec(?:onds?)?|min(?:utes?)?)?)/i);
    const split = text.split(/\s+(?:[-—]|\||: )\s*/);
    const exerciseName = clean(split[0].replace(/\b\d+\s*[x×].*$/i, '')) || text;
    const notes = clean(text.replace(exerciseName, '').replace(/(?:tempo\s*)?\d+\s*-\s*\d+\s*-\s*(?:\d+|x)/ig, '').replace(/RIR\s*[\d+\-– ]+/ig, ''));
    return { ...blankBlock(order), exerciseName, targetSets: target?.[1] || '', targetRepsOrDuration: target?.[2]?.trim() || '', targetWeightOrLoad: load, tempo, rir, notes, checkpoints: '', tags: [] };
  }
  function parse(raw) {
    const workout = blankWorkout(); workout.sourceType = 'chatgpt'; workout.sourceRawText = raw;
    const lines = raw.split(/\r?\n/).map(clean).filter(Boolean);
    const phase = raw.match(/Phase\s*(\d+)/i), week = raw.match(/Week\s*(\d+)/i), day = raw.match(/Day\s*(\d+)/i);
    workout.phaseId = phase?.[1] || ''; workout.week = week?.[1] || ''; workout.day = day?.[1] || '';
    const titled = lines.find(line => /workout|phase\s*\d+.*day\s*\d+/i.test(line) && line.length < 130);
    workout.title = titled?.replace(/^#*\s*/, '') || (workout.phaseId ? `Phase ${workout.phaseId} · Week ${workout.week || '?'} · Day ${workout.day || '?'}` : 'Pasted workout card');
    const candidates = lines.filter(line => /^\s*(?:\d+[.)]|[-•])\s+/.test(line));
    workout.exerciseBlocks = candidates.map((line, index) => parseLine(line, index + 1)).filter(block => block.exerciseName.length > 1);
    if (!workout.exerciseBlocks.length) workout.exerciseBlocks = [blankBlock()];
    return workout;
  }
  function upsert(workout) { const all=load(); const copy={...clone(workout),updatedAt:new Date().toISOString()}; const index=all.findIndex(x=>x.id===copy.id); if(index>=0)all[index]=copy;else all.push(copy); save(all); return copy; }
  function remove(workoutId) { save(load().filter(x=>x.id!==workoutId)); }
  function move(workoutId, direction) { const all=load(); const index=all.findIndex(x=>x.id===workoutId), target=index+direction; if(index<0||target<0||target>=all.length)return all;[all[index],all[target]]=[all[target],all[index]];save(all);return all; }
  function duplicate(workoutId) { const original=load().find(x=>x.id===workoutId);if(!original)return null;const copy=clone(original);copy.id=id();copy.title=`${copy.title} (copy)`;copy.status='queued';copy.createdAt=new Date().toISOString();copy.updatedAt=copy.createdAt;return upsert(copy); }
  function mark(workoutId, status) { const all=load();const item=all.find(x=>x.id===workoutId);if(item){item.status=status;item.updatedAt=new Date().toISOString();save(all);}return item; }
  function fromCompleted(session) { const workout=blankWorkout();workout.title=`${session.workoutName || 'Completed session'} (re-queue)`;workout.phaseId=session.phase||'';workout.week=session.week||'';workout.day=session.day||'';workout.sourceType='history';workout.exerciseBlocks=(session.plannedWorkout?.exerciseBlocks || [...new Set(session.sets.map(x=>x.exercise))].map((name,index)=>({ ...blankBlock(index+1),exerciseName:typeof name==='string'?name:name.exerciseName,tempo:typeof name==='string'?'':name.tempo||'',rir:typeof name==='string'?'':name.rir||'',notes:typeof name==='string'?'':name.notes||'' })));return workout; }
  return { load, save, blankBlock, blankWorkout, parse, upsert, remove, move, duplicate, mark, fromCompleted, clone };
})();
