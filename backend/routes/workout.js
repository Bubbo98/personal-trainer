const express = require('express');
const router = express.Router();
const { createDatabase } = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// ─── PDF Text Parser ────────────────────────────────────────────────────────

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

  // All apostrophe/prime/quote variants found in Italian PDFs
  const PRIME = "''′\u2018\u2019\u2032\u02bc\u02b9";
  const DQUOTE = '""″\u201c\u201d\u2033';

  // Detects a rest-time token anywhere in the line: digits[.,digits] + prime char
  const REST_RE = new RegExp(`\\d+(?:[.,]\\d+)?[${PRIME}]`);

  // Full stats pattern: sets  reps[optional-dquote]  rest  [weight kg]
  const STATS_RE = new RegExp(
    `(\\d+)\\s+` +                              // sets
    `(\\d+[${DQUOTE}]?)\\s+` +                  // reps (optionally "30"")
    `(\\d+(?:[.,]\\d+)?[${PRIME}][${PRIME}\\d]*)` + // rest  e.g. 1.30' or 2' or 1'30"
    `(?:\\s+(\\d+)\\s*kg)?`,                    // optional weight
    'i'
  );

  const flushExercise = (sets, reps, rest, notes) => {
    const name = pendingName.replace(/\s+/g, ' ').trim();
    if (name && currentDay) {
      currentDay.exercises.push({ name, sets: sets || '', reps: reps || '', rest: rest || '', notes: notes || '' });
    }
    pendingName = '';
  };

  for (const line of lines) {
    // Stop at legend / glossary
    if (/^LEGENDA/i.test(line)) break;

    // New day — capture optional subtitle e.g. "GIORNO 1 (TOTAL BODY)"
    const dayMatch = line.match(/^GIORNO\s+(\d+)\s*(.*)$/i);
    if (dayMatch) {
      pendingName = '';
      inWorkout = false;
      inTable = false;
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

    if (/^WORKOUT:/i.test(line))           { inWorkout = true; continue; }
    if (/^WARM\s*UP/i.test(line))          { pendingName = ''; inWorkout = false; inTable = false; continue; }
    if (/^STRETCHING/i.test(line))         { pendingName = ''; inWorkout = false; inTable = false; continue; }
    if (!inWorkout) continue;

    if (/^CIRCUITO:/i.test(line))          { inTable = false; continue; }
    if (/^ESERCIZIO\s+SERIE/i.test(line))  { inTable = true; continue; }
    if (!inTable) continue;

    // Skip standalone integers (page numbers, stray digits)
    if (/^\d+$/.test(line)) continue;

    // Does this line contain a rest-time token?
    if (!REST_RE.test(line)) {
      // Pure text — strip leading dash/bullet (circuit format) and accumulate as name
      const clean = line.replace(/^[-\u2013\u2022]\s*/, '').trim();
      if (clean) pendingName = pendingName ? `${pendingName} ${clean}` : clean;
      continue;
    }

    // Stats line — try to extract sets/reps/rest/weight
    const statsMatch = line.match(STATS_RE);
    if (!statsMatch) {
      // Has a prime char but didn't match full stats — treat as name continuation
      const clean = line.replace(/^[-\u2013\u2022]\s*/, '').trim();
      if (clean) pendingName = pendingName ? `${pendingName} ${clean}` : clean;
      continue;
    }

    const weightRaw = (statsMatch[4] || '').trim();
    const notes = weightRaw ? `Peso consigliato: ${weightRaw} kg` : '';

    // Text before the stats match belongs to the exercise name
    const before = line.substring(0, statsMatch.index).replace(/^[-\u2013\u2022]\s*/, '').trim();
    if (before) {
      pendingName = pendingName ? `${pendingName} ${before}` : before;
    }

    flushExercise(statsMatch[1], statsMatch[2], statsMatch[3], notes);
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
            `INSERT INTO training_exercises (user_id, day_number, day_name, order_index, name, sets, reps, rest, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, day.dayNumber, day.dayName || `Giorno ${day.dayNumber}`, orderIndex++,
             ex.name, ex.sets || '', ex.reps || '', ex.rest || '', ex.notes || ''],
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
