const express = require('express');
const router = express.Router();
const { createDatabase } = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/feedback/my-feedbacks - Get all feedbacks for the authenticated user
router.get('/my-feedbacks', authenticateToken, (req, res) => {
  const db = createDatabase();
  const userId = req.user.userId;

  const query = `
    SELECT * FROM user_feedbacks
    WHERE user_id = ?
    ORDER BY feedback_date DESC
  `;

  db.allCallback(query, [userId], (err, feedbacks) => {
    db.close();

    if (err) {
      console.error('Error fetching user feedbacks:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch feedbacks'
      });
    }

    res.json({
      success: true,
      data: { feedbacks }
    });
  });
});

// GET /api/feedback/should-show - Check if user should see feedback form
router.get('/should-show', authenticateToken, (req, res) => {
  const db = createDatabase();
  const userId = req.user.userId;

  // Get the latest PDF change date and latest feedback date for this PDF
  const query = `
    SELECT
      upf.updated_at as pdf_updated_at,
      (SELECT MAX(created_at) FROM user_feedbacks WHERE user_id = ? AND pdf_change_date = upf.updated_at) as last_feedback_at
    FROM user_pdf_files upf
    WHERE upf.user_id = ?
    ORDER BY upf.updated_at DESC
    LIMIT 1
  `;

  db.getCallback(query, [userId, userId], (err, row) => {
    db.close();

    if (err) {
      console.error('Error checking feedback status:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to check feedback status'
      });
    }

    // If no PDF has been uploaded, don't show feedback form
    if (!row || !row.pdf_updated_at) {
      return res.json({
        success: true,
        data: {
          shouldShow: false,
          reason: 'no_pdf'
        }
      });
    }

    const pdfUpdatedAt = new Date(row.pdf_updated_at);
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));

    // Check if PDF was changed less than 1 week ago
    if (pdfUpdatedAt > oneWeekAgo) {
      return res.json({
        success: true,
        data: {
          shouldShow: false,
          reason: 'too_soon',
          pdfUpdatedAt: pdfUpdatedAt.toISOString()
        }
      });
    }

    // Check if user has submitted feedback for this PDF version
    if (row.last_feedback_at) {
      const lastFeedbackAt = new Date(row.last_feedback_at);

      // Check if less than 2 weeks have passed since last feedback
      if (lastFeedbackAt > twoWeeksAgo) {
        return res.json({
          success: true,
          data: {
            shouldShow: false,
            reason: 'too_soon_since_last',
            lastFeedbackAt: lastFeedbackAt.toISOString(),
            pdfUpdatedAt: pdfUpdatedAt.toISOString()
          }
        });
      }
    }

    // Show the feedback form
    // Either: first feedback after 1 week from PDF, or 2+ weeks since last feedback
    res.json({
      success: true,
      data: {
        shouldShow: true,
        pdfUpdatedAt: pdfUpdatedAt.toISOString(),
        lastFeedbackAt: row.last_feedback_at
      }
    });
  });
});

