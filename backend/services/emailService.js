const { Resend } = require('resend');
require('dotenv').config();

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@esercizifacili.com';

/**
 * Send email notification to admin when a user submits a new feedback
 * @param {Object} feedback - The feedback object
 * @param {string} feedback.first_name - User's first name
 * @param {string} feedback.last_name - User's last name
 * @param {string} feedback.email - User's email
 * @param {string} feedback.energy_level - Energy level rating
 * @param {string} feedback.workouts_completed - Workouts completion status
 * @param {string} feedback.motivation_level - Motivation level
 * @param {string} feedback.weekly_highlights - Optional highlights/notes
 */
async function sendNewFeedbackNotification(feedback) {
  if (!resend) {
    console.log('📧 Email service not configured (RESEND_API_KEY missing)');
    return { success: false, error: 'Email service not configured' };
  }

  if (!ADMIN_EMAIL) {
    console.log('📧 Admin email not configured (ADMIN_EMAIL missing)');
    return { success: false, error: 'Admin email not configured' };
  }

  const energyLabels = {
    high: 'Alto',
    medium: 'Medio',
    low: 'Basso'
  };

  const workoutLabels = {
    all: 'Tutti completati',
    almost_all: 'Quasi tutti',
    few_or_none: 'Pochi o nessuno'
  };

  const motivationLabels = {
    very_high: 'Molto alta',
    good: 'Buona',
    medium: 'Media',
    low: 'Bassa'
  };

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `Nuovo Check da ${feedback.first_name} ${feedback.last_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Nuovo Check Settimanale</h2>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Utente:</strong> ${feedback.first_name} ${feedback.last_name}</p>
            <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${feedback.email}</p>
          </div>

          <h3 style="color: #555;">Riepilogo Check</h3>

          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Energia:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${energyLabels[feedback.energy_level] || feedback.energy_level}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Allenamenti:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${workoutLabels[feedback.workouts_completed] || feedback.workouts_completed}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Motivazione:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${motivationLabels[feedback.motivation_level] || feedback.motivation_level}</td>
            </tr>
            ${feedback.current_weight ? `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Peso attuale:</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${feedback.current_weight} kg</td>
            </tr>
            ` : ''}
          </table>

          ${feedback.weekly_highlights ? `
          <div style="margin-top: 20px;">
            <h3 style="color: #555;">Note aggiuntive</h3>
            <p style="background: #fff; padding: 15px; border-left: 4px solid #007bff; margin: 0;">
              ${feedback.weekly_highlights}
            </p>
          </div>
          ` : ''}

          <p style="margin-top: 30px; color: #888; font-size: 12px;">
            Questo messaggio e stato inviato automaticamente da EserciziFacili.com
          </p>
        </div>
      `
    });

    if (error) {
      console.error('📧 Error sending admin notification:', error);
      return { success: false, error };
    }

    console.log('📧 Admin notification sent successfully:', data?.id);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('📧 Exception sending admin notification:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send check reminder email to a user
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's first name
 */
async function sendCheckInReminder(userEmail, userName) {
  if (!resend) {
    console.log('📧 Email service not configured (RESEND_API_KEY missing)');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: `${userName}, e il momento del tuo check settimanale!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Ciao ${userName}!</h2>

          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            E passata un'altra settimana e vorremmo sapere come sta andando il tuo percorso di allenamento.
          </p>

          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Il check settimanale ci aiuta a:
          </p>

          <ul style="font-size: 16px; line-height: 1.8; color: #555;">
            <li>Monitorare i tuoi progressi</li>
            <li>Adattare il programma alle tue esigenze</li>
            <li>Assicurarci che tu stia ottenendo i risultati desiderati</li>
          </ul>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://app.esercizifacili.com/dashboard"
               style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 16px; display: inline-block;">
              Compila il Check
            </a>
          </div>

          <p style="font-size: 14px; color: #888; margin-top: 30px;">
            Bastano solo 2 minuti per completarlo!
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

          <p style="font-size: 12px; color: #888;">
            Hai ricevuto questa email perche sei iscritto a EserciziFacili.com.<br>
            Se non desideri ricevere questi promemoria, contattaci.
          </p>
        </div>
      `
    });

    if (error) {
      console.error(`📧 Error sending reminder to ${userEmail}:`, error);
      return { success: false, error };
    }

    console.log(`📧 Reminder sent to ${userEmail}:`, data?.id);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error(`📧 Exception sending reminder to ${userEmail}:`, err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendNewFeedbackNotification,
  sendCheckInReminder
};
