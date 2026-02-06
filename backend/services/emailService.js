const { Resend } = require('resend');
require('dotenv').config();

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const FROM_EMAIL = process.env.FROM_EMAIL || 'EserciziFacili <noreply@esercizifacili.com>';

// Label mappings
const labels = {
  energy: { high: 'Alta', medium: 'Media', low: 'Bassa' },
  workouts: { all: 'Tutti completati', almost_all: 'Quasi tutti', few_or_none: 'Pochi o nessuno' },
  mealPlan: { completely: 'Completamente', mostly: 'In gran parte', sometimes: 'Solo a volte', no: 'No' },
  sleep: { excellent: 'Ottima', good: 'Buona', fair: 'Così così', poor: 'Scarsa' },
  discomfort: { none: 'Nessuno', minor: 'Fastidi lievi', significant: 'Dolore significativo' },
  motivation: { very_high: 'Molto alta', good: 'Buona', medium: 'Media', low: 'Bassa' }
};

// Color mappings for status indicators
const getStatusColor = (type, value) => {
  const colors = {
    energy: { high: '#10b981', medium: '#f59e0b', low: '#ef4444' },
    workouts: { all: '#10b981', almost_all: '#f59e0b', few_or_none: '#ef4444' },
    mealPlan: { completely: '#10b981', mostly: '#84cc16', sometimes: '#f59e0b', no: '#ef4444' },
    sleep: { excellent: '#10b981', good: '#84cc16', fair: '#f59e0b', poor: '#ef4444' },
    discomfort: { none: '#10b981', minor: '#f59e0b', significant: '#ef4444' },
    motivation: { very_high: '#10b981', good: '#84cc16', medium: '#f59e0b', low: '#ef4444' }
  };
  return colors[type]?.[value] || '#6b7280';
};

/**
 * Send email notification to admin when a user submits a new feedback
 * @param {Object} feedback - The feedback object
 * @param {string} trainerName - The name of the trainer (Joshua or Denise)
 */
