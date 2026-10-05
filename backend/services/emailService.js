const { Resend } = require('resend');
const config = require('../config');

/**
 * Transactional emails (Resend):
 *   - to the admin, when a client submits a weekly check;
 *   - to a client, as check-in reminder or when their trainer read the check.
 * render* build { to, subject, html }; send* deliver them. Without RESEND_API_KEY
 * nothing is sent. send* resolve to { success, id } or { success: false, error } and never throw.
 */

const resend = config.email.resendApiKey ? new Resend(config.email.resendApiKey) : null;

/** Text from clients goes into HTML: escape it. */
const escape = (value) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

async function send({ to, subject, html }) {
    if (!resend) return { success: false, error: 'Email service not configured' };
    if (!to) return { success: false, error: 'No recipient' };
    try {
        const { data, error } = await resend.emails.send({ from: config.email.from, to, subject, html });
        if (error) {
            console.error(`Email "${subject}" failed:`, error);
            return { success: false, error };
        }
        return { success: true, id: data && data.id };
    } catch (err) {
        console.error(`Email "${subject}" failed:`, err);
        return { success: false, error: err.message };
    }
}

// ─── Layout ──────────────────────────────────────────────────────────────────

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const SIDES = 'border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;';

const page = (content) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: ${FONT};">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">${content}</div>
</body>
</html>`;

const button = (href, label, gradient, shadow) => `
  <a href="${href}" style="display: inline-block; background: linear-gradient(135deg, ${gradient}); color: white; padding: 16px 40px;
     border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px;${shadow ? ` box-shadow: 0 4px 14px ${shadow};` : ''}">${label}</a>`;

const trainerFooter = (trainerName, extra = '') => `
  <div style="background: #f9fafb; border-radius: 0 0 16px 16px; padding: 24px; text-align: center; border: 1px solid #e5e7eb; border-top: none;">
    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;"><strong>${escape(trainerName)}</strong> - Personal Trainer</p>
    <p style="margin: 0; color: #9ca3af; font-size: 12px;">EserciziFacili.com</p>${extra}
  </div>`;

// ─── New check → admin ───────────────────────────────────────────────────────

const LABELS = {
    energy: { high: 'Alta', medium: 'Media', low: 'Bassa' },
    workouts: { all: 'Tutti completati', almost_all: 'Quasi tutti', few_or_none: 'Pochi o nessuno' },
    mealPlan: { completely: 'Completamente', mostly: 'In gran parte', sometimes: 'Solo a volte', no: 'No' },
    sleep: { excellent: 'Ottima', good: 'Buona', fair: 'Così così', poor: 'Scarsa' },
    discomfort: { none: 'Nessuno', minor: 'Fastidi lievi', significant: 'Dolore significativo' },
    motivation: { very_high: 'Molto alta', good: 'Buona', medium: 'Media', low: 'Bassa' },
};

const COLORS = {
    energy: { high: '#10b981', medium: '#f59e0b', low: '#ef4444' },
    workouts: { all: '#10b981', almost_all: '#f59e0b', few_or_none: '#ef4444' },
    mealPlan: { completely: '#10b981', mostly: '#84cc16', sometimes: '#f59e0b', no: '#ef4444' },
    sleep: { excellent: '#10b981', good: '#84cc16', fair: '#f59e0b', poor: '#ef4444' },
    discomfort: { none: '#10b981', minor: '#f59e0b', significant: '#ef4444' },
    motivation: { very_high: '#10b981', good: '#84cc16', medium: '#f59e0b', low: '#ef4444' },
};

const statusRow = (icon, label, type, value) => `
  <tr>
    <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6;">
      <span style="font-size: 18px; margin-right: 8px;">${icon}</span>
      <span style="color: #6b7280; font-size: 14px;">${label}</span>
    </td>
    <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; text-align: right;">
      <span style="background: ${COLORS[type][value] || '#6b7280'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;">
        ${escape(LABELS[type][value] || value)}
      </span>
    </td>
  </tr>`;

