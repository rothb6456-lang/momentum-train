/* Local-first planning layer: Coach card -> queue -> active session -> review. */
const MomentumPlanner = (() => {
  const QUEUE_KEY = 'momentum.queued-workouts.v1';
  const clean = value => String(value ?? '').trim();
  const id = () => `workout-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const clone = value => JSON.parse(JSON.stringify(value));
  const load = () => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; } };
  const save = workouts => localStorage.setItem(QUEUE_KEY, JSON.stringify(workouts));
  const blankBlock = (order = 1) => ({  
  id: id(),  
  order,  
  exerciseName: '',  
  targetSets: '',  
  targetRepsOrDuration: '',  
  targetWeightOrLoad: '',  
  tempo: '',  
  rir: '',  
  rest: '',  
  notes: '',  
  checkpoints: '',  
  tags: []  
});  
  const blankWorkout = () => ({ id: id(), title: 'Untitled workout', scheduledDate: '', phaseId: '', week: '', day: '', sourceType: 'manual', sourceRawText: '', status: 'queued', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), exerciseBlocks: [blankBlock()] });
  function parseLine(line, order) {  
  const text = clean(line).replace(/^\s*(?:\d+[.)]|[-•])\s*/, '');  
  const tempo = text.match(/(?:tempo\s*)?(\d+\s*-\s*\d+\s*-\s*(?:\d+|x))/i)?.[1]?.replace(/\s/g, '') || '';  
  const rir = text.match(/RIR\s*([\d+\-– ]+)/i)?.[1]?.trim() || '';  
  const load = text.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?)/i)?.[1] || '';  
  const rest = normalizeRest(text.match(/rest[:\s]+(\d+(?:\s*-\s*\d+)?\s*(?:sec|min|s|m))/i)?.[1] || '');  
  const target = text.match(/(?:\b(\d+)\s*[x×]\s*)?(\d+(?:\s*[-–]\s*\d+)?\s*(?:reps?|sec(?:onds?)?|min(?:utes?)?)?)/i);  
  const split = text.split(/\s+(?:[-—]|\||: )\s*/);  
  const exerciseName = clean(split[0].replace(/\b\d+\s*[x×].*$/i, '')) || text;  
  const notes = clean(  
    text  
      .replace(exerciseName, '')  
      .replace(/(?:tempo\s*)?\d+\s*-\s*\d+\s*-\s*(?:\d+|x)/ig, '')  
      .replace(/RIR\s*[\d+\-– ]+/ig, '')  
      .replace(/rest[:\s]+\d+(?:\s*-\s*\d+)?\s*(?:sec|min|s|m)/ig, '')  
  );

  return {  
    ...blankBlock(order),  
    exerciseName,  
    targetSets: target?.[1] || '',  
    targetRepsOrDuration: target?.[2]?.trim() || '',  
    targetWeightOrLoad: load,  
    tempo,  
    rir,  
    rest,  
    notes,  
    checkpoints: '',  
    tags: []  
  };  
}  
  function parse(rawText) {  
  const parsed = parseWorkoutCardText(rawText);

  const workout = blankWorkout();  
  workout.title = parsed.title || 'Pasted workout card';  
  workout.subtitle = parsed.subtitle || '';  
  workout.phaseId = parsed.phase || '';  
  workout.week = parsed.week || '';  
  workout.day = parsed.day || '';  
  workout.sourceType = parsed.source || 'chatgpt';  
  workout.sourceRawText = rawText || '';  
  workout.primaryTargets = Array.isArray(parsed.primaryTargets) ? parsed.primaryTargets : [];  
  workout.secondaryTargets = Array.isArray(parsed.secondaryTargets) ? parsed.secondaryTargets : [];  
  workout.programNotes = Array.isArray(parsed.programNotes) ? parsed.programNotes : [];  
  workout.targetDuration = parsed.targetDuration || '';  
  workout.confidence = parsed.confidence || '';

  workout.exerciseBlocks = (parsed.exercises || []).length  
    ? parsed.exercises.map((ex, index) => ({  
        ...blankBlock(index + 1),  
        exerciseName: ex.name || '',  
        targetSets: ex.sets || '',  
        targetRepsOrDuration: ex.reps || '',  
        targetWeightOrLoad: ex.load || '',  
        tempo: ex.tempo || '',  
        rir: ex.rir || '',  
        rest: ex.rest || '',  
        notes: ex.notes || '',  
        checkpoints: '',  
        tags: []  
      }))  
    : [blankBlock(1)];

  return workout;  
}  
  function parseWorkoutCardText(rawText) {  
  const text = normalizeWorkoutText(rawText || '');

  const meta = parseWorkoutMeta(text);  
  const tableExercises = parseMarkdownWorkoutTable(text);  
  const narrativeExercises = tableExercises.length ? [] : parseNarrativeWorkout(text);

  const exercises = tableExercises.length ? tableExercises : narrativeExercises;

  return {  
    title: meta.title || 'Pasted workout card',  
    subtitle: meta.subtitle || '',  
    source: 'chatgpt',  
    phase: meta.phase || '',  
    week: meta.week || '',  
    day: meta.day || '',  
    primaryTargets: meta.primaryTargets || [],  
    secondaryTargets: meta.secondaryTargets || [],  
    programNotes: meta.programNotes || [],  
    targetDuration: meta.targetDuration || '',  
    confidence: meta.confidence || '',  
    exercises: exercises.map((ex, i) => ({  
      id: ex.id || `planned-${Date.now()}-${i + 1}`,  
      name: ex.name || '',  
      sets: ex.sets || '',  
      reps: ex.reps || '',  
      load: ex.load || '',  
      tempo: ex.tempo || '',  
      rir: ex.rir || '',  
      rest: ex.rest || '',  
      notes: ex.notes || ''  
    })),  
    warnings: buildParseWarnings(meta, exercises)  
  };  
}  
function normalizeWorkoutText(input) {  
  return String(input || '')  
    .replace(/\r/g, '')  
    .replace(/\u00A0/g, ' ')  
    .replace(/[“”]/g, '"')  
    .replace(/[‘’]/g, "'")  
    .replace(/[‐‑–—]/g, '-')  
    .replace(/×/g, 'x')  
    .replace(/\bseconds?\b/gi, 'sec')  
    .replace(/\bsecs\b/gi, 'sec')  
    .replace(/\bminutes?\b/gi, 'min')  
    .replace(/\bmins\b/gi, 'min')  
    .replace(/\bbodyweight\b/gi, 'BW')  
    .replace(/[ \t]+\n/g, '\n')  
    .replace(/\n{3,}/g, '\n\n')  
    .trim();  
}

function parseWorkoutMeta(text) {  
  const lines = text.split('\n').map(s => s.trim()).filter(Boolean);

  const phaseMatch = text.match(/\bPHASE\s+(\d+)\b/i);  
  const weekDayMatch = text.match(/\bWEEK\s+(\d+)\s*[•|\/-]?\s*DAY\s+(\d+)\b/i);

  let title = '';  
  if (weekDayMatch) {  
    const wdLineIndex = lines.findIndex(line => /\bWEEK\s+\d+.*\bDAY\s+\d+\b/i.test(line));  
    if (wdLineIndex >= 0) {  
      for (let i = wdLineIndex + 1; i < Math.min(wdLineIndex + 5, lines.length); i++) {  
        const line = lines[i];  
        if (  
          line &&  
          !/^(primary targets:?|secondary:?|session target:?|confidence:?|target duration:?|\d+\.)/i.test(line) &&  
          !line.includes('|')  
        ) {  
          title = line;  
          break;  
        }  
      }  
    }  
  }

  if (!title) {  
    const fallback = lines.find(line =>  
      !/^PHASE\b/i.test(line) &&  
      !/^WEEK\b/i.test(line) &&  
      !/^\d+\./.test(line) &&  
      !line.includes('|') &&  
      line.length > 8 &&  
      line.length < 120  
    );  
    title = fallback || '';  
  }

  const headerMeta = parseHeaderMeta(lines);

  return {  
    phase: phaseMatch ? phaseMatch[1] : '',  
    week: weekDayMatch ? weekDayMatch[1] : '',  
    day: weekDayMatch ? weekDayMatch[2] : '',  
    title,  
    subtitle: buildWorkoutSubtitle(headerMeta.primaryTargets, headerMeta.secondaryTargets),  
    primaryTargets: headerMeta.primaryTargets,  
    secondaryTargets: headerMeta.secondaryTargets,  
    programNotes: headerMeta.programNotes,  
    targetDuration: headerMeta.targetDuration,  
    confidence: headerMeta.confidence  
  };  
}  

function parseHeaderMeta(lines) {  
  const primaryTargets = [];  
  const secondaryTargets = [];  
  const programNotes = [];  
  let targetDuration = '';  
  let confidence = '';

  const firstExerciseIndex = lines.findIndex(line => /^\d+\.\s+/.test(line));  
  const headerLines = firstExerciseIndex >= 0 ? lines.slice(0, firstExerciseIndex) : lines.slice();

  let mode = '';

  for (let i = 0; i < headerLines.length; i++) {  
    const line = String(headerLines[i] || '').trim();  
    if (!line) continue;

    if (/^primary targets?:?/i.test(line)) {  
      mode = 'primary';  
      continue;  
    }

    if (/^secondary:?/i.test(line)) {  
      mode = 'secondary';  
      continue;  
    }

    const durationMatch = line.match(/^target duration:\s*(.+)$/i);  
    if (durationMatch) {  
      targetDuration = clean(durationMatch[1]).replace(/\.$/, '');  
      mode = '';  
      continue;  
    }

    const confidenceMatch = line.match(/^confidence:\s*([0-9.]+)/i);  
    if (confidenceMatch) {  
      confidence = clean(confidenceMatch[1]);  
      mode = '';  
      continue;  
    }

    if (/^\d+\.\s+/.test(line)) {  
      mode = '';  
      break;  
    }

    if (/^(phase|week)\b/i.test(line)) continue;  
    if (line.includes('|')) continue;

    const cleanedLine = cleanHeaderBullet(line);  
    if (!cleanedLine) continue;

    if (mode === 'primary') {  
      if (!isLikelyHeaderMetaLine(cleanedLine)) mode = '';  
      else {  
        primaryTargets.push(cleanedLine);  
        continue;  
      }  
    }

    if (mode === 'secondary') {  
      if (!isLikelyHeaderMetaLine(cleanedLine)) mode = '';  
      else {  
        secondaryTargets.push(cleanedLine);  
        continue;  
      }  
    }

    if (  
      /^[A-Z][A-Za-z0-9 +\/,-]{6,}$/.test(cleanedLine) &&  
      cleanedLine !== cleanedLine.toUpperCase()  
    ) {  
      continue;  
    }

    if (looksLikeProgramNote(cleanedLine)) {  
      programNotes.push(cleanedLine);  
    }  
  }

  return {  
    primaryTargets: uniqueCleanList(primaryTargets),  
    secondaryTargets: uniqueCleanList(secondaryTargets),  
    programNotes: uniqueCleanList(programNotes),  
    targetDuration,  
    confidence  
  };  
}

function cleanHeaderBullet(line) {  
  return String(line || '')  
    .replace(/^\d+\.\s*/, '')  
    .replace(/^[-•]\s*/, '')  
    .trim()  
    .replace(/\.$/, '');  
}

function uniqueCleanList(items) {  
  const seen = new Set();  
  const out = [];

  items.forEach(item => {  
    const value = clean(item);  
    if (!value) return;  
    const key = value.toLowerCase();  
    if (seen.has(key)) return;  
    seen.add(key);  
    out.push(value);  
  });

  return out;  
}

function isLikelyHeaderMetaLine(line) {  
  const value = String(line || '').trim();  
  if (!value) return false;  
  if (/^(no\s|target duration:|confidence:|phase\b|week\b)/i.test(value)) return false;  
  if (/^\d+\.\s+/.test(value)) return false;  
  if (value.includes('|')) return false;  
  return value.length <= 80;  
}

function looksLikeProgramNote(line) {  
  const value = String(line || '').trim();  
  if (!value) return false;  
  return (  
    /^no\s/i.test(value) ||  
    /\bdo not\b/i.test(value) ||  
    /\bonly\b/i.test(value) ||  
    /\bavoid\b/i.test(value)  
  );  
}

function simplifyTargetText(value) {  
  const v = String(value || '').trim();  
  if (!v) return '';

  return v  
    .replace(/strength and hypertrophy/ig, 'strength/hypertrophy')  
    .replace(/strength\/endurance/ig, 'strength/endurance')  
    .replace(/scapular\/shoulder capacity/ig, 'scapular support')  
    .replace(/grip strength\/endurance/ig, 'grip endurance')  
    .replace(/\s+/g, ' ')  
    .trim();  
}

function buildWorkoutSubtitle(primaryTargets, secondaryTargets) {  
  const items = []  
    .concat(Array.isArray(primaryTargets) ? primaryTargets : [])  
    .concat(Array.isArray(secondaryTargets) ? secondaryTargets : [])  
    .map(simplifyTargetText)  
    .filter(Boolean);

  if (!items.length) return '';

  return items.slice(0, 5).join(' · ');  
}  

function parseMarkdownWorkoutTable(text) {  
  const lines = text.split('\n').map(s => s.trim()).filter(Boolean);  
  const tableLines = lines.filter(line => line.includes('|'));

  if (tableLines.length < 3) return [];

  const headerIndex = tableLines.findIndex(line =>  
    /exercise/i.test(line) && /(sets|reps)/i.test(line)  
  );  
  if (headerIndex === -1) return [];

  const headerRow = splitPipeRow(tableLines[headerIndex]);  
  const separatorRow = tableLines[headerIndex + 1] || '';

  if (!isMarkdownSeparatorRow(separatorRow)) return [];

  const columnMap = mapWorkoutTableColumns(headerRow);  
  if (columnMap.exercise === -1) return [];

  const rows = [];  
  for (let i = headerIndex + 2; i < tableLines.length; i++) {  
    const rawRow = tableLines[i];  
    if (!rawRow || isMarkdownSeparatorRow(rawRow)) continue;

    const cells = splitPipeRow(rawRow);  
    if (!cells.length) continue;

    const exercise = parseExerciseFromTableRow(cells, columnMap);  
    if (exercise && hasMeaningfulExercise(exercise)) rows.push(exercise);  
  }

  return rows;  
}

function splitPipeRow(line) {  
  return line  
    .replace(/^\|/, '')  
    .replace(/\|$/, '')  
    .split('|')  
    .map(cell => cell.trim());  
}

function isMarkdownSeparatorRow(line) {  
  const cells = splitPipeRow(line);  
  return cells.length > 0 && cells.every(cell => /^:?-{2,}:?$/.test(cell));  
}

function mapWorkoutTableColumns(headers) {  
  const norm = headers.map(h => h.toLowerCase().replace(/\s+/g, ' ').trim());

  const find = (patterns) => norm.findIndex(h => patterns.some(p => p.test(h)));

  return {  
    index: find([/^#$/, /^no\.?$/]),  
    exercise: find([/exercise/, /movement/]),  
    setsReps: find([/sets?.*reps?/, /reps?.*duration/, /sets?.*duration/, /sets x reps/, /sets/]),  
    load: find([/^load$/, /weight/]),  
    tempo: find([/^tempo$/, /cadence/, /pace/]),  
    rir: find([/^rir$/, /reps? in reserve/]),  
    rest: find([/^rest$/, /rest time/]),  
    notes: find([/^notes?$/, /comment/])  
  };  
}

function parseExerciseFromTableRow(cells, columnMap) {  
  const name = safeCell(cells, columnMap.exercise);  
  if (!name) return null;

  const setsReps = safeCell(cells, columnMap.setsReps);  
  const load = safeCell(cells, columnMap.load);  
  const tempo = safeCell(cells, columnMap.tempo);  
  const rir = safeCell(cells, columnMap.rir);  
  const rest = safeCell(cells, columnMap.rest);  
  const notes = safeCell(cells, columnMap.notes);

  const sr = parseSetsRepsCell(setsReps);

  const leftovers = [];  
  const cleanTempo = normalizeTempoOrSpecial(tempo, leftovers);  
  const cleanLoad = normalizeLoad(load);  
  const cleanRir = normalizeRir(rir);  
  const cleanRest = normalizeRest(rest);

  return {  
    name: normalizeExerciseName(name),  
    sets: sr.sets,  
    reps: sr.reps,  
    load: cleanLoad,  
    tempo: cleanTempo,  
    rir: cleanRir,  
    rest: cleanRest,  
    notes: joinNotes([notes, leftovers.join('; ')])  
  };  
}

function parseNarrativeWorkout(text) {  
  const lines = text.split('\n');  
  const exercises = [];

  let i = 0;

  while (i < lines.length) {  
    const line = (lines[i] || '').trim();

    const headingMatch = line.match(/^(\d+)\.\s+(.+)$/);  
    if (!headingMatch || !isLikelyExerciseHeading(headingMatch[2])) {  
      i++;  
      continue;  
    }

    const number = headingMatch[1];  
    const rawName = normalizeExerciseName(headingMatch[2]);

    const block = [];  
    i++;  
    while (i < lines.length && !/^\d+\.\s+/.test((lines[i] || '').trim())) {  
      block.push((lines[i] || '').trim());  
      i++;  
    }

    const exercise = parseNarrativeExerciseBlock(number, rawName, block);  
    if (exercise && hasMeaningfulExercise(exercise)) exercises.push(exercise);  
  }

  return exercises;  
}  

function isLikelyExerciseHeading(value) {  
  const line = String(value || '').trim();  
  if (!line) return false;

  if (/^(primary|secondary|target duration|confidence)\b/i.test(line)) return false;  
  if (/^rear delts$/i.test(line)) return false;  
  if (/^scapular\/shoulder capacity$/i.test(line)) return false;  
  if (/^no horizontal pressing\.?$/i.test(line)) return false;

  return true;  
}  

function parseNarrativeExerciseBlock(number, rawName, blockLines) {  
  const nonEmpty = blockLines.map(s => s.trim()).filter(Boolean);

  const prescriptionLine = nonEmpty.find(line =>  
    line.includes('|') && /\b\d+\s*x\s*/i.test(line)  
  );

  let parsed = {  
    name: rawName,  
    sets: '',  
    reps: '',  
    load: '',  
    tempo: '',  
    rir: '',  
    rest: '',  
    notes: ''  
  };

  if (prescriptionLine) {  
    parsed = parseNarrativePrescriptionLine(rawName, prescriptionLine);  
  }

  const shortNotes = [];  
  for (const line of nonEmpty) {  
    if (line === prescriptionLine) continue;  
    if (/^(confidence|w\d+d\d+|progression|target|technical requirements?|technical cues?|tomorrow|therefore|stop if|only perform)/i.test(line)) continue;  
    if (/^\d+\s*x\s*/i.test(line)) continue;  
    if (line.includes('|')) continue;

    if (rawName.toLowerCase() === 'warm-up') {  
      if (line.length <= 80) shortNotes.push(line);  
      continue;  
    }

    if (line.length <= 120) {  
      shortNotes.push(line);  
    }  
  }

  parsed.notes = joinNotes([parsed.notes, shortNotes.slice(0, rawName.toLowerCase() === 'warm-up' ? 6 : 3).join(' | ')]);  
  return parsed;  
}  
function parseNarrativePrescriptionLine(name, line) {  
  const parts = line.split('|').map(s => s.trim()).filter(Boolean);  
  if (!parts.length) {  
    return { name, sets: '', reps: '', load: '', tempo: '', rir: '', rest: '', notes: '' };  
  }

  const sr = parseSetsRepsCell(parts[0]);  
  let load = '';  
  let tempo = '';  
  let rir = '';  
  let rest = '';  
  const notes = [];

  for (let i = 1; i < parts.length; i++) {  
    const token = parts[i];

    if (!load && looksLikeLoad(token)) {  
      load = normalizeLoad(token);  
      continue;  
    }  
    if (!tempo && looksLikeTempo(token)) {  
      tempo = normalizeTempoOrSpecial(token, notes);  
      continue;  
    }  
    if (!rir && looksLikeRir(token)) {  
      rir = normalizeRir(token);  
      continue;  
    }  
    if (!rest && looksLikeRest(token)) {  
      rest = normalizeRest(token);  
      continue;  
    }

    notes.push(token);  
  }

  return {  
    name: normalizeExerciseName(name),  
    sets: sr.sets,  
    reps: sr.reps,  
    load,  
    tempo,  
    rir,  
    rest,  
    notes: joinNotes(notes)  
  };  
}

function parseSetsRepsCell(value) {  
  const cell = String(value || '').trim();  
  if (!cell) return { sets: '', reps: '' };

  const match = cell.match(/^(\d+)\s*x\s*(.+)$/i);  
  if (!match) return { sets: '', reps: cell };

  return {  
    sets: match[1].trim(),  
    reps: match[2].trim()  
  };  
}

function looksLikeLoad(value) {  
  const v = String(value || '').trim().toLowerCase();  
  return /\b(lb|lbs|kg|bw|bodyweight|total|optional|plate|stack)\b/.test(v) || /^\d+(\.\d+)?$/.test(v);  
}

function looksLikeTempo(value) {  
  const v = String(value || '').trim().toLowerCase();  
  return (  
    /^\d+-\d+-\d+(-\d+)?$/.test(v) ||  
    /\bcontrolled\b/.test(v) ||  
    /\bmph\b/.test(v) ||  
    /\bincline\b/.test(v) ||  
    /\btempo\b/.test(v)  
  );  
}

function looksLikeRir(value) {  
  const v = String(value || '').trim().toLowerCase();  
  return /\brir\b/.test(v) || /^\d+(\s*-\s*\d+)?$/.test(v);  
}

function looksLikeRest(value) {  
  const v = String(value || '').trim().toLowerCase();  
  return /\bsec\b|\bmin\b|\bm\b|\bs\b/.test(v);  
}

function normalizeLoad(value) {  
  return String(value || '')  
    .replace(/\bbodyweight\b/gi, 'BW')  
    .replace(/\s+/g, ' ')  
    .trim();  
}

function normalizeTempoOrSpecial(value, leftovers) {  
  const v = String(value || '').trim();  
  if (!v) return '';

  if (/^\d+-\d+-\d+(-\d+)?$/.test(v)) return v;  
  if (/^controlled$/i.test(v)) return 'Controlled';

  if (/\bmph\b/i.test(v) || /\bincline\b/i.test(v)) {  
    if (leftovers) leftovers.push(v);  
    return '';  
  }

  return v;  
}

function normalizeRir(value) {  
  return String(value || '')  
    .replace(/\bRIR\b/gi, '')  
    .replace(/\s+/g, '')  
    .trim();  
}

function normalizeRest(value) {  
  return String(value || '')  
    .replace(/\s+/g, ' ')  
    .replace(/\bseconds?\b/gi, 'sec')  
    .replace(/\bsecs\b/gi, 'sec')  
    .replace(/\bminutes?\b/gi, 'min')  
    .replace(/\bmins\b/gi, 'min')  
    .trim();  
}

function normalizeExerciseName(name) {  
  const raw = String(name || '').trim();  
  if (!raw) return '';

  const lowerKeep = new Set(['of', 'and', 'or', 'the', 'to', 'for', 'with', 'on', 'in']);  
  return raw  
    .toLowerCase()  
    .split(/\s+/)  
    .map((word, idx) => {  
      if (!word) return word;  
      if (idx > 0 && lowerKeep.has(word)) return word;  
      return word.charAt(0).toUpperCase() + word.slice(1);  
    })  
    .join(' ')  
    .replace(/\bDb\b/g, 'DB')  
    .replace(/\bRdl\b/g, 'RDL')  
    .replace(/\bBw\b/g, 'BW');  
}

function safeCell(cells, idx) {  
  return idx >= 0 && idx < cells.length ? String(cells[idx] || '').trim() : '';  
}

function joinNotes(items) {  
  return items  
    .flat()  
    .map(s => String(s || '').trim())  
    .filter(Boolean)  
    .join(' | ');  
}

function hasMeaningfulExercise(ex) {  
  return !!(ex && (ex.name || ex.sets || ex.reps || ex.load || ex.notes));  
}

function buildParseWarnings(meta, exercises) {  
  const warnings = [];

  if (!meta.phase) warnings.push('Phase not detected.');  
  if (!meta.week) warnings.push('Week not detected.');  
  if (!meta.day) warnings.push('Day not detected.');  
  if (!meta.title) warnings.push('Workout title not detected.');  
  if (!exercises.length) warnings.push('No exercises were parsed.');  
  if (exercises.some(ex => !ex.name)) warnings.push('One or more exercises have no detected name.');  
  if (exercises.some(ex => !ex.sets && !ex.reps)) warnings.push('One or more exercises are missing sets/reps.');  
  if (exercises.some(ex => ex.notes && /\bmph\b|\bincline\b/i.test(ex.notes))) {  
    warnings.push('Non-standard fields like pace/incline were preserved in notes.');  
  }

  return warnings;  
}  

function upsert(workout) {  
  const all = load();  
  const copy = { ...clone(workout), updatedAt: new Date().toISOString() };  
  const index = all.findIndex(x => x.id === copy.id);  
  if (index >= 0) all[index] = copy;  
  else all.push(copy);  
  save(all);  
  return copy;  
}

function remove(workoutId) {  
  save(load().filter(x => x.id !== workoutId));  
}

function move(workoutId, direction) {  
  const all = load();  
  const index = all.findIndex(x => x.id === workoutId), target = index + direction;  
  if (index < 0 || target < 0 || target >= all.length) return all;  
  [all[index], all[target]] = [all[target], all[index]];  
  save(all);  
  return all;  
}

function duplicate(workoutId) {  
  const original = load().find(x => x.id === workoutId);  
  if (!original) return null;  
  const copy = clone(original);  
  copy.id = id();  
  copy.title = `${copy.title} (copy)`;  
  copy.status = 'queued';  
  copy.createdAt = new Date().toISOString();  
  copy.updatedAt = copy.createdAt;  
  return upsert(copy);  
}

function mark(workoutId, status) {  
  const all = load();  
  const item = all.find(x => x.id === workoutId);  
  if (item) {  
    item.status = status;  
    item.updatedAt = new Date().toISOString();  
    save(all);  
  }  
  return item;  
}

function parseTopEndValue(value) {  
  const raw = clean(value);  
  if (!raw) return '';

  // 8-10/side -> 10/side  
  let m = raw.match(/^(\d+)\s*-\s*(\d+)(\/side)$/i);  
  if (m) return `${m[2]}${m[3]}`;

  // 45-60 sec -> 60 sec  
  m = raw.match(/^(\d+)\s*-\s*(\d+)\s*(sec|min|s|m)$/i);  
  if (m) return `${m[2]} ${m[3]}`;

  // 8-10 -> 10  
  m = raw.match(/^(\d+)\s*-\s*(\d+)$/);  
  if (m) return m[2];

  // 1-2 -> 2  
  m = raw.match(/^(\d+)\s*-\s*(\d+)$/);  
  if (m) return m[2];

  return raw;  
}

function normalizeRestTopEnd(value) {  
  const raw = clean(value);  
  if (!raw) return '';  
  const m = raw.match(/^(\d+)\s*-\s*(\d+)\s*(sec|min|s|m)$/i);  
  if (m) return `${m[2]} ${m[3]}`;  
  return raw;  
}

function isOptionalExercise(block) {  
  return /\boptional\b/i.test(block.notes || '') ||  
         /\boptional\b/i.test(block.exerciseName || '');  
}

function isEstablishLoad(block) {  
  return /\bestablish\b/i.test(block.targetWeightOrLoad || '');  
}

function isTimedPrescription(block) {  
  return /\bsec\b|\bmin\b|\bs\b|\bm\b/i.test(block.targetRepsOrDuration || '');  
}

function isUnilateralPrescription(block) {  
  return /\/side/i.test(block.targetRepsOrDuration || '') ||  
         /\b1-arm\b|\bsingle-arm\b/i.test(block.exerciseName || '');  
}

function defaultActualFromBlock(block) {  
  const repsOrDuration = parseTopEndValue(block.targetRepsOrDuration || '');  
  const rir = parseTopEndValue(block.rir || '');  
  return {  
    actualRepsOrDuration: repsOrDuration,  
    actualLoad: clean(block.targetWeightOrLoad || ''),  
    actualTempo: clean(block.tempo || ''),  
    actualRir: rir,  
    actualRest: normalizeRestTopEnd(block.rest || ''),  
    note: ''  
  };  
}  

function toCockpitExercise(block, index) {  
  return {  
    id: block.id || id(),  
    order: index + 1,  
    exerciseName: clean(block.exerciseName || ''),  
    prescribedSets: Number(block.targetSets || 0) || 0,  
    prescribedRepsOrDuration: clean(block.targetRepsOrDuration || ''),  
    prescribedLoad: clean(block.targetWeightOrLoad || ''),  
    prescribedTempo: clean(block.tempo || ''),  
    prescribedRir: clean(block.rir || ''),  
    prescribedRest: clean(block.rest || ''),  
    notes: clean(block.notes || ''),  
    optional: isOptionalExercise(block),  
    establishLoad: isEstablishLoad(block),  
    unilateral: isUnilateralPrescription(block),  
    timed: isTimedPrescription(block),  
    completedSets: [],  
    skipped: false,  
    started: false,  
    workingLoad: isEstablishLoad(block) ? '' : clean(block.targetWeightOrLoad || '')  
  };  
}  

function buildCockpitWorkout(workout) {  
  const base = clone(workout || blankWorkout());  
  return {  
    workoutId: base.id,  
    title: base.title || 'Untitled workout',  
    phaseId: base.phaseId || '',  
    week: base.week || '',  
    day: base.day || '',  
    exerciseIndex: 0,  
    exercises: (base.exerciseBlocks || []).map(toCockpitExercise)  
  };  
}

function logCockpitSet(cockpit, exerciseIndex, override = {}) {  
  const next = clone(cockpit);  
  const ex = next.exercises[exerciseIndex];  
  if (!ex) return next;

  if (ex.optional && !ex.started) ex.started = true;

  const baseActual = defaultActualFromBlock({  
    targetRepsOrDuration: ex.prescribedRepsOrDuration,  
    targetWeightOrLoad: ex.workingLoad || ex.prescribedLoad,  
    tempo: ex.prescribedTempo,  
    rir: ex.prescribedRir,  
    rest: ex.prescribedRest  
  });

  const actual = {  
    ...baseActual,  
    ...override  
  };

  if (ex.establishLoad && !clean(actual.actualLoad)) {  
    throw new Error('Working load required before logging this set.');  
  }

  ex.completedSets.push({  
    setNumber: ex.completedSets.length + 1,  
    ...actual,  
    loggedAt: new Date().toISOString()  
  });

  return next;  
}

function setCockpitWorkingLoad(cockpit, exerciseIndex, load) {  
  const next = clone(cockpit);  
  const ex = next.exercises[exerciseIndex];  
  if (!ex) return next;  
  ex.workingLoad = clean(load);  
  return next;  
}

function skipCockpitExercise(cockpit, exerciseIndex) {  
  const next = clone(cockpit);  
  const ex = next.exercises[exerciseIndex];  
  if (!ex) return next;  
  ex.skipped = true;  
  ex.started = false;  
  return next;  
}

function startOptionalCockpitExercise(cockpit, exerciseIndex) {  
  const next = clone(cockpit);  
  const ex = next.exercises[exerciseIndex];  
  if (!ex) return next;  
  ex.started = true;  
  ex.skipped = false;  
  return next;  
}  

return {  
  load,  
  save,  
  blankBlock,  
  blankWorkout,  
  parse,  
  upsert,  
  remove,  
  move,  
  duplicate,  
  mark,  
  clone,  
  buildCockpitWorkout,  
  logCockpitSet,  
  setCockpitWorkingLoad,  
  skipCockpitExercise,  
  startOptionalCockpitExercise,  
  defaultActualFromBlock  
};  
})();  