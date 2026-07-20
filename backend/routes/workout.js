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
  if (/\bx\s+(braccio|lato|gamba|mano)\b/i.test(w)) return 1;
  const kgCount = (w.match(/\bkg\b/gi) || []).length;
  if (kgCount > 1) return kgCount;
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
  let inParenthetical = false;

  const PRIME = "''′‘’ʼʹ";
  const DQUOTE = '"' + '\u201c\u201d\u2033';

  const REST_RE = new RegExp(`\\d+(?:[.,]\\d+)?[${PRIME}]`);

  const STATS_RE = new RegExp(
    `(\\d+)\\s+` +
    `(\\d+[${DQUOTE}${PRIME}]{0,2}(?:\\s*\\+\\s*\\d+[${DQUOTE}${PRIME}]{0,2})*(?:\\s+x\\s+\\w+)?)\\s+` +
    `(\\d+(?:[.,]\\d+)?[${PRIME}][${PRIME}\\d]*)`,
    'i'
  );

  const EMOM_STATS_RE = new RegExp(
    `(\\d+[${PRIME}])\\s+(\\d+)\\s+(\\d+(?:[.,]\\d+)?[${PRIME}])`,
    'i'
  );

  const extractNotes = (afterStats) => {
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
      currentDay.exercises.push({
        name, sets: sets || '', reps: reps || '', rest: rest || '',
        notes: notes || '', weightSlots: parseWeightSlots(notes),
      });
    }
    pendingName = '';
  };

  for (const line of lines) {
    if (/^LEGENDA/i.test(line)) break;

    const dayMatch = line.match(/^GIORNO\s+(\d+)\s*(.*)$/i);
    if (dayMatch) {
      pendingName = '';
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
    if (/^WARM\s*UP/i.test(line))          { pendingName = ''; inWorkout = false; inTable = false; inParenthetical = false; continue; }
    if (/^STRETCHING/i.test(line))         { pendingName = ''; inWorkout = false; inTable = false; inParenthetical = false; continue; }
    if (!inWorkout) continue;

    if (/^CIRCUITO:/i.test(line))          { inTable = false; continue; }
    if (/^ESERCIZIO\s+SERIE/i.test(line))  { inTable = true; continue; }
    if (!inTable) continue;

    if (/^\d+$/.test(line)) continue;

    if (inParenthetical) {
      if (line.includes(')')) inParenthetical = false;
      continue;
    }

    if (!REST_RE.test(line)) {
      const clean = line.replace(/^[-\u2013\u2022]\s*/, '').trim();
      if (clean) pendingName = pendingName ? `${pendingName} ${clean}` : clean;
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
      const clean = line.replace(/^[-\u2013\u2022]\s*/, '').trim();
      if (clean) pendingName = pendingName ? `${pendingName} ${clean}` : clean;
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

// POST /api/workout/admin/plan/:userId  — replaces the entire plan
router.post('/admin/plan/:userId', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const { days } = req.body; // [{ dayNumber, dayName, exercises: [{ name, sets, reps, rest, notes }] }]

  if (!Array.isArray(days)) {
    return res.status(400).json({ success: false, error: 'days must be an array' });
  }

  const db = createDatabase();

  try {
    // Delete existing plan (FK cascade is OFF in SQLite/Turso by default — logs are preserved)
    await new Promise((resolve, reject) => {
      db.runCallback(
        'DELETE FROM training_exercises WHERE user_id = ?',
        [userId],
        (err) => (err ? reject(err) : resolve())
      );
    });

    // Insert new exercises
    for (const day of days) {
      let orderIndex = 0;
      for (const ex of day.exercises || []) {
        await new Promise((resolve, reject) => {
          db.runCallback(
            `INSERT INTO training_exercises (user_id, day_number, day_name, order_index, name, sets, reps, rest, notes, weight_slots)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, day.dayNumber, day.dayName || `Giorno ${day.dayNumber}`, orderIndex++,
             ex.name, ex.sets || '', ex.reps || '', ex.rest || '', ex.notes || '',
             ex.weightSlots || ex.weight_slots || 1],
            (err) => (err ? reject(err) : resolve())
          );
        });
      }
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
    'DELETE FROM training_exercises WHERE user_id = ?',
    [userId],
    function (err) {
      db.close();
      if (err) return res.status(500).json({ success: false, error: 'Database error' });
      res.json({ success: true, message: 'Training plan deleted' });
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

module.exports = router;
