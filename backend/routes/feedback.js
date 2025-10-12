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

  // Get the latest PDF change date and latest feedback date
  const query = `
    SELECT
      (SELECT updated_at FROM user_pdf_files WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1) as pdf_updated_at,
      (SELECT created_at FROM user_feedbacks WHERE user_id = ? ORDER BY created_at DESC LIMIT 1) as last_feedback_at
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

    // Check if user has already submitted feedback after this PDF change
    if (row.last_feedback_at) {
      const lastFeedbackAt = new Date(row.last_feedback_at);

      // If feedback was submitted after PDF change, don't show form
      if (lastFeedbackAt > pdfUpdatedAt) {
        return res.json({
          success: true,
          data: {
            shouldShow: false,
            reason: 'already_submitted',
            lastFeedbackAt: lastFeedbackAt.toISOString()
          }
        });
      }
    }

    // Show the feedback form
    res.json({
      success: true,
      data: {
        shouldShow: true,
        pdfUpdatedAt: pdfUpdatedAt.toISOString()
      }
    });
  });
});

// POST /api/feedback - Submit a new feedback
router.post('/', authenticateToken, (req, res) => {
  const db = createDatabase();
  const userId = req.user.userId;
  const {
    firstName,
    lastName,
    email,
    trainingSatisfaction,
    motivationLevel,
    difficulties,
    nutritionQuality,
    sleepHours,
    recoveryImproved,
    feelsSupported,
    supportImprovement
  } = req.body;

  // Validation
  if (!firstName || !lastName || !email) {
    db.close();
    return res.status(400).json({
      success: false,
      message: 'Nome, cognome ed email sono obbligatori'
    });
  }

  if (trainingSatisfaction < 1 || trainingSatisfaction > 10) {
    db.close();
    return res.status(400).json({
      success: false,
      message: 'La soddisfazione deve essere tra 1 e 10'
    });
  }

  if (motivationLevel < 1 || motivationLevel > 10) {
    db.close();
    return res.status(400).json({
      success: false,
      message: 'Il livello di motivazione deve essere tra 1 e 10'
    });
  }

  if (!['ottima', 'buona', 'da_migliorare', 'difficolta'].includes(nutritionQuality)) {
    db.close();
    return res.status(400).json({
      success: false,
      message: 'Valore non valido per la qualità dell\'alimentazione'
    });
  }

  if (typeof recoveryImproved !== 'boolean' || typeof feelsSupported !== 'boolean') {
    db.close();
    return res.status(400).json({
      success: false,
      message: 'I campi di recupero e supporto devono essere booleani'
    });
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
        training_satisfaction, motivation_level, difficulties,
        nutrition_quality, sleep_hours, recovery_improved,
        feels_supported, support_improvement, pdf_change_date
      ) VALUES (?, ?, ?, ?, DATE('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      userId,
      firstName,
      lastName,
      email,
      trainingSatisfaction,
      motivationLevel,
      difficulties || null,
      nutritionQuality,
      sleepHours,
      recoveryImproved ? 1 : 0,
      feelsSupported ? 1 : 0,
      supportImprovement || null,
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
          message: 'Feedback submitted successfully',
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