// POST /api/feedback - Submit a new weekly check-in
router.post('/', authenticateToken, (req, res) => {
  const db = createDatabase();
  const userId = req.user.userId;
  const {
    firstName,
    lastName,
    email,
    energyLevel,
    workoutsCompleted,
    mealPlanFollowed,
    sleepQuality,
    physicalDiscomfort,
    motivationLevel,
    weeklyHighlights,
    currentWeight
  } = req.body;

  // Validation
  if (!firstName || !lastName || !email) {
    db.close();
    return res.status(400).json({
      success: false,
      message: 'Nome, cognome ed email sono obbligatori'
    });
  }

  // Validate energy level
  if (!['high', 'medium', 'low'].includes(energyLevel)) {
    db.close();
    return res.status(400).json({
      success: false,
      message: 'Valore non valido per il livello di energia'
    });
  }

  // Validate workouts completed
  if (!['all', 'almost_all', 'few_or_none'].includes(workoutsCompleted)) {
    db.close();
    return res.status(400).json({
      success: false,
      message: 'Valore non valido per gli allenamenti completati'
    });
  }

  // Validate meal plan followed
  if (!['completely', 'mostly', 'sometimes', 'no'].includes(mealPlanFollowed)) {
    db.close();
    return res.status(400).json({
      success: false,
      message: 'Valore non valido per il piano alimentare'
    });
  }

  // Validate sleep quality
  if (!['excellent', 'good', 'fair', 'poor'].includes(sleepQuality)) {
    db.close();
    return res.status(400).json({
      success: false,
      message: 'Valore non valido per la qualita del sonno'
    });
  }

  // Validate physical discomfort
  if (!['none', 'minor', 'significant'].includes(physicalDiscomfort)) {
    db.close();
    return res.status(400).json({
      success: false,
      message: 'Valore non valido per i fastidi fisici'
    });
  }

  // Validate motivation level
  if (!['very_high', 'good', 'medium', 'low'].includes(motivationLevel)) {
    db.close();
    return res.status(400).json({
      success: false,
      message: 'Valore non valido per il livello di motivazione'
    });
  }

  // Validate weight (optional, but if provided must be valid)
  if (currentWeight !== undefined && currentWeight !== null && currentWeight !== '') {
    const weight = parseFloat(currentWeight);
    if (isNaN(weight) || weight < 20 || weight > 300) {
      db.close();
      return res.status(400).json({
        success: false,
        message: 'Peso non valido (deve essere tra 20 e 300 kg)'
      });
    }
  }

  // Get the current PDF updated date
  const getPdfQuery = `SELECT updated_at FROM user_pdf_files WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1`;

  db.getCallback(getPdfQuery, [userId], (err, pdfRow) => {
    if (err) {
      db.close();
      console.error('Error fetching PDF info:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch PDF information'
      });
    }

    const pdfChangeDate = pdfRow ? pdfRow.updated_at : null;

    const insertQuery = `
      INSERT INTO user_feedbacks (
        user_id, first_name, last_name, email, feedback_date,
        energy_level, workouts_completed, meal_plan_followed,
        sleep_quality, physical_discomfort, motivation_level,
        weekly_highlights, current_weight, pdf_change_date
      ) VALUES (?, ?, ?, ?, DATE('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const weightValue = currentWeight !== undefined && currentWeight !== null && currentWeight !== ''
      ? parseFloat(currentWeight)
      : null;

    const params = [
      userId,
      firstName,
      lastName,
      email,
      energyLevel,
      workoutsCompleted,
      mealPlanFollowed,
      sleepQuality,
      physicalDiscomfort,
      motivationLevel,
      weeklyHighlights || null,
      weightValue,
      pdfChangeDate
    ];

    db.runCallback(insertQuery, params, function(err) {
      if (err) {
        db.close();
        console.error('Error inserting feedback:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to submit feedback'
        });
      }

      const feedbackId = this.lastID;

      // Fetch the created feedback
      const selectQuery = `SELECT * FROM user_feedbacks WHERE id = ?`;

      db.getCallback(selectQuery, [feedbackId], (err, feedback) => {
        db.close();

        if (err) {
          console.error('Error fetching created feedback:', err);
          return res.status(500).json({
            success: false,
            message: 'Feedback submitted but failed to retrieve details'
          });
        }

        res.status(201).json({
          success: true,
          message: 'Check-in submitted successfully',
          data: { feedback }
        });
      });
    });
  });
});

// GET /api/feedback/admin/all - Get all feedbacks (admin only)
router.get('/admin/all', authenticateToken, (req, res) => {
  const db = createDatabase();

  // Check if user is admin
  const checkAdminQuery = `SELECT username FROM users WHERE id = ?`;

  db.getCallback(checkAdminQuery, [req.user.userId], (err, user) => {
    if (err || !user || !user.username.includes('admin')) {
      db.close();
      return res.status(403).json({
        success: false,
        message: 'Unauthorized - Admin access required'
      });
    }

    const query = `
      SELECT
        f.*,
        u.username,
        u.first_name as user_first_name,
        u.last_name as user_last_name
      FROM user_feedbacks f
      JOIN users u ON f.user_id = u.id
      ORDER BY f.feedback_date DESC, f.created_at DESC
    `;

    db.allCallback(query, [], (err, feedbacks) => {
      db.close();

      if (err) {
        console.error('Error fetching all feedbacks:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch feedbacks'
        });
      }

      res.json({
        success: true,
        data: { feedbacks }
      });
    });
  });
});

// GET /api/feedback/admin/user/:userId - Get feedbacks for specific user (admin only)
router.get('/admin/user/:userId', authenticateToken, (req, res) => {
  const db = createDatabase();
  const { userId } = req.params;

  // Check if user is admin
  const checkAdminQuery = `SELECT username FROM users WHERE id = ?`;

  db.getCallback(checkAdminQuery, [req.user.userId], (err, user) => {
    if (err || !user || !user.username.includes('admin')) {
      db.close();
      return res.status(403).json({
        success: false,
        message: 'Unauthorized - Admin access required'
      });
    }

    const query = `
      SELECT * FROM user_feedbacks
      WHERE user_id = ?
      ORDER BY feedback_date DESC, created_at DESC
    `;

    db.allCallback(query, [userId], (err, feedbacks) => {
      db.close();

      if (err) {
        console.error('Error fetching user feedbacks:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch feedbacks'
        });
      }

      res.json({
        success: true,
        data: { feedbacks }
      });
    });
  });
});

// DELETE /api/feedback/:feedbackId - Delete a feedback (admin only)
router.delete('/:feedbackId', authenticateToken, (req, res) => {
  const db = createDatabase();
  const { feedbackId } = req.params;

  // Check if user is admin
  const checkAdminQuery = `SELECT username FROM users WHERE id = ?`;

  db.getCallback(checkAdminQuery, [req.user.userId], (err, user) => {
    if (err || !user || !user.username.includes('admin')) {
      db.close();
      return res.status(403).json({
        success: false,
        message: 'Unauthorized - Admin access required'
      });
    }

    const deleteQuery = `DELETE FROM user_feedbacks WHERE id = ?`;

    db.runCallback(deleteQuery, [feedbackId], function(err) {
      db.close();

      if (err) {
        console.error('Error deleting feedback:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to delete feedback'
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'Feedback not found'
        });
      }

      res.json({
        success: true,
        message: 'Feedback deleted successfully'
      });
    });
  });
});

module.exports = router;
