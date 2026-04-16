const express = require('express');
const router = express.Router();
const pdfParse = require('pdf-parse');
const { createDatabase } = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// ─── PDF Text Parser ────────────────────────────────────────────────────────

/**
 * Parse raw PDF text into days + exercises.
 * Best-effort: the admin always reviews the output.
 */
function parsePdfText(text) {
  const days = [];
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  let currentDay = null;
  let inWorkout = false;
  let inTable = false;
  let currentExercise = null;

  const pushExercise = () => {
    if (currentExercise && currentDay) {
      currentExercise.name = currentExercise.name.replace(/\s+/g, ' ').trim();
      if (currentExercise.name) {
        currentDay.exercises.push({ ...currentExercise });
      }
    }
    currentExercise = null;
  };

  for (const line of lines) {
    // Stop parsing at legend / glossary sections (not exercises)
    if (/^LEGENDA:/i.test(line)) break;

    // Detect new day
    const dayMatch = line.match(/^GIORNO\s+(\d+)/i);
    if (dayMatch) {
      pushExercise();
      inWorkout = false;
      inTable = false;
      currentDay = {
        dayNumber: parseInt(dayMatch[1]),
        dayName: `Giorno ${dayMatch[1]}`,
        exercises: [],
      };
      days.push(currentDay);
      continue;
    }

    if (!currentDay) continue;

    // Workout section start
    if (/^WORKOUT:/i.test(line)) { inWorkout = true; continue; }
    if (/^WARM\s+UP/i.test(line)) { inWorkout = false; inTable = false; continue; }
    if (/^STRETCHING/i.test(line)) { pushExercise(); inWorkout = false; inTable = false; continue; }

    if (!inWorkout) continue;

    // Circuit marker — free-form mode
    if (/^CIRCUITO:/i.test(line)) { inTable = false; continue; }

    // Table header
    if (/^ESERCIZIO\s+SERIE/i.test(line)) { inTable = true; continue; }

    if (inTable) {
      // Match: "Exercise Name  sets  reps  rest" where rest ends with ' or "
      // e.g. "Pull up 6 2 2'"  or  "Chin up 3 10 1.30'"
      const rowMatch = line.match(
        /^(.+?)\s{2,}(\d+)\s{2,}([\w"″′'\.+\-]+)\s{2,}([\d.'″′"]+['"″′]?)\s*$/
      ) || line.match(
        /^(.+)\s+(\d+)\s+([\d"″′'\.]+)\s+([\d.'″′"]+['"″′])\s*$/
      );

      if (rowMatch) {
        pushExercise();
        currentExercise = {
          name: rowMatch[1].trim(),
          sets: rowMatch[2],
          reps: rowMatch[3],
          rest: rowMatch[4],
          notes: '',
        };
      } else if (currentExercise) {
        // Multi-line exercise name continuation
        currentExercise.name += ' ' + line;
      }
    } else {
      // Free-form / circuit: look for bullet points
      const bulletMatch = line.match(/^[-•]\s*(.+)/);
      if (bulletMatch) {
        pushExercise();
        currentExercise = {
          name: bulletMatch[1].trim(),
          sets: '',
          reps: '',
          rest: '',
          notes: '',
        };
      } else if (currentExercise && /^\d+$/.test(line)) {
        // Standalone number after a bullet = reps
        currentExercise.reps = (currentExercise.reps ? currentExercise.reps + ' ' : '') + line;
      }
    }
  }

  pushExercise();

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

  // Delete existing plan
  await new Promise((resolve, reject) => {
    db.runCallback(
      'DELETE FROM training_exercises WHERE user_id = ?',
      [userId],
      (err) => (err ? reject(err) : resolve())
    );
  });

  // Insert new exercises
  let orderIndex = 0;
  for (const day of days) {
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
    orderIndex = 0; // reset per day
  }

  db.close();
  res.json({ success: true, message: 'Training plan saved' });
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

  const query = `
    SELECT
      el.*,
      te.name AS exercise_name,
      te.day_number,
      te.day_name,
      te.sets AS planned_sets,
      te.reps AS planned_reps
    FROM exercise_logs el
    JOIN training_exercises te ON el.exercise_id = te.id
    WHERE el.user_id = ?
    ORDER BY el.week_start DESC, te.day_number, te.order_index
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

  // Verify the exercise belongs to this user
  db.getCallback(
    'SELECT id FROM training_exercises WHERE id = ? AND user_id = ?',
    [exerciseId, userId],
    (err, ex) => {
      if (err || !ex) {
        db.close();
        return res.status(403).json({ success: false, error: 'Exercise not found' });
      }

      db.runCallback(
        `INSERT INTO exercise_logs (user_id, exercise_id, week_start, weight, sets_done, reps_done, notes, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id, exercise_id, week_start) DO UPDATE SET
           weight = excluded.weight,
           sets_done = excluded.sets_done,
           reps_done = excluded.reps_done,
           notes = excluded.notes,
           updated_at = CURRENT_TIMESTAMP`,
        [userId, exerciseId, weekStart, weight || null, setsDone || null, repsDone || null, notes || null],
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
