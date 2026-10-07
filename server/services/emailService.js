'use strict';

/**
 * HealthBridge Email Service
 *
 * Provides a centralized, reusable layer for sending transactional emails.
 * All email sending is NON-BLOCKING and NON-CRASHING:
 *   - If credentials are missing  → skips silently (logs warning once)
 *   - If SMTP delivery fails      → logs error, does NOT throw
 *
 * Every notification that fires createNotification() also calls the
 * corresponding sendXxxEmail() helper defined below.
 */

const nodemailer = require('nodemailer');

/* ─────────────────────────── transporter ────────────────────────────────── */

let _transporter = null;
let _transporterWarnedOnce = false;

/**
 * Lazily creates and caches the Nodemailer transporter.
 * Returns null (and warns once) if credentials are absent.
 */
function getTransporter() {
  if (_transporter) return _transporter;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (!user || !pass) {
    if (!_transporterWarnedOnce) {
      console.warn(
        '[Email] Service not configured — set EMAIL_USER and EMAIL_PASSWORD in .env.\n' +
          '   In-app notifications will still work normally.'
      );
      _transporterWarnedOnce = true;
    }
    return null;
  }

  _transporter = nodemailer.createTransport({
    service: 'gmail', // swap for another SMTP provider if needed
    auth: { user, pass },
  });

  return _transporter;
}

/* ─────────────────────────── base sender ────────────────────────────────── */

/**
 * Low-level email sender.  Never throws.
 *
 * @param {object} opts
 * @param {string}   opts.to       - Recipient email address
 * @param {string}   opts.subject  - Email subject
 * @param {string}   opts.html     - HTML body
 * @param {string}   [opts.text]   - Plain-text fallback
 */
const sendEmail = async ({ to, subject, html, text }) => {
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    console.warn(`[Email] Skipped — invalid recipient address: "${to}"`);
    return;
  }

  const transporter = getTransporter();
  if (!transporter) return; // credentials not set — skip silently

  const from = `HealthBridge <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`;

  try {
    const info = await transporter.sendMail({ from, to, subject, html, text });
    console.log(`[Email] Sent "${subject}" to ${to} (${info.messageId})`);
  } catch (err) {
    console.error(`[Email] Failed to send "${subject}" to ${to}: ${err.message}`);
  }
};

/* ─────────────────────────── HTML template ──────────────────────────────── */