async function sendNewFeedbackNotification(feedback, trainerName = 'Joshua') {
  console.log('📧 sendNewFeedbackNotification called');
  console.log('📧 RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
  console.log('📧 ADMIN_EMAIL:', process.env.ADMIN_EMAIL);
  console.log('📧 Trainer:', trainerName);

  if (!resend) {
    console.log('📧 Email service not configured (RESEND_API_KEY missing)');
    return { success: false, error: 'Email service not configured' };
  }

  if (!ADMIN_EMAIL) {
    console.log('📧 Admin email not configured (ADMIN_EMAIL missing)');
    return { success: false, error: 'Admin email not configured' };
  }

  const statusRow = (icon, label, value, type, valueKey) => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6;">
        <span style="font-size: 18px; margin-right: 8px;">${icon}</span>
        <span style="color: #6b7280; font-size: 14px;">${label}</span>
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; text-align: right;">
        <span style="background: ${getStatusColor(type, valueKey)}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;">
          ${value}
        </span>
      </td>
    </tr>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `📋 [PT ${trainerName}] Nuovo Check da ${feedback.first_name} ${feedback.last_name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1f2937 0%, #374151 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">
                📋 Nuovo Check Settimanale
              </h1>
              <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 14px;">
                ${new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            <!-- User Info Card -->
            <div style="background: white; padding: 24px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <div style="display: flex; align-items: center; background: #f8fafc; border-radius: 12px; padding: 16px;">
                <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 16px;">
                  <span style="color: white; font-size: 20px; font-weight: 600;">${feedback.first_name?.charAt(0) || '?'}${feedback.last_name?.charAt(0) || '?'}</span>
                </div>
                <div>
                  <h2 style="margin: 0; color: #1f2937; font-size: 18px; font-weight: 600;">
                    ${feedback.first_name} ${feedback.last_name}
                  </h2>
                  <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">
                    ${feedback.email}
                  </p>
                </div>
              </div>
            </div>

            <!-- Status Grid -->
            <div style="background: white; padding: 0 24px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <table style="width: 100%; border-collapse: collapse;">
                ${statusRow('⚡', 'Energia', labels.energy[feedback.energy_level] || feedback.energy_level, 'energy', feedback.energy_level)}
                ${statusRow('🏋️', 'Allenamenti', labels.workouts[feedback.workouts_completed] || feedback.workouts_completed, 'workouts', feedback.workouts_completed)}
                ${statusRow('🥗', 'Alimentazione', labels.mealPlan[feedback.meal_plan_followed] || feedback.meal_plan_followed, 'mealPlan', feedback.meal_plan_followed)}
                ${statusRow('😴', 'Sonno', labels.sleep[feedback.sleep_quality] || feedback.sleep_quality, 'sleep', feedback.sleep_quality)}
                ${statusRow('💪', 'Dolori/Fastidi', labels.discomfort[feedback.physical_discomfort] || feedback.physical_discomfort, 'discomfort', feedback.physical_discomfort)}
                ${statusRow('🔥', 'Motivazione', labels.motivation[feedback.motivation_level] || feedback.motivation_level, 'motivation', feedback.motivation_level)}
                ${feedback.current_weight ? `
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6;">
                    <span style="font-size: 18px; margin-right: 8px;">⚖️</span>
                    <span style="color: #6b7280; font-size: 14px;">Peso attuale</span>
                  </td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; text-align: right;">
                    <span style="color: #1f2937; font-size: 16px; font-weight: 600;">${feedback.current_weight} kg</span>
                  </td>
                </tr>
                ` : ''}
              </table>
            </div>

            <!-- Discomfort Details -->
            ${feedback.discomfort_details ? `
            <div style="background: white; padding: 0 24px 24px 24px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 0 8px 8px 0; padding: 16px;">
                <h3 style="margin: 0 0 8px 0; color: #991b1b; font-size: 14px; font-weight: 600;">
                  ⚠️ Dettagli dolori/fastidi
                </h3>
                <p style="margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.5;">
                  ${feedback.discomfort_details}
                </p>
              </div>
            </div>
            ` : ''}

            <!-- Weekly Highlights -->
            ${feedback.weekly_highlights ? `
            <div style="background: white; padding: 0 24px 24px 24px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <div style="background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 0 8px 8px 0; padding: 16px;">
                <h3 style="margin: 0 0 8px 0; color: #065f46; font-size: 14px; font-weight: 600;">
                  ✨ Cosa è andato bene questa settimana
                </h3>
                <p style="margin: 0; color: #064e3b; font-size: 14px; line-height: 1.5;">
                  ${feedback.weekly_highlights}
                </p>
              </div>
            </div>
            ` : ''}

            <!-- CTA Button -->
            <div style="background: white; padding: 24px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; text-align: center;">
              <a href="https://www.esercizifacili.com/admin"
                 style="display: inline-block; background: linear-gradient(135deg, #1f2937 0%, #374151 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                Vai alla Dashboard Admin →
              </a>
            </div>

            <!-- Footer -->
            <div style="background: #f9fafb; border-radius: 0 0 16px 16px; padding: 20px; text-align: center; border: 1px solid #e5e7eb; border-top: none;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Notifica automatica da <strong>EserciziFacili.com</strong>
              </p>
            </div>

          </div>
        </body>
        </html>
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
      subject: `💪 ${userName}, è il momento del tuo check settimanale!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 16px 16px 0 0; padding: 40px 32px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">💪</div>
              <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">
                Ciao ${userName}!
              </h1>
              <p style="color: #bfdbfe; margin: 12px 0 0 0; font-size: 16px;">
                È tempo del tuo check settimanale
              </p>
            </div>

            <!-- Content -->
            <div style="background: white; padding: 32px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <p style="color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">
                È passata un'altra settimana e vorrei sapere come sta andando il tuo percorso di allenamento.
              </p>

              <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">
                  Il check settimanale mi aiuta a:
                </h3>
                <ul style="margin: 0; padding: 0; list-style: none;">
                  <li style="color: #4b5563; font-size: 15px; padding: 8px 0; display: flex; align-items: center;">
                    <span style="color: #10b981; margin-right: 12px; font-size: 18px;">✓</span>
                    Monitorare i tuoi progressi
                  </li>
                  <li style="color: #4b5563; font-size: 15px; padding: 8px 0; display: flex; align-items: center;">
                    <span style="color: #10b981; margin-right: 12px; font-size: 18px;">✓</span>
                    Adattare il programma alle tue esigenze
                  </li>
                  <li style="color: #4b5563; font-size: 15px; padding: 8px 0; display: flex; align-items: center;">
                    <span style="color: #10b981; margin-right: 12px; font-size: 18px;">✓</span>
                    Assicurarmi che tu stia ottenendo risultati
                  </li>
                </ul>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://www.esercizifacili.com/dashboard"
                   style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
                  Compila il Check →
                </a>
              </div>

              <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 0;">
                ⏱️ Bastano solo 2 minuti per completarlo!
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #f9fafb; border-radius: 0 0 16px 16px; padding: 24px; text-align: center; border: 1px solid #e5e7eb; border-top: none;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
                <strong>Joshua Maurizio</strong> - Personal Trainer
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                EserciziFacili.com
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                Hai ricevuto questa email perché sei iscritto a EserciziFacili.com.<br>
                Se non desideri ricevere questi promemoria, contattaci.
              </p>
            </div>

          </div>
        </body>
        </html>
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
