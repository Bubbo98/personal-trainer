/**
 * Workout plan PDF → days and exercises (text extracted with pdf-parse).
 * Regression check: test/planParser.test.js parses every plan in the database snapshot.
 */

/**
 * Returns the number of separate weight input slots an exercise needs,
 * based on the "Peso consigliato: …" notes string.
 *   "20 kg + 30 kg"  → 2  (superset, different machines)
 *   "8 - 6 - 4 kg"   → 3  (dropset)
 *   "10 kg x braccio" → 1  (same weight both sides)
 *   "40 kg"           → 1
 */
function parseWeightSlots(notes) {
  if (!notes) return 1;
  const match = notes.match(/Peso consigliato:\s*(.+)/i);
  if (!match) return 1;
  const w = match[1].trim();
  const kgCount = (w.match(/\bkg\b/gi) || []).length;
  // Several weights ("50 kg / 10 kg x lato", superset) win over "x lato"
  if (kgCount > 1) return kgCount;
  if (/\bx\s+(braccio|lato|gamba|mano)\b/i.test(w)) return 1;
  if (kgCount === 1) return Math.max(1, (w.match(/\d+(?:\.\d+)?/g) || []).length);
  return 1;
}

/**
 * Parse raw PDF text into days + exercises.
 *
 * Handles the real-world format produced by pdf-parse from Italian workout PDFs:
 *   - Exercise names can span multiple lines (table cell wrapping)
 *   - Stats format: "sets reps rest [weight kg]"
 *       e.g. "4 12 1.30'" / "3 30" 1.30'" / "4 15 2'" / "Low row 4 12 1.30' 20 kg"
 *   - Rest time is the unique identifier of a stats line (ends with ' or " variant)
 *   - Circuit exercises may have leading dash bullet
 *
 * Strategy: accumulate text lines as the exercise name; when a line containing
 * a rest-time token is found, extract stats and flush the pending exercise.
 */