function buildEmailHtml({ title, preheader, bodyHtml, actionUrl, actionText }) {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const year      = new Date().getFullYear();
  const btnHtml   = actionUrl
    ? `<div style="text-align:center;margin:32px 0;">
        <a href="${actionUrl}"
           style="background:#dc2626;color:#fff;padding:14px 32px;border-radius:8px;
                  text-decoration:none;font-weight:700;font-size:15px;
                  display:inline-block;letter-spacing:0.3px;">
          ${actionText || 'Open HealthBridge'}
        </a>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="max-width:600px;width:100%;background:#fff;border-radius:12px;
                    overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#dc2626 0%,#991b1b 100%);
                     padding:28px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:1px;">
              HealthBridge
            </h1>
            <p style="margin:4px 0 0;color:#fca5a5;font-size:13px;">
              Blood Donation &amp; Health Management
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#fff7f7;padding:20px 40px;border-bottom:1px solid #fee2e2;">
            <h2 style="margin:0;color:#991b1b;font-size:20px;font-weight:700;">${title}</h2>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;color:#374151;font-size:15px;line-height:1.7;">
            ${bodyHtml}
            ${btnHtml}
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;">
              This is an automated notification from HealthBridge. Please do not reply to this email.
            </p>
            <p style="margin:0;font-size:12px;color:#d1d5db;">
              &copy; ${year} HealthBridge. All rights reserved.
              &nbsp;|&nbsp;
              <a href="${clientUrl}" style="color:#dc2626;text-decoration:none;">Visit Website</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* small reusable detail-row helpers */
function detailRow(label, value) {
  if (!value && value !== 0) return '';
  return `<tr>
    <td style="padding:8px 12px;color:#6b7280;font-size:14px;width:160px;
               vertical-align:top;border-bottom:1px solid #f3f4f6;">
      <strong>${label}</strong>
    </td>
    <td style="padding:8px 12px;color:#111827;font-size:14px;
               vertical-align:top;border-bottom:1px solid #f3f4f6;">
      ${value}
    </td>
  </tr>`;
}

function detailTable(rows) {
  const inner = rows.map(([l, v]) => detailRow(l, v)).join('');
  return `<table cellpadding="0" cellspacing="0"
           style="width:100%;border-collapse:collapse;background:#f9fafb;
                  border-radius:8px;border:1px solid #e5e7eb;margin:16px 0;">
    <tbody>${inner}</tbody>
  </table>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DONOR EMAIL SENDERS
   ═══════════════════════════════════════════════════════════════════════════ */

const sendNewBloodRequestEmail = async (donorEmail, {
  requestId, bloodGroup, unitsRequired, urgency,
  hospitalName, hospitalLocation, requiredDate, clickUrl,
}) => {
  const urgencyLabel = urgency === 'EMERGENCY' ? 'EMERGENCY'
    : urgency === 'URGENT' ? 'URGENT' : urgency || 'Normal';
  const urgencyColor = urgency === 'EMERGENCY' ? '#dc2626'
    : urgency === 'URGENT' ? '#d97706' : '#16a34a';

  const bodyHtml = `
    <p>A patient urgently needs blood that matches your type. Your donation could save a life.</p>
    <div style="background:#fef2f2;border-left:4px solid ${urgencyColor};
                padding:12px 16px;border-radius:4px;margin:16px 0;">
      <strong style="color:${urgencyColor};">Priority: ${urgencyLabel}</strong>
    </div>
    ${detailTable([
      ['Request ID',     requestId],
      ['Blood Group',    `<strong style="color:#dc2626;font-size:17px;">${bloodGroup}</strong>`],
      ['Units Required', unitsRequired],
      ['Hospital',       hospitalName],
      ['Location',       hospitalLocation],
      ['Required By',    requiredDate ? new Date(requiredDate).toLocaleDateString('en-IN', { dateStyle: 'long' }) : 'As soon as possible'],
      ['Urgency',        urgencyLabel],
    ])}
    <p style="color:#6b7280;font-size:13px;">
      Please log in to review the request. Recipient personal details are only shared after you accept.
    </p>`;

  await sendEmail({
    to:      donorEmail,
    subject: `HealthBridge - New Blood Request (${urgencyLabel})`,
    html:    buildEmailHtml({
      title:      `${urgencyLabel === 'EMERGENCY' ? 'EMERGENCY' : urgencyLabel === 'URGENT' ? 'URGENT' : 'New'} - ${bloodGroup} Blood Needed`,
      preheader:  `A patient at ${hospitalName} requires ${unitsRequired} unit(s) of ${bloodGroup} blood.`,
      bodyHtml,
      actionUrl:  clickUrl,
      actionText: 'View Blood Request',
    }),
  });
};

const sendDonorAcceptedEmail = async (donorEmail, {
  requestId, bloodGroup, unitsRequired, hospitalName, hospitalLocation, recipientName, clickUrl,
}) => {
  const bodyHtml = `
    <p>Thank you for accepting the blood request! You have taken a life-saving step.</p>
    ${detailTable([
      ['Request ID',   requestId],
      ['Blood Group',  bloodGroup],
      ['Units',        unitsRequired],
      ['Hospital',     hospitalName],
      ['Location',     hospitalLocation],
      ['Patient Name', recipientName || 'See app for details'],
    ])}
    <p>Recipient contact details are now available in your Blood Requests page.
       Please coordinate with the hospital at your earliest convenience.</p>`;

  await sendEmail({
    to:      donorEmail,
    subject: 'HealthBridge - Blood Request Accepted',
    html:    buildEmailHtml({
      title:      'You Accepted a Blood Request',
      preheader:  `You accepted blood request ${requestId}. Recipient details are now available.`,
      bodyHtml,
      actionUrl:  clickUrl,
      actionText: 'View Request Details',
    }),
  });
};

const sendDonorDeclinedEmail = async (donorEmail, { requestId, bloodGroup, clickUrl }) => {
  const bodyHtml = `
    <p>You have declined blood request <strong>${requestId}</strong> for <strong>${bloodGroup}</strong> blood.</p>
    <p>Other eligible donors may still respond. If you have any questions, please contact the HealthBridge team.</p>`;

  await sendEmail({
    to:      donorEmail,
    subject: 'HealthBridge - Blood Request Update',
    html:    buildEmailHtml({
      title:      'Blood Request Declined',
      preheader:  `You declined blood request ${requestId}.`,
      bodyHtml,
      actionUrl:  clickUrl,
      actionText: 'View Blood Requests',
    }),
  });
};

const sendDonorContactSharedEmail = async (donorEmail, {
  requestId, recipientContactShared, bloodGroup, unitsRequired, clickUrl,
}) => {
  const rc = recipientContactShared || {};
  const bodyHtml = `
    <p>You accepted a blood request and the recipient's contact information is now available.</p>
    ${detailTable([
      ['Request ID',         requestId],
      ['Blood Group',        bloodGroup],
      ['Units Required',     unitsRequired],
      ['Patient Name',       rc.patientName || rc.name || '-'],
      ['Recipient Name',     rc.name || '-'],
      ['Phone',              rc.phone || '-'],
      ['City',               rc.city || '-'],
      ['Address',            rc.address || '-'],
      ['Hospital',           rc.hospitalName || '-'],
      ['Hospital Location',  rc.hospitalLocation || '-'],
      ['Hospital Contact',   rc.hospitalContact || '-'],
    ])}
    <p style="color:#6b7280;font-size:13px;">
      Please treat this information with strict confidentiality.
    </p>`;

  await sendEmail({
    to:      donorEmail,
    subject: 'HealthBridge - Recipient Contact Details Available',
    html:    buildEmailHtml({
      title:      'Recipient Contact Details Available',
      preheader:  `Recipient contact details for request ${requestId} are now available.`,
      bodyHtml,
      actionUrl:  clickUrl,
      actionText: 'View Request Details',
    }),
  });
};

const sendMonthlyHealthCheckEmail = async (donorEmail, { donorName, nextHealthCheck, clickUrl }) => {
  const dateStr = nextHealthCheck
    ? new Date(nextHealthCheck).toLocaleDateString('en-IN', { dateStyle: 'long' })
    : 'this month';

  const bodyHtml = `
    <p>Hi <strong>${donorName || 'Donor'}</strong>,</p>
    <p>Your monthly health check is due. Regular health checks keep your records up to date
       and ensure your continued eligibility to donate blood.</p>
    ${detailTable([
      ['Due Date', dateStr],
    ])}
    <p>Please log in to schedule or view your health check appointment.</p>`;

  await sendEmail({
    to:      donorEmail,
    subject: 'HealthBridge - Monthly Health Check Reminder',
    html:    buildEmailHtml({
      title:      'Monthly Health Check Reminder',
      preheader:  `Your monthly health check is due ${dateStr}.`,
      bodyHtml,
      actionUrl:  clickUrl,
      actionText: 'View Health Reports',
    }),
  });
};

const sendHealthReportUpdatedEmail = async (donorEmail, {
  donorName, eligibilityStatus, reportDate, statusReason, clickUrl,
}) => {
  const statusColors = {
    ELIGIBLE:       '#16a34a',
    HOLD:           '#d97706',
    MEDICAL_REVIEW: '#9333ea',
    NOT_ELIGIBLE:   '#dc2626',
    PENDING:        '#3b82f6',
  };
  const color = statusColors[eligibilityStatus] || '#374151';

  const bodyHtml = `
    <p>Hi <strong>${donorName || 'Donor'}</strong>,</p>
    <p>Your health report has been reviewed and updated by the HealthBridge medical team.</p>
    ${detailTable([
      ['Report Date',  reportDate ? new Date(reportDate).toLocaleDateString('en-IN', { dateStyle: 'long' }) : 'Today'],
      ['New Status',   `<strong style="color:${color};">${eligibilityStatus || '-'}</strong>`],
      ['Notes',        statusReason || '-'],
    ])}
    <p>Log in to view the full report and any recommended next steps.</p>`;

  await sendEmail({
    to:      donorEmail,
    subject: 'HealthBridge - Your Health Report Has Been Updated',
    html:    buildEmailHtml({
      title:      'Health Report Updated',
      preheader:  `Your health report has been updated. Status: ${eligibilityStatus}.`,
      bodyHtml,
      actionUrl:  clickUrl,
      actionText: 'View Health Report',
    }),
  });
};

const sendEligibilityStatusChangedEmail = async (donorEmail, {
  donorName, newStatus, statusReason, clickUrl,
}) => {
  const statusMessages = {
    ELIGIBLE:       'You are now eligible to donate blood. Thank you for your commitment to saving lives!',
    HOLD:           'Your donor status has been placed on hold. Please contact HealthBridge for more information.',
    MEDICAL_REVIEW: 'Your account requires a medical review. Our team will reach out to schedule an appointment.',
    NOT_ELIGIBLE:   'Unfortunately you are currently not eligible to donate. Please speak with our team for guidance.',
    PENDING:        'Your application is under review. We will notify you once it is complete.',
  };
  const statusColors = {
    ELIGIBLE:       '#16a34a',
    HOLD:           '#d97706',
    MEDICAL_REVIEW: '#9333ea',
    NOT_ELIGIBLE:   '#dc2626',
    PENDING:        '#3b82f6',
  };

  const color   = statusColors[newStatus] || '#374151';
  const message = statusMessages[newStatus] || `Your status has been updated to: ${newStatus}.`;

  const bodyHtml = `
    <p>Hi <strong>${donorName || 'Donor'}</strong>,</p>
    <p>Your donor eligibility status has been updated.</p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;
                padding:16px 20px;margin:16px 0;text-align:center;">
      <span style="font-size:22px;font-weight:800;color:${color};">${newStatus}</span>
    </div>
    <p>${message}</p>
    ${statusReason ? `<p style="color:#6b7280;font-size:14px;"><strong>Notes:</strong> ${statusReason}</p>` : ''}`;

  await sendEmail({
    to:      donorEmail,
    subject: 'HealthBridge - Donor Eligibility Status Updated',
    html:    buildEmailHtml({
      title:      `Eligibility Status: ${newStatus}`,
      preheader:  `Your donor eligibility status has changed to: ${newStatus}.`,
      bodyHtml,
      actionUrl:  clickUrl,
      actionText: 'View Health Reports',
    }),
  });
};

const sendMedicalReviewRequiredEmail = async (donorEmail, { donorName, reason, clickUrl }) => {
  const bodyHtml = `
    <p>Hi <strong>${donorName || 'Donor'}</strong>,</p>
    <p>Your health assessment indicates that a <strong>medical review</strong> is required
       before you can continue participating in the blood donation programme.</p>
    ${reason ? `<div style="background:#fdf4ff;border-left:4px solid #9333ea;
                             padding:12px 16px;border-radius:4px;margin:16px 0;">
      <strong style="color:#7e22ce;">Reason:</strong> ${reason}
    </div>` : ''}
    <p><strong>Next Steps:</strong></p>
    <ul style="color:#374151;line-height:1.8;">
      <li>Log in to HealthBridge to view your upcoming appointment</li>
      <li>If no appointment has been scheduled, please contact the HealthBridge team</li>
      <li>Do not attempt to donate blood until your review is complete</li>
    </ul>`;

  await sendEmail({
    to:      donorEmail,
    subject: 'HealthBridge - Medical Review Required',
    html:    buildEmailHtml({
      title:      'Medical Review Required',
      preheader:  'A medical review is required for your donor profile.',
      bodyHtml,
      actionUrl:  clickUrl,
      actionText: 'View Appointments',
    }),
  });
};

const sendAppointmentScheduledEmail = async (donorEmail, {
  donorName, type, date, time, hospital, doctorName, reason, clickUrl,
}) => {
  const typeLabel = type === 'MONTHLY_HEALTH_CHECK' ? 'Monthly Health Check' : 'Doctor Consultation';
  const bodyHtml = `
    <p>Hi <strong>${donorName || 'Donor'}</strong>,</p>
    <p>An appointment has been scheduled for you. Please ensure you attend on time.</p>
    ${detailTable([
      ['Appointment Type',  typeLabel],
      ['Date',              date ? new Date(date).toLocaleDateString('en-IN', { dateStyle: 'long' }) : '-'],
      ['Time',              time || '-'],
      ['Hospital/Location', hospital || '-'],
      ['Doctor',            doctorName || 'To be assigned'],
      ['Reason',            reason || '-'],
      ['Status',            'PENDING'],
    ])}
    <p style="color:#6b7280;font-size:13px;">
      If you need to reschedule, please contact the HealthBridge team.
    </p>`;

  await sendEmail({
    to:      donorEmail,
    subject: `HealthBridge - ${typeLabel} Appointment Scheduled`,
    html:    buildEmailHtml({
      title:      `Appointment Scheduled: ${typeLabel}`,
      preheader:  `Your appointment is on ${date ? new Date(date).toLocaleDateString() : 'a scheduled date'} at ${time}.`,
      bodyHtml,
      actionUrl:  clickUrl,
      actionText: 'View Appointments',
    }),
  });
};

const sendAppointmentUpdatedEmail = async (donorEmail, {
  donorName, type, date, time, hospital, status, clickUrl,
}) => {
  const typeLabel = type === 'MONTHLY_HEALTH_CHECK' ? 'Monthly Health Check' : 'Doctor Consultation';
  const bodyHtml = `
    <p>Hi <strong>${donorName || 'Donor'}</strong>,</p>
    <p>Your <strong>${typeLabel}</strong> appointment has been updated.</p>
    ${detailTable([
      ['Appointment Type',  typeLabel],
      ['New Date',          date ? new Date(date).toLocaleDateString('en-IN', { dateStyle: 'long' }) : '-'],
      ['New Time',          time || '-'],
      ['Hospital/Location', hospital || '-'],
      ['New Status',        status || '-'],
    ])}
    <p style="color:#6b7280;font-size:13px;">
      Please log in for the latest appointment details.
    </p>`;

  await sendEmail({
    to:      donorEmail,
    subject: 'HealthBridge - Doctor Appointment Updated',
    html:    buildEmailHtml({
      title:      'Appointment Updated',
      preheader:  `Your ${typeLabel} appointment has been updated.`,
      bodyHtml,
      actionUrl:  clickUrl,
      actionText: 'View Appointments',
    }),
  });
};

const sendAppointmentCancelledEmail = async (donorEmail, {
  donorName, type, date, time, hospital, cancellationReason, clickUrl,
}) => {
  const typeLabel = type === 'MONTHLY_HEALTH_CHECK' ? 'Monthly Health Check' : 'Doctor Consultation';
  const bodyHtml = `
    <p>Hi <strong>${donorName || 'Donor'}</strong>,</p>
    <p>Your <strong>${typeLabel}</strong> appointment has been <strong style="color:#dc2626;">cancelled</strong>.</p>
    ${detailTable([
      ['Appointment Type',    typeLabel],
      ['Original Date',       date ? new Date(date).toLocaleDateString('en-IN', { dateStyle: 'long' }) : '-'],
      ['Original Time',       time || '-'],
      ['Hospital/Location',   hospital || '-'],
      ['Cancellation Reason', cancellationReason || 'Not specified'],
    ])}
    <p><strong>Next Steps:</strong></p>
    <ul style="color:#374151;line-height:1.8;">
      <li>Contact the HealthBridge team to reschedule if needed</li>
      <li>Continue monitoring your health and eligibility status</li>
    </ul>`;

  await sendEmail({
    to:      donorEmail,
    subject: 'HealthBridge - Doctor Appointment Cancelled',
    html:    buildEmailHtml({
      title:      'Appointment Cancelled',
      preheader:  `Your ${typeLabel} appointment has been cancelled.`,
      bodyHtml,
      actionUrl:  clickUrl,
      actionText: 'View Appointments',
    }),
  });
};

const sendQuestionnaireSubmittedEmail = async (donorEmail, { donorName, status, clickUrl }) => {
  const bodyHtml = `
    <p>Hi <strong>${donorName || 'Donor'}</strong>,</p>
    <p>Thank you for completing your initial health questionnaire! Your application is now
       under review by the HealthBridge medical team.</p>
    ${detailTable([
      ['Application Status', 'Under Review (PENDING)'],
      ['Preliminary Result', status || '-'],
    ])}
    <p>You will receive another email once your application has been reviewed.
       This typically takes 1-3 business days.</p>`;

  await sendEmail({
    to:      donorEmail,
    subject: 'HealthBridge - Health Questionnaire Received',
    html:    buildEmailHtml({
      title:      'Health Questionnaire Submitted',
      preheader:  'Your health questionnaire has been received and is under review.',
      bodyHtml,
      actionUrl:  clickUrl,
      actionText: 'View Donor Dashboard',
    }),
  });
};

const sendDonationCompletedEmail = async (donorEmail, {
  donorName, bloodGroup, units, hospitalName, donationDate, clickUrl,
}) => {
  const bodyHtml = `
    <p>Hi <strong>${donorName || 'Donor'}</strong>,</p>
    <p><strong>Thank you for your life-saving donation!</strong></p>
    <p>Your blood donation has been recorded and marked as completed.</p>
    ${detailTable([
      ['Blood Group',   bloodGroup],
      ['Units Donated', units],
      ['Hospital',      hospitalName],
      ['Donation Date', donationDate ? new Date(donationDate).toLocaleDateString('en-IN', { dateStyle: 'long' }) : 'Today'],
    ])}
    <p>Your donation has been added to your donation history. Thank you for making a difference!</p>`;

  await sendEmail({
    to:      donorEmail,
    subject: 'HealthBridge - Donation Completed - Thank You!',
    html:    buildEmailHtml({
      title:      'Donation Completed - Thank You!',
      preheader:  'Your blood donation has been successfully recorded.',
      bodyHtml,
      actionUrl:  clickUrl,
      actionText: 'View Donation History',
    }),
  });
};

/* ═══════════════════════════════════════════════════════════════════════════
   RECIPIENT EMAIL SENDERS
   ═══════════════════════════════════════════════════════════════════════════ */

const sendBloodRequestCreatedEmail = async (recipientEmail, {
  recipientName, requestId, bloodGroup, unitsRequired, urgency,
  hospitalName, hospitalLocation, requiredDate, clickUrl,
}) => {
  const urgencyLabel = urgency === 'EMERGENCY' ? 'EMERGENCY'
    : urgency === 'URGENT' ? 'URGENT' : urgency || 'Normal';

  const bodyHtml = `
    <p>Hi <strong>${recipientName || 'there'}</strong>,</p>
    <p>Your blood request has been successfully submitted. We are searching for eligible donors.</p>
    ${detailTable([
      ['Request ID',   requestId],
      ['Blood Group',  `<strong style="color:#dc2626;font-size:17px;">${bloodGroup}</strong>`],
      ['Units Needed', unitsRequired],
      ['Hospital',     hospitalName],
      ['Location',     hospitalLocation],
      ['Required By',  requiredDate ? new Date(requiredDate).toLocaleDateString('en-IN', { dateStyle: 'long' }) : 'As soon as possible'],
      ['Urgency',      urgencyLabel],
      ['Status',       'PENDING - Searching for Donors'],
    ])}
    <p style="color:#6b7280;font-size:13px;">
      You will receive an email when donors are found or when a donor responds.
    </p>`;

  await sendEmail({
    to:      recipientEmail,
    subject: 'HealthBridge - Blood Request Submitted',
    html:    buildEmailHtml({
      title:      'Blood Request Submitted',
      preheader:  `Your blood request ${requestId} for ${bloodGroup} blood has been received.`,
      bodyHtml,
      actionUrl:  clickUrl,
      actionText: 'Track Your Request',
    }),
  });
};

const sendMatchingDonorsFoundEmail = async (recipientEmail, {
  recipientName, requestId, bloodGroup, donorCount, clickUrl,
}) => {
  const bodyHtml = `
    <p>Hi <strong>${recipientName || 'there'}</strong>,</p>
    <p>We have found eligible blood donors matching your request.</p>
    ${detailTable([
      ['Request ID',      requestId],
      ['Blood Group',     bloodGroup],
      ['Matching Donors', donorCount > 0 ? `${donorCount} eligible donor(s) notified` : 'Donors notified'],
      ['Status',          'SEARCHING - Awaiting Donor Response'],
    ])}
    <p>Notified donors can choose to accept or decline. You will receive another notification once a donor responds.</p>`;

  await sendEmail({
    to:      recipientEmail,
    subject: 'HealthBridge - Matching Donors Found',
    html:    buildEmailHtml({
      title:      'Matching Donors Found',
      preheader:  `Eligible donors have been found for your ${bloodGroup} blood request.`,
      bodyHtml,
      actionUrl:  clickUrl,
      actionText: 'View Blood Request',
    }),
  });
};

const sendDonorAcceptedRecipientEmail = async (recipientEmail, {
  recipientName, requestId, bloodGroup, unitsRequired, donorContactShared, clickUrl,
}) => {
  const dc = donorContactShared || {};
  const bodyHtml = `
    <p>Hi <strong>${recipientName || 'there'}</strong>,</p>
    <p>A donor has <strong>accepted</strong> your blood request! Contact information is now available.</p>
    ${detailTable([
      ['Request ID',    requestId],
      ['Blood Group',   bloodGroup],
      ['Units Required',unitsRequired],
    ])}
    <h3 style="color:#1f2937;margin:20px 0 8px;">Donor Contact Information</h3>
    ${detailTable([
      ['Donor Name',  dc.name || '-'],
      ['Phone',       dc.phone || '-'],
      ['Blood Group', dc.bloodGroup || bloodGroup],
      ['City',        dc.city || '-'],
      ['Address',     dc.address || '-'],
    ])}
    <p style="color:#6b7280;font-size:13px;">
      Please treat this information with strict confidentiality.
    </p>`;

  await sendEmail({
    to:      recipientEmail,
    subject: 'HealthBridge - A Donor Accepted Your Blood Request',
    html:    buildEmailHtml({
      title:      'A Donor Accepted Your Blood Request!',
      preheader:  `A donor has accepted blood request ${requestId}. Contact details are now available.`,
      bodyHtml,
      actionUrl:  clickUrl,
      actionText: 'View Request Details',
    }),
  });
};

const sendDonorDeclinedRecipientEmail = async (recipientEmail, {
  recipientName, requestId, bloodGroup, clickUrl,
}) => {
  const bodyHtml = `
    <p>Hi <strong>${recipientName || 'there'}</strong>,</p>
    <p>A donor has declined your blood request <strong>${requestId}</strong> for
       <strong>${bloodGroup}</strong> blood.</p>
    <p><strong>Don't worry</strong> — other eligible donors may still respond.
       HealthBridge will continue searching and notify you of any updates.</p>
    ${detailTable([
      ['Request ID',  requestId],
      ['Blood Group', bloodGroup],
      ['Status',      'Searching - other donors may still respond'],
    ])}`;

  await sendEmail({
    to:      recipientEmail,
    subject: 'HealthBridge - Blood Request Update',
    html:    buildEmailHtml({
      title:      'Blood Request Update',
      preheader:  `A donor declined request ${requestId} - we are still searching for other donors.`,
      bodyHtml,
      actionUrl:  clickUrl,
      actionText: 'View Blood Request',
    }),
  });
};

const sendDonationCompletedRecipientEmail = async (recipientEmail, {
  recipientName, requestId, bloodGroup, units, hospitalName, clickUrl,
}) => {
  const bodyHtml = `
    <p>Hi <strong>${recipientName || 'there'}</strong>,</p>
    <p>The blood donation for your request has been successfully completed and recorded.</p>
    ${detailTable([
      ['Request ID',  requestId],
      ['Blood Group', bloodGroup],
      ['Units',       units],
      ['Hospital',    hospitalName],
      ['Status',      'DONATION COMPLETED'],
    ])}
    <p>We hope the patient makes a speedy recovery. Thank you for using HealthBridge.</p>`;

  await sendEmail({
    to:      recipientEmail,
    subject: 'HealthBridge - Blood Donation Completed',
    html:    buildEmailHtml({
      title:      'Donation Completed',
      preheader:  `Blood donation for request ${requestId} has been completed.`,
      bodyHtml,
      actionUrl:  clickUrl,
      actionText: 'View Request',
    }),
  });
};

/* ─────────────────────────── exports ────────────────────────────────────── */
module.exports = {
  sendEmail,
  buildEmailHtml,
  // DONOR
  sendNewBloodRequestEmail,
  sendDonorAcceptedEmail,
  sendDonorDeclinedEmail,
  sendDonorContactSharedEmail,
  sendMonthlyHealthCheckEmail,
  sendHealthReportUpdatedEmail,
  sendEligibilityStatusChangedEmail,
  sendMedicalReviewRequiredEmail,
  sendAppointmentScheduledEmail,
  sendAppointmentUpdatedEmail,
  sendAppointmentCancelledEmail,
  sendQuestionnaireSubmittedEmail,
  sendDonationCompletedEmail,
  // RECIPIENT
  sendBloodRequestCreatedEmail,
  sendMatchingDonorsFoundEmail,
  sendDonorAcceptedRecipientEmail,
  sendDonorDeclinedRecipientEmail,
  sendDonorContactSharedRecipientEmail: sendDonorAcceptedRecipientEmail,
  sendDonationCompletedRecipientEmail,
};
