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
    section: 'primary',  
    sectionLabel: 'Working'  
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
      ? parsed.exercises.map((ex, index) => {  
          const section = ex.section || (ex.optional ? 'optional' : 'primary');  
          const sectionLabelMap = { warmup: 'Warm-Up', primary: 'Working', optional: 'Optional', finisher: 'Finisher', cooldown: 'Cool-Down' };  
          return {  
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
            section: section,  
            sectionLabel: sectionLabelMap[section] || 'Working',  
            checkpoints: '',  
            tags: []  
          };  
        })  
      : [blankBlock(1)];

    return workout;
  }

  async function generateCoachCard() {
    const btn = document.getElementById('btn-generate-coach-card');
    const spinner = document.getElementById('coach-ai-spinner');
    const statusDiv = document.getElementById('coach-ai-status');
    if (!btn || !spinner || !statusDiv) return;

    const showStatus = (message, type) => {
      statusDiv.className = `coach-ai-status-message ${type}`;
      statusDiv.textContent = message;
      statusDiv.classList.remove('hidden');
    };

    if (!navigator.onLine) {
      showStatus('Offline Mode: You must be connected to network to generate new AI cards. You can still paste or select starter cards.', 'error');
      return;
    }

    btn.disabled = true;
    spinner.classList.remove('hidden');
    btn.querySelector('.btn-text').textContent = 'Evaluating Guardrails & Generating...';
    showStatus('Coach is compiling your active joint profile, PRs, and recent session notes...', 'info');

    try {
      const token = typeof MomentumSync !== 'undefined' && typeof MomentumSync.getToken === 'function'
        ? MomentumSync.getToken()
        : localStorage.getItem('momentum_auth_token');

      if (!token) throw new Error('User not authenticated. Please log in via Statbook setting.');

      const response = await fetch('/api/v1/training/coach/generate-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ request_type: 'queue_next' })
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to generate card from Coach AI.');
      }

      const generated = parse(result.workout_card || '');
      if (!generated || !generated.exerciseBlocks.length) {
        throw new Error('Coach AI returned a card that could not be parsed.');
      }
      upsert(generated);
      if (typeof renderToday === 'function') renderToday();

      const assumptions = result.metadata && result.metadata.active_assumptions_count;
      const suffix = assumptions == null ? '' : ` (${assumptions} active guardrails enforced)`;
      showStatus(`Workout Card successfully generated and queued!${suffix}`, 'success');
      setTimeout(() => statusDiv.classList.add('hidden'), 4000);
    } catch (error) {
      console.error('Coach AI Generation Error:', error);
      showStatus(`Error: ${error.message}`, 'error');
    } finally {
      btn.disabled = false;
      spinner.classList.add('hidden');
      btn.querySelector('.btn-text').textContent = 'Generate Card with Coach AI';
    }
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
    .replace(/[""]/g, '"')  
    .replace(/['']/g, "'")  
    .replace(/[‐‑–—]/g, '-')  
    .replace(/[⸻⸺─━]/g, '---')  
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
  const weekDayMatch = text.match(/\bWEEK\s+(\d+)\s*[•|\/-]?\s*DAY\s+(\d+)\b/i) ||
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

  // Section headers that provide context but aren't exercises  
  const sectionHeaderPattern = /^(?:#+\s*)?(warm-?up|primary\s+pull|primary\s+push|primary|secondary\s+pull|secondary\s+push|secondary|grip\s+specialization|shoulder\s+support|arms|legs|capacity|conditioning|cool-?down|finisher|accessory|supplemental|core)\s*$/i;

  // Map section header text to section type  
  const sectionTypeMap = {  
    'warm-up': 'warmup', 'warmup': 'warmup',  
    'primary': 'primary', 'primary pull': 'primary', 'primary push': 'primary',  
    'secondary': 'primary', 'secondary pull': 'primary', 'secondary push': 'primary',  
    'grip specialization': 'primary',  
    'shoulder support': 'primary',  
    'arms': 'primary', 'legs': 'primary',  
    'capacity': 'primary', 'conditioning': 'primary',  
    'cool-down': 'cooldown', 'cooldown': 'cooldown',  
    'finisher': 'finisher',  
    'accessory': 'optional', 'supplemental': 'optional',  
    'core': 'primary'  
  };

  const sectionLabelMap = {  
    warmup: 'Warm-Up', primary: 'Working', optional: 'Optional',  
    finisher: 'Finisher', cooldown: 'Cool-Down'  
  };

  // Warm-up heading patterns  
  const warmupHeadingPattern = /^(?:#+\s*)?(warm-?up|shoulder preparation|movement preparation|activation)\s*[:?]?\s*$/i;

  // Divider  
  const dividerPattern = /^-{3,}$/;

  // Lines that are clearly not exercise names  
  const nonExercisePattern = /^(intent:|checkpoint:|stoplight:|execution:|progression:|cue:|cues:|note:|load target:|therefore:|stop if:|grip:|today:|session intent:)/i;

  // Emoji/stoplight lines  
  const emojiPattern = /^[🟢🟡🔴]/;

  // Descriptive lines that look like coaching notes, not exercises  
  const coachingNotePattern = /^(pull elbows|drive elbows|chest stays|keep shoulder|maintain|initiate|avoid|use the|do not|own the|match the|raise temperature|your historical|this is|hold \d|progress through|first set should)/i;

  // Lines that look like a prescription: "3 x 8-12 | 140 lb | 2-1-2 | RIR 2 | 2-3 min"  
  const prescriptionPattern = /\b\d+\s*x\s*\d+/i;

  // Lines that look like a timed prescription: "5:00 | 4.7 mph" or "30-45 sec"  
  const timedPrescriptionPattern = /^\d+:\d+\s*\|/;

  // Detect format: numbered (1. Exercise) vs unnumbered (section headers)  
  const hasNumberedExercises = lines.some(l => /^\d+\.\s+/.test((l || '').trim()));

  if (hasNumberedExercises) {  
    // ---- NUMBERED FORMAT (original logic) ----  
    return parseNumberedNarrativeWorkout(lines, exercises, sectionHeaderPattern, warmupHeadingPattern, dividerPattern);  
  }

  // ---- UNNUMBERED / SECTION-HEADER FORMAT ----  
  let currentSection = 'primary';  
  let currentSectionLabel = 'Working';  
  let i = 0;

  // Skip past metadata header lines (phase, week, day, title, intent, targets, etc.)  
  const metaSkipPattern = /^(phase\s+\d|week\s+\d|day\s+\d|primary targets|secondary:|target duration|confidence|session intent)/i;

  while (i < lines.length) {  
    const line = (lines[i] || '').trim();

    // Skip empty lines  
    if (!line) { i++; continue; }

    // Skip dividers  
    if (dividerPattern.test(line)) { i++; continue; }

    // Check for section headers  
    if (sectionHeaderPattern.test(line)) {  
      const key = line.replace(/^#+\s*/, '').trim().toLowerCase();  
      currentSection = sectionTypeMap[key] || 'primary';  
      currentSectionLabel = sectionLabelMap[currentSection] || line.replace(/^#+\s*/, '').trim();  
      i++;  
      continue;  
    }

    // Skip warm-up headings (handled separately below)  
    if (warmupHeadingPattern.test(line)) {  
      currentSection = 'warmup';  
      currentSectionLabel = 'Warm-Up';  
      i++;  
      continue;  
    }

    // Skip metadata lines  
    if (metaSkipPattern.test(line)) { i++; continue; }

    // Skip non-exercise lines  
    if (nonExercisePattern.test(line)) { i++; continue; }  
    if (emojiPattern.test(line)) { i++; continue; }  
    if (coachingNotePattern.test(line)) { i++; continue; }

    // Accept the compact card format: "Exercise - Sets x Reps | Load | ...".
    const compactCard = parseCompactNarrativeCard(line);
    if (compactCard) {
      compactCard.section = currentSection;
      compactCard.sectionLabel = sectionLabelMap[currentSection] || currentSectionLabel;
      exercises.push(compactCard);
      i++;
      continue;
    }

    // Skip lines that are clearly prescriptions without a preceding exercise  
    if (prescriptionPattern.test(line) && !isLikelyExerciseName(line)) { i++; continue; }  
    if (timedPrescriptionPattern.test(line)) { i++; continue; }

    // Check if this line looks like an exercise name  
    if (isLikelyExerciseName(line)) {  
      const rawName = line;

      // Collect all subsequent lines until the next exercise name, section header, or divider  
      const block = [];  
      i++;  
      while (i < lines.length) {  
        const bLine = (lines[i] || '').trim();

        // Stop at dividers  
        if (dividerPattern.test(bLine)) { i++; break; }

        // Stop at section headers  
        if (sectionHeaderPattern.test(bLine)) break;  
        if (warmupHeadingPattern.test(bLine)) break;

        // Stop at next exercise name (but not prescription lines)  
        if (bLine && isLikelyExerciseName(bLine) && !prescriptionPattern.test(bLine) && !timedPrescriptionPattern.test(bLine)) break;

        block.push(bLine);  
        i++;  
      }

      // Parse the exercise and its block  
      const cleanName = normalizeExerciseName(rawName);  
      const isWarmupExercise = currentSection === 'warmup' || /warm-?up|preparation/i.test(cleanName);  
      const effectiveSection = isWarmupExercise ? 'warmup' : currentSection;

      // Find the prescription line in the block  
      const prescriptionLine = block.find(l =>  
        l && (l.includes('|') || prescriptionPattern.test(l))  
      );

      let parsed;  
      if (prescriptionLine) {  
        parsed = parseNarrativePrescriptionLine(cleanName, prescriptionLine);  
      } else {  
        parsed = {  
          name: cleanName,  
          sets: '', reps: '', load: '', tempo: '', rir: '', rest: '',  
          notes: '', optional: false, timed: isTimedExercise(cleanName, ''),  
          section: effectiveSection  
        };  
      }

      parsed.section = effectiveSection;  
      parsed.sectionLabel = sectionLabelMap[effectiveSection] || currentSectionLabel;  
      parsed.optional = parsed.optional || effectiveSection === 'optional';

      // Collect relevant notes from the block (checkpoints, etc.)  
      const skipNotePattern = /^(intent:|checkpoint:|stoplight:|execution:|progression:|cue:|cues?:|note:|load target:|therefore:|stop if:|grip:|today:|session intent:)/i;  
      const shortNotes = [];  
      for (const bLine of block) {  
        if (!bLine) continue;  
        if (bLine === prescriptionLine) continue;  
        if (skipNotePattern.test(bLine)) continue;  
        if (emojiPattern.test(bLine)) continue;  
        if (coachingNotePattern.test(bLine)) continue;  
        if (prescriptionPattern.test(bLine)) continue;  
        if (timedPrescriptionPattern.test(bLine)) continue;  
        if (bLine.length <= 100) shortNotes.push(bLine);  
      }

      if (shortNotes.length) {  
        parsed.notes = joinNotes([parsed.notes, shortNotes.slice(0, 2).join(' | ')]);  
      }

      if (hasMeaningfulExercise(parsed)) {  
        exercises.push(parsed);  
      }

      continue;  
    }

    // Skip unrecognized lines  
    i++;  
  }

  return exercises;  
}

// Moved original numbered logic to its own function  
function parseNumberedNarrativeWorkout(lines, exercises, sectionHeaderPattern, warmupHeadingPattern, dividerPattern) {  
  const firstNumberedIndex = lines.findIndex(l => /^\d+\.\s+/.test((l || '').trim()));

  const preLines = firstNumberedIndex >= 0 ? lines.slice(0, firstNumberedIndex) : [];

  // Split pre-lines into sections divided by --- dividers  
  const preSections = [];  
  let currentSection = [];  
  for (const line of preLines) {  
    const trimmed = (line || '').trim();  
    if (dividerPattern.test(trimmed)) {  
      if (currentSection.length) preSections.push(currentSection);  
      currentSection = [];  
    } else {  
      currentSection.push(trimmed);  
    }  
  }  
  if (currentSection.length) preSections.push(currentSection);

  // Process each pre-section for warm-up content  
  for (const section of preSections) {  
    const hasWarmupHeading = section.some(l => warmupHeadingPattern.test(l));  
    const hasCardioLine = section.some(l => /\b(treadmill|bike|rower|walking|jogging|elliptical)\b/i.test(l));  
    if (hasWarmupHeading || hasCardioLine) {  
      const warmExercises = parseCompoundWarmupBlock('Warm-Up', section);  
      warmExercises.forEach(ex => exercises.push(ex));  
    }  
  }

  let sectionContext = 'primary';  
  let i = firstNumberedIndex >= 0 ? firstNumberedIndex : 0;

  while (i < lines.length) {  
    const line = (lines[i] || '').trim();

    if (dividerPattern.test(line)) { i++; continue; }

    if (sectionHeaderPattern.test(line)) {  
      sectionContext = line.replace(/^#+\s*/, '').trim().toLowerCase();  
      i++;  
      continue;  
    }

    if (warmupHeadingPattern.test(line)) { i++; continue; }

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
      const bLine = (lines[i] || '').trim();  
      if (dividerPattern.test(bLine)) { i++; break; }  
      block.push(bLine);  
      i++;  
    }

    const isHeaderDebris = block.some(b =>  
      /^(target duration|overall\s+.*confidence|primary targets|secondary)\s*:/i.test(String(b || '').trim())  
    );  
    if (isHeaderDebris) continue;

    if (/^(warm-?up|shoulder preparation|movement preparation)\b/i.test(rawHeadingName)) {  
      const warmExercises = parseCompoundWarmupBlock(rawHeadingName, block);  
      if (warmExercises.length) {  
        warmExercises.forEach(ex => exercises.push(ex));  
        continue;  
      }  
    }

    const rawName = normalizeExerciseName(rawHeadingName);  
    const exercise = parseNarrativeExerciseBlock(number, rawName, block);  
    if (exercise && hasMeaningfulExercise(exercise)) {  
      if (exercise.section === 'primary' && sectionContext !== 'primary') {  
        exercise.sectionLabel = sectionContext;  
      }  
      exercises.push(exercise);  
    }  
  }

  return exercises;  
}

// Helper: determine if a line looks like an exercise name  
function isLikelyExerciseName(line) {  
  const trimmed = String(line || '').trim();  
  if (!trimmed) return false;  
  if (trimmed.length < 3 || trimmed.length > 80) return false;

  // Must not be metadata  
  if (/^(phase\s+\d|week\s+\d|day\s+\d|primary targets|secondary:|target duration|confidence|session intent)/i.test(trimmed)) return false;

  // Must not be a prescription line  
  if (/^\d+\s*x\s*\d+/i.test(trimmed)) return false;  
  if (/^\d+:\d+\s*\|/.test(trimmed)) return false;

  // Must not be coaching/intent lines  
  if (/^(intent:|checkpoint:|stoplight:|execution:|progression:|cue:|cues?:|note:|load target:|therefore:|stop if:|grip:|today:)/i.test(trimmed)) return false;

  // Must not be emoji lines  
  if (/^[🟢🟡🔴]/.test(trimmed)) return false;

  // Must not be descriptive coaching notes  
  if (/^(pull elbows|drive elbows|chest stays|keep shoulder|maintain|initiate|avoid|use the|do not|own the|match the|raise temperature|your historical|this is|hold \d|progress through|first set should|no unnecessary)/i.test(trimmed)) return false;

  // Must not be purely a number or load  
  if (/^\d+(\.\d+)?\s*(lb|lbs|kg)?$/i.test(trimmed)) return false;

  // Must not contain pipe (prescription line)  
  if (trimmed.includes('|') && /\d/.test(trimmed)) return false;

  // Should start with a capital letter or number (exercise names do)  
  if (!/^[A-Z]/.test(trimmed) && !/^\d+\.\s+/.test(trimmed)) return false;

  // Should look like a name: mostly words, possibly with hyphens/parens  
  if (/^[A-Z][A-Za-z0-9\s()\-,'/]+$/.test(trimmed)) return true;

  // Allow "Cable Face Pull" style  
  if (/^[A-Z][a-z]/.test(trimmed) && trimmed.split(/\s+/).length <= 8) return true;

  return false;  
}  
function parseCompactNarrativeCard(line) {
  const value = String(line || '').trim();
  const match = value.match(/^(.+?)\s+(?:[-:]+|\|)\s*(\d+\s*[x×]\s*[^|]+\|.+)$/i);
  if (!match) return null;

  const name = normalizeExerciseName(match[1]);
  if (!name || !isLikelyExerciseName(name.replace(/\s+/g, ' '))) return null;

  const parsed = parseNarrativePrescriptionLine(name, normalizeWorkoutText(match[2]));
  if (!hasMeaningfulExercise(parsed)) return null;
  parsed.optional = parsed.optional || /\boptional\b/i.test(match[1]);
  parsed.section = parsed.optional ? 'optional' : 'primary';
  return parsed;
}
function isLikelyExerciseHeading(value) {  
  const line = String(value || '').trim();  
  if (!line) return false;

  // Header metadata - not exercises  
  if (/^(primary|secondary|target duration|confidence)\b/i.test(line)) return false;

  // Standalone body part labels that are section headers, not exercises  
  if (/^(rear delts|arms|legs|capacity|conditioning|cool-?down|finisher|accessory|supplemental|core)\s*$/i.test(line)) return false;

  // Program constraint notes  
  if (/^(scapular\/shoulder capacity|no horizontal pressing\.?)$/i.test(line)) return false;

  // Warm-up / preparation section headers (these get handled by parseCompoundWarmupBlock)  
  if (/^(warm-?up|shoulder preparation|movement preparation|activation)\s*$/i.test(line)) return false;

  return true;  
}  
function parseNarrativeExerciseBlock(number, rawName, blockLines) {  
  const nonEmpty = blockLines.map(s => s.trim()).filter(Boolean);

  const isOpt = /\boptional\b/i.test(rawName) || nonEmpty.some(l => /\boptional\b/i.test(l));  
  const cleanName = normalizeExerciseName(rawName);

  const prescriptionLine = nonEmpty.find(line =>  
    line.includes('|') && /\b\d+\s*x\s*/i.test(line)  
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

  // Lines to skip when building notes  
  const skipPattern = /^(confidence|w\d+d\d+|progression|target|technical requirements?|technical cues?|tomorrow|therefore|stop if|only perform|intent:|checkpoint:|stoplight:|grip:|cues?:|note:|this is the same|this is an important|this is explicitly|your\s+\w+\s+result|your\s+recent|today:|do not turn)/i;

  const shortNotes = [];  
  for (const line of nonEmpty) {  
    if (line === prescriptionLine) continue;  
    if (skipPattern.test(line)) continue;  
    if (/^\d+\s*x\s*/i.test(line)) continue;  
    if (line.includes('|')) continue;

    // Skip emoji/stoplight lines  
    if (/^[🟢🟡🔴]/.test(line)) continue;

    // Skip bullet-point technical cues  
    if (/^(chest stays|drive elbows|do not chase|own the|maintain the|initiate with|avoid|use the|keep upper|no torso|elbows remain|shoulders down|separate the|start with|match the)/i.test(line)) continue;

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
  if (!match) return { sets: '', reps: cleanRepsValue(cell) };

  return {  
    sets: match[1].replace(/\s/g, ''),  
    reps: cleanRepsValue(match[2].trim())  
  };  
}

function cleanRepsValue(value) {  
  let v = String(value || '').trim();  
  if (!v) return '';

  // Remove trailing "reps" or "rep" to avoid "8 reps reps" in debrief  
  // But preserve "reps" if it's the ONLY content (edge case)  
  v = v.replace(/\s+reps?\s*$/i, '').trim();

  return v;  
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
    sectionLabel: block.sectionLabel || '',  
    establishLoad: isEstablishLoad(block),
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
  defaultActualFromBlock,
  generateCoachCard
};
})();