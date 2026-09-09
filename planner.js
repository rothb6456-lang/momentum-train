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
    tags: [],
    optional: false,
    timed: false,
    section: 'primary'
  });
  const blankWorkout = () => ({ id: id(), title: 'Untitled workout', canonicalTitle: '', subtitle: '', scheduledDate: '', phaseId: '', week: '', day: '', sourceType: 'manual', sourceRawText: '', status: 'queued', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), exerciseBlocks: [blankBlock()] });
  function parseLine(line, order) {
    const text = clean(line).replace(/^\s*(?:\d+[.)]|[-•])\s*/, '');
    const tempoMatch = text.match(/(?:tempo[:\s]*)?(\d+\s*-\s*\d+\s*-\s*(?:\d+|x))/i)?.[1] || '';
    const tempo = normalizeTempoOrSpecial(tempoMatch);
    const rir = normalizeRir(text.match(/RIR[:\s]*([\d+\-– ]+)/i)?.[1] || '');
    const load = text.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?)/i)?.[1] || '';
    const rest = normalizeRest(text.match(/rest[:\s]+(\d+(?:\s*-\s*\d+)?\s*(?:sec|min|s|m))/i)?.[1] || '');
    const target = text.match(/(?:\b(\d+)\s*[x×]\s*)?(\d+(?:\s*[-–]\s*\d+)?\s*(?:reps?|sec(?:onds?)?|min(?:utes?)?)?)/i);
    const split = text.split(/\s+(?:[-—]|\||: )\s*/);
    const rawExerciseName = clean(split[0].replace(/\b\d+\s*[x×].*$/i, '')) || text;
    const isOpt = /\boptional\b/i.test(rawExerciseName);
    const exerciseName = normalizeExerciseName(rawExerciseName);
    const targetRepsOrDur = target?.[2]?.trim() || '';
    const timed = isTimedExercise(exerciseName, targetRepsOrDur);
    const notes = clean(
      text
        .replace(rawExerciseName, '')
        .replace(/(?:tempo[:\s]*)?\d+\s*-\s*\d+\s*-\s*(?:\d+|x)/ig, '')
        .replace(/RIR[:\s]*[\d+\-– ]+/ig, '')
        .replace(/rest[:\s]+\d+(?:\s*-\s*\d+)?\s*(?:sec|min|s|m)/ig, '')
    );

    return {
      ...blankBlock(order),
      exerciseName,
      targetSets: target?.[1] || '',
      targetRepsOrDuration: targetRepsOrDur,
      targetWeightOrLoad: load,
      tempo,
      rir,
      rest,
      notes,
      optional: isOpt,
      timed,
      section: isOpt ? 'optional' : (/warm-?up|preparation/i.test(exerciseName) ? 'warmup' : 'primary'),
      checkpoints: '',
      tags: []
    };
  }
  function parse(rawText) {
    const parsed = parseWorkoutCardText(rawText);

    const workout = blankWorkout();
    workout.title = parsed.title || 'Pasted workout card';
    workout.canonicalTitle = parsed.canonicalTitle || parsed.title || '';
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
          optional: ex.optional || false,
          timed: ex.timed || false,
          section: ex.section || 'primary',
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
      canonicalTitle: meta.canonicalTitle || meta.title || '',
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
      exercises: exercises.map((ex, i) => {
        const isOpt = ex.optional || isOptionalExercise(ex);
        const cleanName = normalizeExerciseName(ex.name || '');
        const timed = ex.timed || isTimedExercise(cleanName, ex.reps || '');
        return {
          id: ex.id || `planned-${Date.now()}-${i + 1}`,
          name: cleanName,
          sets: ex.sets || '',
          reps: ex.reps || '',
          load: normalizeLoad(ex.load || ''),
          tempo: normalizeTempoOrSpecial(ex.tempo || ''),
          rir: normalizeRir(ex.rir || ''),
          rest: normalizeRest(ex.rest || ''),
          notes: ex.notes || '',
          optional: isOpt,
          timed: timed,
          section: ex.section || (isOpt ? 'optional' : (/warm-?up|preparation/i.test(cleanName) ? 'warmup' : 'primary'))
        };
      }),
      warnings: buildParseWarnings(meta, exercises)
    };
  }