const zones = (json) => {
    try {
        const list = JSON.parse(json || '[]');
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
};

function zonesRow(feedback) {
    const muscular = zones(feedback.muscular_zones);
    const articular = zones(feedback.articular_zones);
    if (muscular.length === 0 && articular.length === 0) return '';
    const block = (icon, title, list, notes) => (list.length === 0 ? '' : `
      <div style="margin-bottom: 8px;">
        <span style="font-size: 13px; font-weight: 600; color: #374151;">${icon} ${title}:</span>
        <span style="font-size: 13px; color: #6b7280; margin-left: 6px;">${list.map(escape).join(', ')}</span>
        ${notes ? `<div style="font-size: 12px; color: #9ca3af; margin-top: 2px; padding-left: 8px;">📝 ${escape(notes)}</div>` : ''}
      </div>`);
    return `
  <tr><td colspan="2" style="padding: 0 16px 12px 16px;">
    ${block('💪', 'Muscolari', muscular, feedback.muscular_notes)}${block('🦴', 'Articolari', articular, feedback.articular_notes)}
  </td></tr>`;
}

const note = (title, text, colors) => (!text ? '' : `
  <div style="background: white; padding: 0 24px 24px 24px; ${SIDES}">
    <div style="background: ${colors.bg}; border-left: 4px solid ${colors.border}; border-radius: 0 8px 8px 0; padding: 16px;">
      <h3 style="margin: 0 0 8px 0; color: ${colors.title}; font-size: 14px; font-weight: 600;">${title}</h3>
      <p style="margin: 0; color: ${colors.text}; font-size: 14px; line-height: 1.5;">${escape(text)}</p>
    </div>
  </div>`);

/** To the admin: a client submitted a weekly check (feedback = user_feedbacks row). */
function renderNewFeedback(feedback, trainerName = 'Joshua') {
    const name = `${feedback.first_name || ''} ${feedback.last_name || ''}`.trim();
    const initials = `${(feedback.first_name || '?').charAt(0)}${(feedback.last_name || '?').charAt(0)}`;
    const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const html = page(`
  <div style="background: linear-gradient(135deg, #1f2937 0%, #374151 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">📋 Nuovo Check Settimanale</h1>
    <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 14px;">${today}</p>
  </div>

  <div style="background: white; padding: 24px; ${SIDES}">
    <div style="display: flex; align-items: center; background: #f8fafc; border-radius: 12px; padding: 16px;">
      <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 16px;">
        <span style="color: white; font-size: 20px; font-weight: 600;">${escape(initials)}</span>
      </div>
      <div>
        <h2 style="margin: 0; color: #1f2937; font-size: 18px; font-weight: 600;">${escape(name)}</h2>
        ${feedback.email ? `<p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">${escape(feedback.email)}</p>` : ''}
      </div>
    </div>
  </div>

  <div style="background: white; padding: 0 24px; ${SIDES}">
    <table style="width: 100%; border-collapse: collapse;">
      ${statusRow('⚡', 'Energia', 'energy', feedback.energy_level)}
      ${statusRow('🏋️', 'Allenamenti', 'workouts', feedback.workouts_completed)}
      ${statusRow('🥗', 'Alimentazione', 'mealPlan', feedback.meal_plan_followed)}
      ${statusRow('😴', 'Sonno', 'sleep', feedback.sleep_quality)}
      ${statusRow('💪', 'Dolori/Fastidi', 'discomfort', feedback.physical_discomfort)}
      ${zonesRow(feedback)}
      ${statusRow('🔥', 'Motivazione', 'motivation', feedback.motivation_level)}
      ${feedback.current_weight ? `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6;">
          <span style="font-size: 18px; margin-right: 8px;">⚖️</span><span style="color: #6b7280; font-size: 14px;">Peso attuale</span>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6; text-align: right;">
          <span style="color: #1f2937; font-size: 16px; font-weight: 600;">${escape(feedback.current_weight)} kg</span>
        </td>
      </tr>` : ''}
    </table>
  </div>

  ${note('⚠️ Dettagli dolori/fastidi', feedback.discomfort_details, { bg: '#fef2f2', border: '#ef4444', title: '#991b1b', text: '#7f1d1d' })}
  ${note('✨ Cosa è andato bene questa settimana', feedback.weekly_highlights, { bg: '#f0fdf4', border: '#10b981', title: '#065f46', text: '#064e3b' })}

  <div style="background: white; padding: 24px; ${SIDES} text-align: center;">
    ${button(`${config.appUrl}/admin`, 'Vai alla Dashboard Admin →', '#1f2937 0%, #374151 100%')}
  </div>

  <div style="background: #f9fafb; border-radius: 0 0 16px 16px; padding: 20px; text-align: center; border: 1px solid #e5e7eb; border-top: none;">
    <p style="margin: 0; color: #9ca3af; font-size: 12px;">Notifica automatica da <strong>EserciziFacili.com</strong></p>
  </div>`);

    return { to: config.email.adminEmail, subject: `📋 [PT ${trainerName}] Nuovo Check da ${name}`, html };
}

// ─── Client emails ───────────────────────────────────────────────────────────

/** To a client who is due a weekly check (see services/checkins); dashboardUrl = their personal link. */
function renderCheckInReminder(userEmail, userName, trainerName = 'Joshua', dashboardUrl = `${config.appUrl}/dashboard`) {
    const benefit = (text) => `
      <li style="color: #4b5563; font-size: 15px; padding: 8px 0; display: flex; align-items: center;">
        <span style="color: #10b981; margin-right: 12px; font-size: 18px;">✓</span>${text}
      </li>`;

    const html = page(`
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 16px 16px 0 0; padding: 40px 32px; text-align: center;">
    <div style="font-size: 48px; margin-bottom: 16px;">💪</div>
    <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">Ciao ${escape(userName)}!</h1>
    <p style="color: #bfdbfe; margin: 12px 0 0 0; font-size: 16px;">È tempo del tuo check settimanale</p>
  </div>

  <div style="background: white; padding: 32px; ${SIDES}">
    <p style="color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">
      È passata un'altra settimana e vorrei sapere come sta andando il tuo percorso di allenamento.
    </p>
    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Il check settimanale mi aiuta a:</h3>
      <ul style="margin: 0; padding: 0; list-style: none;">
        ${benefit('Monitorare i tuoi progressi')}${benefit('Adattare il programma alle tue esigenze')}${benefit('Assicurarmi che tu stia ottenendo risultati')}
      </ul>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      ${button(escape(dashboardUrl), 'Compila il Check →', '#3b82f6 0%, #1d4ed8 100%', 'rgba(59, 130, 246, 0.4)')}
    </div>
    <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 0;">⏱️ Bastano solo 2 minuti per completarlo!</p>
  </div>

  ${trainerFooter(trainerName, `
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
    <p style="margin: 0; color: #9ca3af; font-size: 11px;">
      Hai ricevuto questa email perché sei iscritto a EserciziFacili.com.<br>
      Se non desideri ricevere questi promemoria, contattaci.
    </p>`)}`);

    return { to: userEmail, subject: `💪 ${userName}, è il momento del tuo check settimanale!`, html };
}

/** To a client: their trainer read the check of feedbackDate (YYYY-MM-DD); dashboardUrl = their personal link. */
function renderTrainerSeen(userEmail, userName, trainerName, feedbackDate, dashboardUrl = `${config.appUrl}/dashboard`) {
    const date = feedbackDate
        ? new Date(feedbackDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'recente';

    const html = page(`
  <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); border-radius: 16px 16px 0 0; padding: 40px 32px; text-align: center;">
    <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
    <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">Il tuo PT ha letto il tuo check!</h1>
    <p style="color: #a7f3d0; margin: 12px 0 0 0; font-size: 16px;">Ciao ${escape(userName)}!</p>
  </div>

  <div style="background: white; padding: 32px; ${SIDES}">
    <p style="color: #4b5563; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">
      <strong>${escape(trainerName)}</strong> ha letto il tuo check-in del <strong>${date}</strong>.
    </p>
    <div style="background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 0 8px 8px 0; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #065f46; font-size: 15px; line-height: 1.6;">
        Il tuo PT è aggiornato sui tuoi progressi e potrà personalizzare il tuo programma di conseguenza. Continua così! 💪
      </p>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      ${button(escape(dashboardUrl), 'Vai alla Dashboard →', '#059669 0%, #047857 100%', 'rgba(5, 150, 105, 0.4)')}
    </div>
  </div>

  ${trainerFooter(trainerName)}`);

    return { to: userEmail, subject: '✅ Il tuo PT ha letto il tuo check-in!', html };
}

const sendNewFeedbackNotification = (...args) => send(renderNewFeedback(...args));
const sendCheckInReminder = (...args) => send(renderCheckInReminder(...args));
const sendTrainerSeenFeedbackNotification = (...args) => send(renderTrainerSeen(...args));

module.exports = {
    sendNewFeedbackNotification,
    sendCheckInReminder,
    sendTrainerSeenFeedbackNotification,
    // for tests
    renderNewFeedback,
    renderCheckInReminder,
    renderTrainerSeen,
};