function parsePdfText(text) {
  const days = [];
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  let currentDay = null;
  let inWorkout = false;
  let inTable = false;
  let pendingName = '';
  let pendingTechnique = '';
  let inParenthetical = false;

  const PRIME = "''′‘’ʼʹ";
  const DQUOTE = '"' + '\u201c\u201d\u2033';

  const REST_RE = new RegExp(`\\d+(?:[.,]\\d+)?[${PRIME}]`);

  const STATS_RE = new RegExp(
    `(\\d+)\\s+` +
    // reps: "12", "10 + 12", "12/12" (superset), "10+cedimento", "4-6-8-6-4" (ladder),
    // "15 x lato" / "15 per lato"
    `(\\d+[${DQUOTE}${PRIME}]{0,2}(?:\\s*[+/-]\\s*(?:\\d+[${DQUOTE}${PRIME}]{0,2}|cedimento|max))*(?:\\s+(?:x|per)\\s+\\w+)?)\\s+` +
    `(\\d+(?:[.,]\\d+)?[${PRIME}][${PRIME}\\d]*)`,
    'i'
  );

  // Table format (current PDFs): "Panca piana con bilanciere 4 8 90 sec 70 kg totali"
  // → name, sets, reps, rest, weight. Rest is in sec/min; reps can be "10+12",
  // "15 sec", "1 min", "1.30’", "15 x lato" or "-" (time already in the name,
  // "Plank - Isometria (30")"); the weight column may be "corpo libero".
  // Long names wrap, leaving the numbers alone on their line.
  const NUM = '\\d+(?:[.,]\\d+)?';
  const UNIT = `(?:\\s*(?:sec|min|[${PRIME}${DQUOTE}]{1,2}))`;
  const TABLE_ROW_RE = new RegExp(
    `^(.*?)\\s*\\b(\\d+)\\s+` +
    `((?:${NUM}${UNIT}?(?:\\s*[+/-]\\s*(?:${NUM}${UNIT}?|cedimento|max))*(?:\\s+(?:x|per)\\s+\\w+)?)|ladder|max|[-–])\\s+` +
    // rest: "90 sec", "1 min 30 sec", or seconds written as 45"
    `(${NUM}\\s*(?:sec|min)(?:\\s+${NUM}\\s*sec)?|\\d+[${DQUOTE}])(?=\\s|$)\\s*(.*)$`,
    'i'
  );

  // A weight cell that wrapped onto its own line(s) after the row ("8 kg",
  // "10 kg x" + "braccio", "30 kg / 12,5" + "kg x braccio", "Corpo libero"):
  // it belongs to the previous exercise.
  const WEIGHT_TAIL_RE = /^(?:(?:\d+(?:[.,]\d+)?|kg|x|\/|\+|braccio|lato|gamba|mano|totali|corpo|libero)\s*)*(?:kg|braccio|lato|gamba|mano|corpo|libero)(?:\s*(?:x|\/|\+|\d+(?:[.,]\d+)?|kg|braccio|lato|gamba|mano|corpo|libero))*$/i;

  // Technique notes written on their own line under the exercise name
  // ("TUT 3'' solo negativa", "Rest Pause: 12 rip. + …", "Ladder 1-2-3…").
  // In the table format they're moved to the notes (their "+" would look like
  // a superset to the video matcher). Older PDFs wrap names mid-sentence
  // ("… con" / "isometria 5” al mento"), so there they stay in the name.
  const TECHNIQUE_LINE_RE = /^(?:TUT\b|Isometria\b|Rest\s*Pause\b|Ladder\b|Drop\s*set\b|DS\b|RP\b|Cedimento\b|Lavoro\s+neurale\b)/i;
  let pendingTechniqueLines = [];

  const appendNameLine = (text) => {
    const clean = text.replace(/^[-–•]\s*/, '').trim();
    if (!clean) return;
    if (pendingName && TECHNIQUE_LINE_RE.test(clean)) pendingTechniqueLines.push(clean);
    pendingName = pendingName ? `${pendingName} ${clean}` : clean;
  };

  /** Table format only: moves the technique lines from the pending name to the notes. */
  const takeTechniqueLines = () => {
    for (const t of pendingTechniqueLines) pendingName = pendingName.replace(t, ' ');
    pendingTechnique = pendingTechniqueLines.join(' ');
    pendingTechniqueLines = [];
  };

  const EMOM_STATS_RE = new RegExp(
    `(\\d+[${PRIME}])\\s+(\\d+)\\s+(\\d+(?:[.,]\\d+)?[${PRIME}])`,
    'i'
  );

  const extractNotes = (rawAfterStats) => {
    // Rest like 1'30" leaves its closing quote in front of the weight
    const afterStats = (rawAfterStats || '').replace(/^["“”″]\s*/, '');
    if (!afterStats || !/kg/i.test(afterStats)) return { notes: '', openParen: false };
    const parenIdx = afterStats.indexOf('(');
    if (parenIdx !== -1 && afterStats.indexOf(')', parenIdx) === -1) {
      return { notes: `Peso consigliato: ${afterStats.substring(0, parenIdx).trim()}`, openParen: true };
    }
    return { notes: `Peso consigliato: ${afterStats}`, openParen: false };
  };

  const flushExercise = (sets, reps, rest, notes) => {
    const name = pendingName.replace(/\s+/g, ' ').trim();
    if (name && currentDay) {
      // Technique first: "Peso consigliato: …" must stay last, it's parsed up to the end
      const allNotes = [pendingTechnique, notes].filter(Boolean).join(' · ');
      currentDay.exercises.push({
        name, sets: sets || '', reps: reps || '', rest: rest || '',
        notes: allNotes, weightSlots: parseWeightSlots(notes),
      });
    }
    pendingName = '';
    pendingTechnique = '';
    pendingTechniqueLines = [];
  };

  for (const line of lines) {
    if (/^LEGENDA/i.test(line)) break;

    const dayMatch = line.match(/^GIORNO\s+(\d+)\s*(.*)$/i);
    if (dayMatch) {
      pendingName = '';
      pendingTechnique = ''; pendingTechniqueLines = [];
      inWorkout = false;
      inTable = false;
      inParenthetical = false;
      const num = parseInt(dayMatch[1]);
      const subtitle = dayMatch[2].replace(/[()]/g, '').trim();
      currentDay = {
        dayNumber: num,
        dayName: subtitle ? `Giorno ${num} - ${subtitle}` : `Giorno ${num}`,
        exercises: [],
      };
      days.push(currentDay);
      continue;
    }

    if (!currentDay) continue;

    if (/^WORKOUT:/i.test(line))           { inWorkout = true; inParenthetical = false; continue; }
    if (/^WARM\s*UP/i.test(line))          { pendingName = ''; pendingTechnique = ''; pendingTechniqueLines = []; inWorkout = false; inTable = false; inParenthetical = false; continue; }
    if (/^STRETCHING/i.test(line))         { pendingName = ''; pendingTechnique = ''; pendingTechniqueLines = []; inWorkout = false; inTable = false; inParenthetical = false; continue; }
    if (!inWorkout) continue;

    if (/^CIRCUITO:/i.test(line))          { inTable = false; continue; }
    if (/^ESERCIZIO\s+SERIE/i.test(line))  { inTable = true; continue; }
    if (!inTable) continue;

    if (/^\d+$/.test(line)) continue;

    if (inParenthetical) {
      if (line.includes(')')) inParenthetical = false;
      continue;
    }

    if (!pendingName && WEIGHT_TAIL_RE.test(line)) {
      const last = currentDay.exercises[currentDay.exercises.length - 1];
      if (last) {
        if (/Peso consigliato:/.test(last.notes)) {
          // "10 kg x" + "braccio" continue the same value; "8 kg" is another weight
          // Same value continues ("12,5" + "kg x braccio", "10 kg x" + "braccio") vs another weight ("40 kg" + "8 kg")
          const continues = /^(?:kg|x\b|braccio|lato|gamba|mano|libero)/i.test(line) || /(?:\d|\bx|\/|corpo)$/i.test(last.notes.trim());
          const sep = continues ? ' ' : ' / ';
          last.notes = `${last.notes}${sep}${line}`;
        } else if (/kg/i.test(line)) {
          last.notes = [last.notes, `Peso consigliato: ${line}`].filter(Boolean).join(' · ');
        }
        last.weightSlots = parseWeightSlots(last.notes);
      }
      continue;
    }

    const tableRow = line.match(TABLE_ROW_RE);
    if (tableRow) {
      appendNameLine(tableRow[1]);
      takeTechniqueLines();
      const weight = tableRow[5].trim();
      let reps = tableRow[3].trim();
      if (/^[-–]$/.test(reps)) {
        // "Plank - Isometria (30")" + "3 - 45"": the hold time is in the name
        const hold = pendingName.match(new RegExp(`Isometria\\D{0,3}(\\d+\\s*(?:sec|[${DQUOTE}${PRIME}]{1,2}))`, 'i'));
        reps = hold ? hold[1].replace(/\s+/g, '') : '';
      }
      flushExercise(tableRow[2], reps, tableRow[4].trim(), /kg/i.test(weight) ? `Peso consigliato: ${weight}` : '');
      continue;
    }

    if (!REST_RE.test(line)) {
      appendNameLine(line);
      continue;
    }

    if (/\bEMOM\b/i.test(pendingName)) {
      const emomMatch = line.match(EMOM_STATS_RE);
      if (emomMatch) {
        const afterEmom = line.substring(emomMatch.index + emomMatch[0].length).trim();
        const { notes: emomNotes, openParen } = extractNotes(afterEmom);
        if (openParen) inParenthetical = true;
        flushExercise(`EMOM ${emomMatch[1]}`, emomMatch[2], emomMatch[3], emomNotes);
        continue;
      }
    }

    const soloRest = line.match(new RegExp(`^(\\d+(?:[.,]\\d+)?[${PRIME}])$`));
    if (soloRest) {
      const cleanName = pendingName.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
      const tailMatch = cleanName.match(/^(.*?)\s+(\d+)\s+(\d+)\s*$/);
      if (tailMatch) {
        pendingName = tailMatch[1].trim();
        flushExercise(tailMatch[2], tailMatch[3], soloRest[1], '');
        continue;
      }
    }

    const lineForStats = line.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
    const statsMatch = lineForStats.match(STATS_RE) || line.match(STATS_RE);
    if (!statsMatch) {
      appendNameLine(line);
      continue;
    }

    // Offsets must come from the same string the match ran on ("1 (ladder) 6-8-10 1'30" 10 kg"
    // only matches once the parentheses are stripped)
    const origMatch = line.match(STATS_RE);
    const statsLine = origMatch ? line : lineForStats;
    const match = origMatch || statsMatch;
    const afterStats = statsLine.substring(match.index + match[0].length).trim();
    const { notes, openParen } = extractNotes(afterStats);
    if (openParen) inParenthetical = true;

    const before = statsLine.substring(0, match.index).replace(/^[-\u2013\u2022]\s*/, '').trim();
    if (before) pendingName = pendingName ? `${pendingName} ${before}` : before;

    flushExercise(match[1], match[2], match[3], notes);
  }

  return days.filter((d) => d.exercises.length > 0);
}

module.exports = { parsePdfText, parseWeightSlots };
