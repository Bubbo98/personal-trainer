const express = require('express');
const router = express.Router();
const { createDatabase } = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// ─── PDF Text Parser ────────────────────────────────────────────────────────

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
    // reps: "12", "10 + 12", "12/12" (superset), "15 x lato" / "15 per lato"
    `(\\d+[${DQUOTE}${PRIME}]{0,2}(?:\\s*[+/]\\s*\\d+[${DQUOTE}${PRIME}]{0,2})*(?:\\s+(?:x|per)\\s+\\w+)?)\\s+` +
    `(\\d+(?:[.,]\\d+)?[${PRIME}][${PRIME}\\d]*)`,
    'i'
  );

  // Table format (current PDFs): "Panca piana con bilanciere 4 8 90 sec 70 kg totali"
  // → name, sets, reps, rest, weight. Rest is in sec/min; reps can be "10+12",
  // "15 sec", "1 min", "1.30’" or "15 x lato"; the weight column may be
  // "corpo libero". Long names wrap, leaving the numbers alone on their line.
  const NUM = '\\d+(?:[.,]\\d+)?';
  const UNIT = `(?:\\s*(?:sec|min|[${PRIME}${DQUOTE}]{1,2}))`;
  const TABLE_ROW_RE = new RegExp(
    `^(.*?)\\s*\\b(\\d+)\\s+` +
    `((?:${NUM}${UNIT}?(?:\\s*[+/]\\s*${NUM}${UNIT}?)*(?:\\s+(?:x|per)\\s+\\w+)?)|ladder|max)\\s+` +
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
      flushExercise(tableRow[2], tableRow[3].trim(), tableRow[4].trim(), /kg/i.test(weight) ? `Peso consigliato: ${weight}` : '');
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

    const origMatch = line.match(STATS_RE) || statsMatch;
    const afterStats = line.substring(origMatch.index + origMatch[0].length).trim();
    const { notes, openParen } = extractNotes(afterStats);
    if (openParen) inParenthetical = true;

    const before = line.substring(0, origMatch.index).replace(/^[-\u2013\u2022]\s*/, '').trim();
    if (before) pendingName = pendingName ? `${pendingName} ${before}` : before;

    flushExercise(origMatch[1], origMatch[2], origMatch[3], notes);
  }

  return days.filter((d) => d.exercises.length > 0);
}

// ─── Admin: Parse PDF ────────────────────────────────────────────────────────

// POST /api/workout/admin/parse-pdf/:userId
router.post('/admin/parse-pdf/:userId', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const db = createDatabase();

  db.getCallback(
    'SELECT file_data FROM user_pdf_files WHERE user_id = ?',
    [userId],
    async (err, row) => {
      db.close();

      if (err) {
        console.error('DB error fetching PDF:', err);
        return res.status(500).json({ success: false, error: 'Database error' });
      }

      if (!row || !row.file_data) {
        return res.status(404).json({ success: false, error: 'No PDF found for this user' });
      }

      try {
        const buffer = Buffer.from(row.file_data, 'base64');
        const pdfParse = require('pdf-parse');
        const parsed = await pdfParse(buffer);
        const days = parsePdfText(parsed.text);

        res.json({ success: true, data: { days } });
      } catch (parseErr) {
        console.error('PDF parse error:', parseErr);
        res.status(500).json({ success: false, error: 'Failed to parse PDF' });
      }
    }
  );
});

// ─── Admin: CRUD Training Plan ────────────────────────────────────────────────

// GET /api/workout/admin/plan/:userId
router.get('/admin/plan/:userId', authenticateToken, requireAdmin, (req, res) => {
  const { userId } = req.params;
  const db = createDatabase();

  db.allCallback(
    'SELECT * FROM training_exercises WHERE user_id = ? ORDER BY day_number, order_index',
    [userId],
    (err, exercises) => {
      db.close();
      if (err) return res.status(500).json({ success: false, error: 'Database error' });
      res.json({ success: true, data: { exercises } });
    }
  );
});

// Promise helpers for sequential multi-step admin operations
const dbRun = (db, sql, params = []) =>
  new Promise((resolve, reject) => db.runCallback(sql, params, function (err) { err ? reject(err) : resolve(this); }));
