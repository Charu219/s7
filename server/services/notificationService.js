const Notification = require('../models/Notification');
const User          = require('../models/User');
const { sendPushToUser, sendBulkPushNotifications } = require('./pushNotificationService');
const emailService  = require('./emailService');

/* ─────────────────────────────────────────────────────────────────────────────
 * EMAIL DISPATCH
 *
 * Maps notification `type` values to the correct emailService function.
 * Each caller can optionally pass `emailData` (extra context for the template).
 * Falls back to a generic sendNotificationEmail() when no specific template matches.
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * Look up a user's email address from MongoDB.
 * Returns null (and logs) if the user has no email.
 */
const getUserEmail = async (userId) => {
  try {
    const user = await User.findById(userId).select('email name').lean();
    if (!user || !user.email) {
      console.warn(`[Email] No email found for userId ${userId} — skipping email.`);
      return null;
    }
    return { email: user.email, name: user.name };
  } catch (err) {
    console.error(`[Email] Failed to fetch user email for ${userId}: ${err.message}`);
    return null;
  }
};

/**
 * Dispatch the appropriate email based on notification type.
 * This is non-blocking and non-crashing.
 *
 * @param {string|ObjectId} userId
 * @param {string}          type        - Notification type enum value
 * @param {string}          title       - Notification title (used as fallback subject)
 * @param {string}          message     - Notification body
 * @param {string}          [clickUrl]  - CTA link
 * @param {object}          [emailData] - Extra context specific to the notification type
 */
const dispatchEmail = async (userId, type, title, message, clickUrl, emailData = {}) => {
  try {
    const userInfo = await getUserEmail(userId);
    if (!userInfo) return;

    const { email, name } = userInfo;
    const ctx = { ...emailData, clickUrl, donorName: emailData.donorName || name, recipientName: emailData.recipientName || name };

    switch (type) {
      // ── Donor notifications ─────────────────────────────────────────────────

      case 'BLOOD_REQUEST':
        // Could be sent to a donor (new request) OR to a recipient (status update).
        // Distinguish by checking emailData.role or specific keys.
        if (emailData._recipientNotif) {
          // Recipient-side BLOOD_REQUEST (decline update / status update)
          await emailService.sendDonorDeclinedRecipientEmail(email, ctx);
        } else {
          // Donor-side: new blood request notification
          await emailService.sendNewBloodRequestEmail(email, ctx);
        }
        break;

      case 'REQUEST_ACCEPTED':
        // Sent to RECIPIENT when a donor accepts
        await emailService.sendDonorAcceptedRecipientEmail(email, ctx);
        break;

      case 'CONTACT_SHARED':
        // Sent to DONOR after they accept (contact info now available)
        await emailService.sendDonorContactSharedEmail(email, ctx);
        break;

      case 'HEALTH_REPORT':
        await emailService.sendHealthReportUpdatedEmail(email, {
          ...ctx,
          eligibilityStatus: emailData.eligibilityStatus,
          reportDate:        emailData.reportDate,
          statusReason:      emailData.statusReason,
        });
        break;

      case 'STATUS_CHANGE':
        if (emailData.isMedicalReview) {
          await emailService.sendMedicalReviewRequiredEmail(email, { ...ctx, reason: emailData.statusReason });
        } else {
          await emailService.sendEligibilityStatusChangedEmail(email, {
            ...ctx,
            newStatus:    emailData.newStatus,
            statusReason: emailData.statusReason,
          });
        }
        break;

      case 'APPOINTMENT':
        if (emailData.appointmentCancelled) {
          await emailService.sendAppointmentCancelledEmail(email, ctx);
        } else if (emailData.appointmentIsNew) {
          await emailService.sendAppointmentScheduledEmail(email, ctx);
        } else {
          await emailService.sendAppointmentUpdatedEmail(email, ctx);
        }
        break;

      case 'QUESTIONNAIRE_REMINDER':
        await emailService.sendQuestionnaireSubmittedEmail(email, ctx);
        break;

      case 'HEALTH_CHECK_REMINDER':
        await emailService.sendMonthlyHealthCheckEmail(email, ctx);
        break;

      case 'DONATION_COMPLETED':
        if (emailData._recipientNotif) {
          await emailService.sendDonationCompletedRecipientEmail(email, ctx);
        } else {
          await emailService.sendDonationCompletedEmail(email, ctx);
        }
        break;

      default:
        // Generic fallback — send raw title + message
        await emailService.sendEmail({
          to:      email,
          subject: `HealthBridge - ${title}`,
          html:    emailService.buildEmailHtml({
            title,
            preheader: message,
            bodyHtml:  `<p>${message}</p>`,
            actionUrl:  clickUrl,
            actionText: 'Open HealthBridge',
          }),
        });
        break;
    }
  } catch (err) {
    // Never let email errors bubble up
    console.error(`[Email] dispatchEmail error (type=${type}): ${err.message}`);
  }
};