function normalizeWorkoutText(input) {
  return String(input || '')
    .replace(/\r/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
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
  const weekDayMatch = text.match(/\bWEEK\s+(\d+)\s*[•·|\/-]?\s*DAY\s+(\d+)\b/i) ||
                       text.match(/\bDAY\s+(\d+)\b/i);
  const week = weekDayMatch ? (weekDayMatch[2] ? weekDayMatch[1] : '') : '';
  const day = weekDayMatch ? (weekDayMatch[2] ? weekDayMatch[2] : weekDayMatch[1]) : '';

  let canonicalTitle = '';
  const canonMatch = text.match(/\b(Phase\s+\d+[^:\n\r]+:\s*[^\n\r]+)/i);
  if (canonMatch) {
    canonicalTitle = clean(canonMatch[1]);
  }

  let title = '';
  if (weekDayMatch) {
    const wdLineIndex = lines.findIndex(line => /\b(WEEK\s+\d+.*\bDAY\s+\d+|DAY\s+\d+)\b/i.test(line));
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
    title = fallback || canonicalTitle || '';
  }

  const headerMeta = parseHeaderMeta(lines);

  return {
    phase: phaseMatch ? phaseMatch[1] : '',
    week: week,
    day: day,
    title: title || canonicalTitle || 'Pasted workout card',
    canonicalTitle: canonicalTitle || title || '',
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

  // The first numbered line might be a header target-list item (e.g. "4. Serratus..."
  // under Secondary:) rather than a real exercise. The real exercise section
  // begins after the last header marker (duration / confidence / targets).
  let firstExerciseIndex = lines.findIndex(line => /^\d+\.\s+/.test(line));
  let lastHeaderMarker = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^(target duration|overall\s+.*confidence|primary targets|secondary)\s*:/i.test(lines[i])) {
      lastHeaderMarker = i;
    }
  }
  if (lastHeaderMarker >= 0) {
    for (let i = lastHeaderMarker + 1; i < lines.length; i++) {
      if (/^\d+\.\s+/.test(lines[i])) { firstExerciseIndex = i; break; }
    }
  }
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

    const confidenceMatch = line.match(/confidence:\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (confidenceMatch) {
      confidence = clean(confidenceMatch[1]);
      mode = '';
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      // Numbered items inside a Primary/Secondary target list are targets, not
      // the start of the exercise section — capture them and keep scanning.
      if (mode === 'primary' || mode === 'secondary') {
        const cleanedLine = cleanHeaderBullet(line);
        if (cleanedLine && isLikelyHeaderMetaLine(cleanedLine)) {
          if (mode === 'primary') primaryTargets.push(cleanedLine);
          else secondaryTargets.push(cleanedLine);
        }
        continue;
      }
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
  const rawName = safeCell(cells, columnMap.exercise);
  if (!rawName) return null;

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

  const isOpt = /\boptional\b/i.test(rawName) || /\boptional\b/i.test(notes);
  const cleanName = normalizeExerciseName(rawName);
  const timed = isTimedExercise(cleanName, sr.reps);

  return {
    name: cleanName,
    sets: sr.sets,
    reps: sr.reps,
    load: cleanLoad,
    tempo: cleanTempo,
    rir: cleanRir,
    rest: cleanRest,
    notes: joinNotes([notes, leftovers.join('; ')]),
    optional: isOpt,
    timed: timed,
    section: isOpt ? 'optional' : (/warm-?up|preparation/i.test(cleanName) ? 'warmup' : 'primary')
  };
}

function parseNarrativeWorkout(text) {
  const lines = text.split('\n');
  const exercises = [];

  // Check for an unnumbered Warm-Up block before the first numbered exercise
  const firstNumberedIndex = lines.findIndex(l => /^\d+\.\s+/.test((l || '').trim()));
  const preLines = firstNumberedIndex >= 0 ? lines.slice(0, firstNumberedIndex) : [];
  
  const warmupIndex = preLines.findIndex(l => /^(?:#+\s*)?warm-?up\s*[:?]?/i.test((l || '').trim()) || /^(?:#+\s*)?shoulder preparation\s*[:?]?/i.test((l || '').trim()));
  if (warmupIndex >= 0) {
    const warmupBlock = preLines.slice(warmupIndex + 1);
    const warmExercises = parseCompoundWarmupBlock('Warm-Up', warmupBlock);
    warmExercises.forEach(ex => exercises.push(ex));
  }

  if (firstNumberedIndex < 0) {
    return parseUnnumberedNarrativeWorkout(lines);
  }

  let i = firstNumberedIndex;

  while (i < lines.length) {
    const line = (lines[i] || '').trim();

    const headingMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (!headingMatch || !isLikelyExerciseHeading(headingMatch[2])) {
      i++;
      continue;
    }

    const number = headingMatch[1];
    const rawHeadingName = headingMatch[2].trim();

    const block = [];
    i++;
    while (i < lines.length && !/^\d+\.\s+/.test((lines[i] || '').trim())) {
      block.push((lines[i] || '').trim());
      i++;
    }

    // Skip numbered header list items
    const isHeaderDebris = block.some(b =>
      /^(target duration|overall\s+.*confidence|primary targets|secondary)\s*:/i.test(String(b || '').trim())
    );
    if (isHeaderDebris) continue;

    // Check if this heading is a compound Warm-Up / Preparation block with sub-items
    if (/^(warm-?up|shoulder preparation|movement preparation)\b/i.test(rawHeadingName)) {
      const warmExercises = parseCompoundWarmupBlock(rawHeadingName, block);
      if (warmExercises.length) {
        warmExercises.forEach(ex => exercises.push(ex));
        continue;
      }
    }

    const rawName = normalizeExerciseName(rawHeadingName);
    const exercise = parseNarrativeExerciseBlock(number, rawName, block);
    if (exercise && hasMeaningfulExercise(exercise)) exercises.push(exercise);
  }

  return exercises;
}

function parseUnnumberedNarrativeWorkout(lines) {
  const exercises = [];
  let section = 'primary';
  let sectionStarted = false;
  let i = 0;

  while (i < lines.length) {
    const line = (lines[i] || '').trim();
    if (!line) {
      i++;
      continue;
    }

    const sectionMatch = line.match(/^(warm-?up|primary pull|secondary pull|grip specialization|shoulder support|cool-?down|finisher)\s*:?[\s]*$/i);
    if (sectionMatch) {
      sectionStarted = true;
      section = /warm-?up/i.test(sectionMatch[1]) ? 'warmup'
        : /optional|finisher|grip specialization/i.test(sectionMatch[1]) ? (/grip specialization/i.test(sectionMatch[1]) ? 'primary' : 'optional')
          : 'primary';
      i++;
      continue;
    }

    if (!sectionStarted || !isUnnumberedExerciseHeading(lines, i)) {
      i++;
      continue;
    }

    const rawName = line;
    const block = [];
    i++;
    while (i < lines.length && !isUnnumberedExerciseHeading(lines, i) && !/^(warm-?up|primary pull|secondary pull|grip specialization|shoulder support|cool-?down|finisher)\s*:?[\s]*$/i.test((lines[i] || '').trim())) {
      block.push((lines[i] || '').trim());
      i++;
    }

    const exercise = parseNarrativeExerciseBlock(String(exercises.length + 1), rawName, block);
    if (exercise && hasMeaningfulExercise(exercise)) {
      exercise.section = exercise.optional ? 'optional' : section;
      exercises.push(exercise);
    }
  }

  return exercises;
}

function isUnnumberedExerciseHeading(lines, index) {
  const line = String(lines[index] || '').trim();
  if (!line || line.includes('|') || /^[-•*]/.test(line) || /^[🟢🟡🔴]/u.test(line)) return false;
  if (/^(phase|week|day|session intent|intent|execution|checkpoint|stoplight|cue|progression|load target|target duration|confidence|primary targets|secondary|overall)\b/i.test(line)) return false;
  if (/^(warm-?up|primary pull|secondary pull|grip specialization|shoulder support|cool-?down|finisher)\s*:?[\s]*$/i.test(line)) return false;

  for (let lookahead = index + 1; lookahead < Math.min(index + 8, lines.length); lookahead++) {
    const next = String(lines[lookahead] || '').trim();
    if (/^\d+(?:\s*x\s*|:\d{2})/.test(next) && next.includes('|')) return true;
    if (/^(?:warm-?up|primary pull|secondary pull|grip specialization|shoulder support|cool-?down|finisher)\s*:?[\s]*$/i.test(next)) return false;
  }
  return false;
}

function parseCompoundWarmupBlock(heading, blockLines) {
  const results = [];
  const nonEmpty = blockLines.map(s => s.trim()).filter(Boolean);

  for (const line of nonEmpty) {
    if (/^(primary targets|secondary|target duration|overall|confidence)\s*:/i.test(line)) continue;
    
    // Check if this line is an exercise item or a metadata field
    const subMatch = line.match(/^[-•*]?\s*([A-Za-z0-9\s()',/-]+?)\s*[:—|-]\s*(.+)$/);
    if (subMatch) {
      const fieldName = subMatch[1].trim();
      if (/^(intent|cuff|shoulders?|red|green|yellow|checkpoint|stop if|target|confidence|progression|tempo|rir|rest|stoplight|cues?|note)$/i.test(fieldName)) {
        if (results.length > 0) {
          const last = results[results.length - 1];
          if (/^tempo$/i.test(fieldName)) last.tempo = normalizeTempoOrSpecial(subMatch[2]);
          else if (/^rir$/i.test(fieldName)) last.rir = normalizeRir(subMatch[2]);
          else if (/^rest$/i.test(fieldName)) last.rest = normalizeRest(subMatch[2]);
          else last.notes = joinNotes([last.notes, `${fieldName}: ${subMatch[2]}`]);
        }
        continue;
      }

      const subName = normalizeExerciseName(subMatch[1]);
      const subDetail = subMatch[2].trim();
      const parsedSub = parseNarrativePrescriptionLine(subName, subDetail);
      if (hasMeaningfulExercise(parsedSub)) {
        parsedSub.section = 'warmup';
        parsedSub.notes = joinNotes([parsedSub.notes, 'Warm-up / prep']);
        results.push(parsedSub);
      }
    }
  }

  if (results.length) return results;

  const single = parseNarrativeExerciseBlock('1', normalizeExerciseName(heading), blockLines);
  if (single && hasMeaningfulExercise(single)) {
    single.section = 'warmup';
    return [single];
  }
  return [];
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

  const isOpt = /\boptional\b/i.test(rawName) || nonEmpty.some(l => /\boptional\b/i.test(l));
  const cleanName = normalizeExerciseName(rawName);

  const prescriptionLine = nonEmpty.find(line =>
    line.includes('|') && (/\b\d+\s*x\s*/i.test(line) || /^\d+:\d{2}\s*\|/.test(line))
  );

  let parsed = {
    name: cleanName,
    sets: '',
    reps: '',
    load: '',
    tempo: '',
    rir: '',
    rest: '',
    notes: '',
    optional: isOpt,
    timed: isTimedExercise(cleanName, ''),
    section: isOpt ? 'optional' : (/warm-?up|preparation/i.test(cleanName) ? 'warmup' : 'primary')
  };

  if (prescriptionLine) {
    parsed = parseNarrativePrescriptionLine(cleanName, prescriptionLine);
    parsed.optional = isOpt;
    parsed.section = isOpt ? 'optional' : (/warm-?up|preparation/i.test(cleanName) ? 'warmup' : 'primary');
    parsed.timed = isTimedExercise(cleanName, parsed.reps);
  }

  const shortNotes = [];
  for (const line of nonEmpty) {
    if (line === prescriptionLine) continue;
    if (/^(confidence|w\d+d\d+|progression|target|technical requirements?|technical cues?|tomorrow|therefore|stop if|only perform)/i.test(line)) continue;
    if (/^\d+\s*x\s*/i.test(line)) continue;
    if (line.includes('|')) continue;

    if (cleanName.toLowerCase() === 'warm-up' || cleanName.toLowerCase() === 'shoulder preparation') {
      if (line.length <= 80) shortNotes.push(line);
      continue;
    }

    if (line.length <= 120) {
      shortNotes.push(line);
    }
  }

  parsed.notes = joinNotes([parsed.notes, shortNotes.slice(0, 3).join(' | ')]);
  return parsed;
}

function parseNarrativePrescriptionLine(name, line) {
  const isOpt = /\boptional\b/i.test(name) || /\boptional\b/i.test(line);
  const cleanName = normalizeExerciseName(name);

  const parts = line.split('|').map(s => s.trim()).filter(Boolean);
  if (!parts.length) {
    return { name: cleanName, sets: '', reps: '', load: '', tempo: '', rir: '', rest: '', notes: '', optional: isOpt, timed: isTimedExercise(cleanName, ''), section: isOpt ? 'optional' : 'primary' };
  }

  const sr = parseSetsRepsCell(parts[0]);
  const tail = parts.slice(1);
  let load = '';
  let tempo = '';
  let rir = '';
  let restVal = '';
  const notes = [];

  let positional = false;
  if (tail.length >= 3) {
    const loadTok = tail[0], tempoTok = tail[1], rirTok = tail[2], restTok = tail[3] ?? '';
    if (looksLikeTempo(tempoTok) && looksLikeRir(rirTok) && (restTok === '' || looksLikeRest(restTok))) {
      load = normalizeLoad(loadTok);
      tempo = normalizeTempoOrSpecial(tempoTok, notes);
      rir = normalizeRir(rirTok);
      restVal = normalizeRest(restTok);
      positional = true;
      for (let i = 4; i < tail.length; i++) notes.push(tail[i]);
    }
  }

  if (!positional) {
    for (let i = 0; i < tail.length; i++) {
      const token = tail[i];

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
      if (!restVal && looksLikeRest(token)) {
        restVal = normalizeRest(token);
        continue;
      }

      notes.push(token);
    }
  }

  const timed = isTimedExercise(cleanName, sr.reps);

  return {
    name: cleanName,
    sets: sr.sets,
    reps: sr.reps,
    load,
    tempo,
    rir,
    rest: restVal,
    notes: joinNotes(notes),
    optional: isOpt,
    timed: timed,
    section: isOpt ? 'optional' : (/warm-?up|preparation/i.test(cleanName) ? 'warmup' : 'primary')
  };
}

function parseSetsRepsCell(value) {
  const cell = String(value || '').trim();
  if (!cell) return { sets: '', reps: '' };

  const match = cell.match(/^(\d+(?:\s*-\s*\d+)?)\s*x\s*(.+)$/i);
  if (!match) return { sets: '', reps: cell };

  return {
    sets: match[1].replace(/\s/g, ''),
    reps: match[2].trim()
  };
}

function looksLikeLoad(value) {
  const v = String(value || '').trim().toLowerCase();
  return /\b(lb|lbs|kg|bw|bodyweight|total|plate|stack)\b/.test(v) || /^\d+(\.\d+)?$/.test(v);
}

function looksLikeTempo(value) {
  const v = String(value || '').trim().toLowerCase();
  return (
    /^\d+-\d+-\d+(-\d+)?$/.test(v) ||
    /\bcontrolled\b/.test(v) ||
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
  let v = String(value || '').trim();
  if (!v) return '';

  v = v.replace(/^tempo[:\s]*/i, '').trim();

  if (/^\d+\s*-\s*\d+\s*-\s*(?:\d+|x)(?:-\d+)?$/i.test(v)) {
    return v.replace(/\s/g, '');
  }
  if (/^controlled$/i.test(v)) return 'Controlled';

  if (/\bmph\b/i.test(v) || /\bincline\b/i.test(v)) {
    if (leftovers) leftovers.push(v);
    return '';
  }

  const match = v.match(/(\d+\s*-\s*\d+\s*-\s*(?:\d+|x))/i);
  if (match) {
    return match[1].replace(/\s/g, '');
  }

  return v;
}

function normalizeRir(value) {
  let v = String(value || '').trim();
  if (!v) return '';

  v = v.replace(/^rir[:\s]*/i, '').replace(/\bRIR\b/gi, '').replace(/\s+/g, '').trim();
  return v;
}

function normalizeRest(value) {
  let v = String(value || '').trim();
  if (!v) return '';

  v = v.replace(/^rest[:\s]*/i, '').trim();
  return v
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

  const stripped = raw
    .replace(/^optional\s*[:-]?\s*/i, '')
    .replace(/\s*\(\s*optional\s*\)\s*$/i, '')
    .trim();

  const lowerKeep = new Set(['of', 'and', 'or', 'the', 'to', 'for', 'with', 'on', 'in']);
  return stripped
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

function isTimedExercise(name, targetRepsOrDuration) {
  const n = String(name || '').toLowerCase();
  const r = String(targetRepsOrDuration || '').toLowerCase();

  if (/\b(sec|min|seconds?|minutes?|s|m)\b/.test(r)) return true;
  if (/\b(hold|carry|walk|walking|treadmill|plank|hang|dead hang|cardio|rower|bike|conditioning)\b/.test(n)) return true;
  return false;
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
  const isOpt = block.optional || isOptionalExercise(block);
  const cleanName = normalizeExerciseName(block.exerciseName || '');
  const timed = block.timed || isTimedPrescription(block) || isTimedExercise(cleanName, block.targetRepsOrDuration);

  return {
    id: block.id || id(),
    order: index + 1,
    exerciseName: cleanName,
    rawExerciseName: clean(block.exerciseName || ''),
    prescribedSets: Number(block.targetSets || 0) || 0,
    prescribedRepsOrDuration: clean(block.targetRepsOrDuration || ''),
    prescribedLoad: clean(block.targetWeightOrLoad || ''),
    prescribedTempo: normalizeTempoOrSpecial(block.tempo || ''),
    prescribedRir: normalizeRir(block.rir || ''),
    prescribedRest: normalizeRest(block.rest || ''),
    notes: clean(block.notes || ''),
    optional: isOpt,
    section: block.section || (isOpt ? 'optional' : (/warm-?up|preparation/i.test(cleanName) ? 'warmup' : 'primary')),
    establishLoad: isEstablishLoad(block),
    unilateral: isUnilateralPrescription(block),
    timed: timed,
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
    canonicalTitle: base.canonicalTitle || base.title || '',
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