const dbAll = (db, sql, params = []) =>
  new Promise((resolve, reject) => db.allCallback(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || []))));

/** Unlinks training-day videos from exercises that are being deleted. */
async function unlinkExercises(db, exerciseIds) {
  if (exerciseIds.length === 0) return;
  const placeholders = exerciseIds.map(() => '?').join(',');
  await dbRun(db, `UPDATE training_day_videos SET exercise_id = NULL WHERE exercise_id IN (${placeholders})`, exerciseIds);
}

// POST /api/workout/admin/plan/:userId  — saves the entire plan
// Exercises sent with an existing id are updated in place (so their weight
// logs and video links survive an edit); new ones are inserted; exercises
// missing from the payload are deleted. A freshly parsed PDF has no ids, so
// it still replaces the whole plan as before.
router.post('/admin/plan/:userId', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const { days } = req.body; // [{ dayNumber, dayName, exercises: [{ id?, name, sets, reps, rest, notes }] }]

  if (!Array.isArray(days)) {
    return res.status(400).json({ success: false, error: 'days must be an array' });
  }

  const db = createDatabase();

  try {
    const existing = await dbAll(db, 'SELECT id FROM training_exercises WHERE user_id = ?', [userId]);
    const existingIds = new Set(existing.map((e) => e.id));
    const keptIds = new Set();

    for (const day of days) {
      let orderIndex = 0;
      for (const ex of day.exercises || []) {
        const values = [day.dayNumber, day.dayName || `Giorno ${day.dayNumber}`, orderIndex++,
          ex.name, ex.sets || '', ex.reps || '', ex.rest || '', ex.notes || '',
          ex.weightSlots || ex.weight_slots || 1];

        if (ex.id && existingIds.has(ex.id)) {
          await dbRun(db,
            `UPDATE training_exercises SET day_number = ?, day_name = ?, order_index = ?, name = ?, sets = ?, reps = ?,
               rest = ?, notes = ?, weight_slots = ? WHERE id = ? AND user_id = ?`,
            [...values, ex.id, userId]);
          keptIds.add(ex.id);
        } else {
          await dbRun(db,
            `INSERT INTO training_exercises (user_id, day_number, day_name, order_index, name, sets, reps, rest, notes, weight_slots)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, ...values]);
        }
      }
    }

    // Exercises removed from the plan: unlink their videos, then delete them.
    // Their weight logs keep the name/day snapshots for the history.
    const removedIds = [...existingIds].filter((id) => !keptIds.has(id));
    await unlinkExercises(db, removedIds);
    for (const id of removedIds) {
      await dbRun(db, 'DELETE FROM training_exercises WHERE id = ? AND user_id = ?', [id, userId]);
    }

    db.close();
    res.json({ success: true, message: 'Training plan saved' });
  } catch (err) {
    db.close();
    console.error('Error saving training plan:', err);
    res.status(500).json({ success: false, error: 'Failed to save training plan' });
  }
});

// DELETE /api/workout/admin/plan/:userId
router.delete('/admin/plan/:userId', authenticateToken, requireAdmin, (req, res) => {
  const { userId } = req.params;
  const db = createDatabase();

  db.runCallback(
    'UPDATE training_day_videos SET exercise_id = NULL WHERE exercise_id IN (SELECT id FROM training_exercises WHERE user_id = ?)',
    [userId],
    (unlinkErr) => {
      if (unlinkErr) {
        db.close();
        return res.status(500).json({ success: false, error: 'Database error' });
      }
      db.runCallback(
        'DELETE FROM training_exercises WHERE user_id = ?',
        [userId],
        function (err) {
          db.close();
          if (err) return res.status(500).json({ success: false, error: 'Database error' });
          res.json({ success: true, message: 'Training plan deleted' });
        }
      );
    }
  );
});

// GET /api/workout/admin/logs/:userId  — exercise log history for admin
router.get('/admin/logs/:userId', authenticateToken, requireAdmin, (req, res) => {
  const { userId } = req.params;
  const db = createDatabase();

  // LEFT JOIN so logs survive even if the exercise was deleted from the plan.
  // Falls back to snapshot columns when the exercise no longer exists.
  const query = `
    SELECT
      el.*,
      COALESCE(te.name, el.exercise_name)           AS exercise_name,
      COALESCE(te.day_number, el.day_number_snapshot) AS day_number,
      COALESCE(te.day_name,   el.day_name_snapshot)   AS day_name,
      te.sets AS planned_sets,
      te.reps AS planned_reps
    FROM exercise_logs el
    LEFT JOIN training_exercises te ON el.exercise_id = te.id
    WHERE el.user_id = ?
    ORDER BY el.week_start DESC, COALESCE(te.day_number, el.day_number_snapshot), COALESCE(te.order_index, 0)
  `;

  db.allCallback(query, [userId], (err, logs) => {
    db.close();
    if (err) return res.status(500).json({ success: false, error: 'Database error' });
    res.json({ success: true, data: { logs } });
  });
});

// ─── Client: Get Training Plan ────────────────────────────────────────────────

// GET /api/workout/plan
router.get('/plan', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const db = createDatabase();

  db.allCallback(
    'SELECT * FROM training_exercises WHERE user_id = ? ORDER BY day_number, order_index',
    [userId],
    (err, exercises) => {
      db.close();
      if (err) return res.status(500).json({ success: false, error: 'Database error' });
      res.json({ success: true, data: { exercises } });
    }
  );
});

// ─── Client: Exercise Logs ────────────────────────────────────────────────────

// GET /api/workout/logs?weekStart=YYYY-MM-DD
router.get('/logs', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { weekStart } = req.query;
  const db = createDatabase();

  const query = weekStart
    ? 'SELECT * FROM exercise_logs WHERE user_id = ? AND week_start = ?'
    : 'SELECT * FROM exercise_logs WHERE user_id = ? ORDER BY week_start DESC';
  const params = weekStart ? [userId, weekStart] : [userId];

  db.allCallback(query, params, (err, logs) => {
    db.close();
    if (err) return res.status(500).json({ success: false, error: 'Database error' });
    res.json({ success: true, data: { logs } });
  });
});

// POST /api/workout/logs  — upsert a single exercise log entry
router.post('/logs', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { exerciseId, weekStart, weight, setsDone, repsDone, notes } = req.body;

  if (!exerciseId || !weekStart) {
    return res.status(400).json({ success: false, error: 'exerciseId and weekStart are required' });
  }

  const db = createDatabase();

  // Fetch exercise info (verify ownership + grab snapshot data)
  db.getCallback(
    'SELECT id, name, day_number, day_name FROM training_exercises WHERE id = ? AND user_id = ?',
    [exerciseId, userId],
    (err, ex) => {
      if (err || !ex) {
        db.close();
        return res.status(403).json({ success: false, error: 'Exercise not found' });
      }

      db.runCallback(
        `INSERT INTO exercise_logs (user_id, exercise_id, week_start, weight, sets_done, reps_done, notes,
           exercise_name, day_number_snapshot, day_name_snapshot, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id, exercise_id, week_start) DO UPDATE SET
           weight = excluded.weight,
           sets_done = excluded.sets_done,
           reps_done = excluded.reps_done,
           notes = excluded.notes,
           exercise_name = excluded.exercise_name,
           day_number_snapshot = excluded.day_number_snapshot,
           day_name_snapshot = excluded.day_name_snapshot,
           updated_at = CURRENT_TIMESTAMP`,
        [userId, exerciseId, weekStart,
         weight || null, setsDone || null, repsDone || null, notes || null,
         ex.name, ex.day_number, ex.day_name || `Giorno ${ex.day_number}`],
        function (err) {
          db.close();
          if (err) {
            console.error('Error saving log:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
          }
          res.json({ success: true, message: 'Log saved' });
        }
      );
    }
  );
});

// ─── Admin: Exercise ↔ Video links ───────────────────────────────────────────

const { prepareVideo, suggestLinks } = require('../utils/exerciseMatcher');

// GET /api/workout/admin/links/:userId
// Per day: each exercise with its linked videos, plus suggestions for
// exercises that have none yet (see suggestLinks: same day, other days, then
// the library), and the day's videos not linked to any exercise ("extras").
router.get('/admin/links/:userId', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const db = createDatabase();

  try {
    const exercises = await dbAll(db,
      'SELECT id, day_number, day_name, order_index, name, sets, reps FROM training_exercises WHERE user_id = ? ORDER BY day_number, order_index',
      [userId]);
    const dayVideos = await dbAll(db,
      `SELECT td.id AS dayId, td.day_number, tdv.id AS assignmentId, tdv.exercise_id, v.id AS videoId, v.title
       FROM user_training_days td
       JOIN training_day_videos tdv ON tdv.training_day_id = td.id AND tdv.is_active = 1
       JOIN videos v ON v.id = tdv.video_id AND v.is_active = 1
       WHERE td.user_id = ? AND td.is_active = 1
       ORDER BY td.day_number, tdv.order_index`,
      [userId]);
    const library = exercises.length > 0
      ? (await dbAll(db, 'SELECT id AS videoId, title FROM videos WHERE is_active = 1')).map(prepareVideo)
      : [];
    db.close();

    const exerciseIds = new Set(exercises.map((e) => e.id));
    const toVideo = (v) => ({ assignmentId: v.assignmentId, videoId: v.videoId, title: v.title });
    const { suggestions, usedAssignments } = suggestLinks(exercises, dayVideos, library);

    // Plan days plus days that only have videos (e.g. all videos put in "Giorno 5")
    const dayNumbers = [...new Set([...exercises.map((e) => e.day_number), ...dayVideos.map((v) => v.day_number)])]
      .sort((a, b) => a - b);

    const days = dayNumbers.map((dayNumber) => {
      const dayExercises = exercises.filter((e) => e.day_number === dayNumber);
      const linksOf = (exId) => dayVideos.filter((v) => v.exercise_id === exId).map(toVideo);
      // Videos linked to an exercise that no longer exists count as free
      const isFree = (v) => v.exercise_id == null || !exerciseIds.has(v.exercise_id);

      return {
        dayNumber,
        dayName: (dayExercises[0] && dayExercises[0].day_name) || `Giorno ${dayNumber}`,
        exercises: dayExercises.map((e) => ({
          id: e.id,
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          links: linksOf(e.id),
          suggestions: linksOf(e.id).length > 0 ? [] : (suggestions.get(e.id) || []).map((s) => ({
            assignmentId: s.assignmentId,
            videoId: s.videoId,
            title: s.title,
            confidence: s.confidence,
            fromLibrary: s.source === 'library',
          })),
        })),
        extras: dayVideos
          .filter((v) => v.day_number === dayNumber && isFree(v) && !usedAssignments.has(v.assignmentId))
          .map(toVideo),
      };
    });

    res.json({ success: true, data: { days } });
  } catch (err) {
    db.close();
    console.error('Error loading exercise links:', err);
    res.status(500).json({ success: false, error: 'Failed to load exercise links' });
  }
});

/**
 * Makes sure a library video is assigned to the training day of an exercise:
 * creates the day if missing, reuses an existing assignment of the same video,
 * and grants the user permission to watch it. Returns the assignment id.
 *
 * `cache` holds the user's days, assignments and permissions preloaded by the
 * caller, so each video only costs the writes it actually needs (the DB is
 * remote, so per-video lookups made saving a whole plan slow).
 */
async function ensureDayAssignment(db, userId, exercise, videoId, adminName, cache) {
  let dayId = cache.dayIdByNumber.get(exercise.day_number);
  if (!dayId) {
    const result = await dbRun(db,
      'INSERT INTO user_training_days (user_id, day_number, day_name) VALUES (?, ?, ?)',
      [userId, exercise.day_number, exercise.day_name || null]);
    dayId = result.lastID;
    cache.dayIdByNumber.set(exercise.day_number, dayId);
    cache.nextOrderByDay.set(dayId, 0);
  }

  const key = `${dayId}:${videoId}`;
  let assignmentId = cache.assignmentByDayVideo.get(key);
  if (!assignmentId) {
    const nextOrder = cache.nextOrderByDay.get(dayId) || 0;
    const result = await dbRun(db,
      'INSERT INTO training_day_videos (training_day_id, video_id, order_index, added_by) VALUES (?, ?, ?, ?)',
      [dayId, videoId, nextOrder, adminName]);
    assignmentId = result.lastID;
    cache.assignmentByDayVideo.set(key, assignmentId);
    cache.nextOrderByDay.set(dayId, nextOrder + 1);
  }

  const permission = cache.permissionByVideo.get(videoId);
  if (!permission) {
    await dbRun(db,
      'INSERT INTO user_video_permissions (user_id, video_id, granted_by, is_active) VALUES (?, ?, ?, 1)',
      [userId, videoId, adminName]);
    cache.permissionByVideo.set(videoId, { is_active: 1 });
  } else if (!permission.is_active) {
    await dbRun(db, 'UPDATE user_video_permissions SET is_active = 1 WHERE id = ?', [permission.id]);
    permission.is_active = 1;
  }

  return assignmentId;
}

// PUT /api/workout/admin/links/:userId — replaces all exercise ↔ video links
// Body: { links: [{ exerciseId, videos: [{ assignmentId?, videoId }] }] }
// A video without assignmentId comes from the library: it's added to the
// exercise's training day (created if missing) and granted to the user.
router.put('/admin/links/:userId', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const { links } = req.body;

  if (!Array.isArray(links)) {
    return res.status(400).json({ success: false, error: 'links must be an array' });
  }

  const db = createDatabase();
  const adminName = req.user.username || 'admin';

  try {
    const [exercises, days, assignments, permissions] = await Promise.all([
      dbAll(db, 'SELECT id, day_number, day_name FROM training_exercises WHERE user_id = ?', [userId]),
      dbAll(db, 'SELECT id, day_number FROM user_training_days WHERE user_id = ? AND is_active = 1', [userId]),
      dbAll(db,
        `SELECT tdv.id, tdv.training_day_id, tdv.video_id, tdv.order_index FROM training_day_videos tdv
         JOIN user_training_days td ON td.id = tdv.training_day_id
         WHERE td.user_id = ? AND td.is_active = 1 AND tdv.is_active = 1`,
        [userId]),
      dbAll(db, 'SELECT id, video_id, is_active FROM user_video_permissions WHERE user_id = ?', [userId]),
    ]);

    const exerciseById = new Map(exercises.map((e) => [e.id, e]));
    const assignmentIds = new Set(assignments.map((a) => a.id));
    const cache = {
      dayIdByNumber: new Map(days.map((d) => [d.day_number, d.id])),
      assignmentByDayVideo: new Map(assignments.map((a) => [`${a.training_day_id}:${a.video_id}`, a.id])),
      nextOrderByDay: new Map(),
      permissionByVideo: new Map(permissions.map((p) => [p.video_id, p])),
    };
    for (const a of assignments) {
      cache.nextOrderByDay.set(a.training_day_id, Math.max(cache.nextOrderByDay.get(a.training_day_id) || 0, a.order_index + 1));
    }

    // Resolve every link to an assignment id, adding library videos to the days
    const assignmentsByExercise = new Map();
    let addedVideos = 0;
    for (const link of links) {
      const exercise = exerciseById.get(link.exerciseId);
      if (!exercise || !Array.isArray(link.videos)) continue;

      const ids = [];
      for (const video of link.videos) {
        let assignmentId = video.assignmentId && assignmentIds.has(video.assignmentId) ? video.assignmentId : null;
        if (!assignmentId && video.videoId) {
          assignmentId = await ensureDayAssignment(db, userId, exercise, video.videoId, adminName, cache);
          assignmentIds.add(assignmentId);
          addedVideos++;
        }
        if (assignmentId) ids.push(assignmentId);
      }
      if (ids.length > 0) assignmentsByExercise.set(exercise.id, ids);
    }

    // Start from a clean slate for this user's days, then one update per exercise
    await dbRun(db,
      `UPDATE training_day_videos SET exercise_id = NULL
       WHERE training_day_id IN (SELECT id FROM user_training_days WHERE user_id = ?)`,
      [userId]);
    for (const [exerciseId, ids] of assignmentsByExercise) {
      await dbRun(db,
        `UPDATE training_day_videos SET exercise_id = ? WHERE id IN (${ids.map(() => '?').join(',')})`,
        [exerciseId, ...ids]);
    }

    db.close();
    res.json({ success: true, message: 'Links saved', data: { addedVideos } });
  } catch (err) {
    db.close();
    console.error('Error saving exercise links:', err);
    res.status(500).json({ success: false, error: 'Failed to save exercise links' });
  }
});

module.exports = router;