/* ─────────────────────────── createNotification ─────────────────────────── */

/**
 * Create an in-app notification, send FCM push, and send an email.
 *
 * @param {object} opts
 * @param {string|ObjectId} opts.userId
 * @param {string}          opts.title
 * @param {string}          opts.message
 * @param {string}          [opts.type]
 * @param {string|ObjectId} [opts.relatedId]
 * @param {string}          [opts.relatedModel]
 * @param {string}          [opts.clickUrl]
 * @param {object}          [opts.emailData]  - Extra context for the email template
 */
const createNotification = async ({
  userId,
  title,
  message,
  type = 'GENERAL',
  relatedId    = null,
  relatedModel = null,
  clickUrl     = null,
  emailData    = {},
}) => {
  try {
    // 1. Persist in-app notification (unchanged existing behaviour)
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      relatedId,
      relatedModel,
    });

    // 2. Fire FCM push notification (non-blocking, unchanged)
    sendPushToUser({
      userId,
      title,
      body: message,
      type,
      relatedModel,
      relatedId,
      clickUrl,
    }).catch((err) => console.error('Push notification error:', err.message));

    // 3. Send email notification (non-blocking, never throws)
    dispatchEmail(userId, type, title, message, clickUrl, emailData).catch(
      (err) => console.error('Email dispatch error:', err.message)
    );

    return notification;
  } catch (error) {
    console.error('Notification creation error:', error.message);
    return null;
  }
};

/* ─────────────────────────── createBulkNotifications ────────────────────── */

/**
 * Send in-app + FCM push + email notifications to multiple users at once.
 *
 * @param {Array<object>} notifications - Same shape as createNotification opts
 *                                        (each item may include emailData)
 */
const createBulkNotifications = async (notifications) => {
  try {
    // 1. Bulk insert in-app notifications (unchanged)
    const inserted = await Notification.insertMany(
      notifications.map((n) => ({
        userId:       n.userId,
        title:        n.title,
        message:      n.message,
        type:         n.type || 'GENERAL',
        relatedId:    n.relatedId || null,
        relatedModel: n.relatedModel || null,
      }))
    );

    // 2. Fire FCM push to all recipients (non-blocking, unchanged)
    sendBulkPushNotifications(
      notifications.map((n) => ({
        userId:       n.userId,
        title:        n.title,
        body:         n.message,
        type:         n.type || 'GENERAL',
        relatedModel: n.relatedModel || null,
        relatedId:    n.relatedId || null,
        clickUrl:     n.clickUrl || null,
      }))
    ).catch((err) => console.error('Bulk push notification error:', err.message));

    // 3. Send emails to all recipients (non-blocking)
    Promise.all(
      notifications.map((n) =>
        dispatchEmail(
          n.userId,
          n.type || 'GENERAL',
          n.title,
          n.message,
          n.clickUrl || null,
          n.emailData || {}
        )
      )
    ).catch((err) => console.error('Bulk email dispatch error:', err.message));

    return inserted;
  } catch (error) {
    console.error('Bulk notification error:', error.message);
    return [];
  }
};

module.exports = { createNotification, createBulkNotifications };
