const BloodRequest = require('../models/BloodRequest');
const DonorResponse = require('../models/DonorResponse');
const ContactShare = require('../models/ContactShare');
const DonationRecord = require('../models/DonationRecord');
const Notification = require('../models/Notification');
const Donor = require('../models/Donor');
const Recipient = require('../models/Recipient');
const User = require('../models/User');
const { findEligibleDonors } = require('../services/matchingService');
const { createNotification, createBulkNotifications } = require('../services/notificationService');


// POST /api/blood-requests  (recipient)
const createBloodRequest = async (req, res, next) => {
  try {
    const {
      patientName, patientAge, gender, bloodGroup, unitsRequired, urgency, requiredDate,
      hospitalName, hospitalLocation, hospitalContact, doctorName, reason, notes,
    } = req.body;

    const request = await BloodRequest.create({
      recipientId: req.user._id,
      patientName, patientAge, gender, bloodGroup, unitsRequired, urgency, requiredDate,
      hospitalName, hospitalLocation, hospitalContact, doctorName, reason, notes,
    });

    // Update recipient stats
    await Recipient.findOneAndUpdate({ userId: req.user._id }, { $inc: { totalRequests: 1, activeRequests: 1 } });

    // Notify recipient
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    await createNotification({
      userId: req.user._id,
      title: 'Blood Request Submitted',
      message: `Your blood request (${request.requestId}) for ${bloodGroup} blood has been submitted and is being processed.`,
      type: 'BLOOD_REQUEST',
      relatedId: request._id,
      relatedModel: 'BloodRequest',
      clickUrl: `${clientUrl}/recipient/my-requests`,
      emailData: {
        _recipientNotif: true,           // tells dispatchEmail this is for a recipient
        requestId:       request.requestId,
        bloodGroup,
        unitsRequired:   unitsRequired,
        urgency,
        hospitalName,
        hospitalLocation,
        requiredDate,
      },
    });

    // Find matching donors and notify them
    const matchedDonors = await findEligibleDonors(bloodGroup);

    if (matchedDonors.length > 0) {
      const donorIds = matchedDonors.map((d) => d._id);
      request.matchedDonors = donorIds;
      request.notifiedDonors = donorIds;
      request.status = 'SEARCHING';
      await request.save();

      // Create DonorResponse records and send notifications
      const responseInserts = matchedDonors.map((d) => ({
        requestId: request._id,
        donorId: d._id,
        response: 'PENDING',
      }));
      await DonorResponse.insertMany(responseInserts, { ordered: false }).catch(() => {});

      const notifInserts = matchedDonors.map((d) => ({
        userId: d.userId._id,
        title: `${urgency === 'EMERGENCY' ? '🚨 EMERGENCY' : urgency === 'URGENT' ? '⚠️ URGENT' : 'Blood Request'} – ${bloodGroup} Blood Needed`,
        message: `A patient at ${hospitalName} requires ${unitsRequired} unit(s) of ${bloodGroup} blood. Please check your Blood Requests page.`,
        type: 'BLOOD_REQUEST',
        relatedId: request._id,
        relatedModel: 'BloodRequest',
        clickUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/donor/blood-requests`,
        emailData: {
          requestId:       request.requestId,
          bloodGroup,
          unitsRequired,
          urgency,
          hospitalName,
          hospitalLocation,
          requiredDate,
        },
      }));
      await createBulkNotifications(notifInserts);

      // Also email the recipient that matching donors have been found (non-blocking)
      const { sendMatchingDonorsFoundEmail } = require('../services/emailService');
      User.findById(req.user._id).select('email name').lean().then((recipUser) => {
        if (recipUser && recipUser.email) {
          sendMatchingDonorsFoundEmail(recipUser.email, {
            recipientName: recipUser.name,
            requestId:     request.requestId,
            bloodGroup,
            donorCount:    matchedDonors.length,
            clickUrl:      `${clientUrl}/recipient/my-requests`,
          }).catch((err) => console.error('[Email] matchingDonors email error:', err.message));
        }
      }).catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: 'Blood request submitted successfully.',
      request,
      matchedDonorsCount: matchedDonors.length,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/blood-requests  (admin = all, recipient = own, donor = assigned)
const getBloodRequests = async (req, res, next) => {
  try {
    const { bloodGroup, urgency, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    let currentDonor = null;

    if (req.user.role === 'RECIPIENT') {
      filter.recipientId = req.user._id;
      if (status) filter.status = status;
    } else if (req.user.role === 'DONOR') {
      currentDonor = await Donor.findOne({ userId: req.user._id });
      if (!currentDonor) return res.status(200).json({ success: true, bloodRequests: [] });

      // Determine which recipient blood groups this donor is compatible with
      // e.g. O+ donor can donate to O+ and AB+ recipients
      const { BLOOD_COMPATIBILITY } = require('../services/eligibilityService');
      const compatibleRecipientGroups = Object.keys(BLOOD_COMPATIBILITY).filter(
        (recipientGroup) => BLOOD_COMPATIBILITY[recipientGroup].includes(currentDonor.bloodGroup)
      );

      // Donors see:
      // 1) Any request they were explicitly notified/assigned about (any status)
      // 2) Any SEARCHING/PENDING request whose blood group this donor is compatible with
      //    (catches cases where matching ran before their account was activated,
      //     or when they became eligible after the request was created)
      filter.$or = [
        { notifiedDonors: currentDonor._id },
        {
          bloodGroup: { $in: compatibleRecipientGroups },
          status: { $in: ['SEARCHING', 'PENDING'] },
        },
      ];
      // If a specific status is requested (e.g. dashboard fetches SEARCHING), filter by it
      if (status) {
        filter.$or = filter.$or.map((cond) => ({ ...cond, status }));
      }
    } else {
      // ADMIN – see everything
      if (status) filter.status = status;
    }

    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (urgency) filter.urgency = urgency;

    const total = await BloodRequest.countDocuments(filter);
    const requests = await BloodRequest.find(filter)
      .populate('recipientId', 'name phone city')
      .populate('acceptedDonor', 'bloodGroup userId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // ── Attach contactShare data for post-acceptance requests ──────────────
    const sharedStatuses = ['DONOR_ACCEPTED', 'CONTACT_SHARED', 'DONATION_COMPLETED'];
    const sharedRequests = requests.filter((r) => sharedStatuses.includes(r.status));

    let contactShareMap = {};
    if (sharedRequests.length > 0) {
      const sharedIds = sharedRequests.map((r) => r._id);
      let contactShareQuery = { requestId: { $in: sharedIds } };

      if (req.user.role === 'RECIPIENT') {
        contactShareQuery.recipientId = req.user._id;
      } else if (req.user.role === 'DONOR' && currentDonor) {
        contactShareQuery.donorId = currentDonor._id;
      }

      const contactShares = await ContactShare.find(contactShareQuery);
      contactShares.forEach((cs) => {
        contactShareMap[cs.requestId.toString()] = cs;
      });
    }

    // ── Attach donor's own response status per request ─────────────────────
    let myResponseMap = {};
    if (req.user.role === 'DONOR' && currentDonor) {
      const myResponses = await DonorResponse.find({
        requestId: { $in: requests.map((r) => r._id) },
        donorId: currentDonor._id,
      });
      myResponses.forEach((dr) => {
        myResponseMap[dr.requestId.toString()] = dr.response;
      });
    }

    // Merge extra data into result objects
    const enriched = requests.map((r) => {
      const plain = r.toObject();
      const rid = r._id.toString();
      const cs = contactShareMap[rid];

      // Privacy: only expose contact data after acceptance
      if (cs && sharedStatuses.includes(r.status)) {
        if (req.user.role === 'RECIPIENT') {
          plain.contactShare = { donorContactShared: cs.donorContactShared };
        } else if (req.user.role === 'DONOR') {
          plain.contactShare = { recipientContactShared: cs.recipientContactShared };
        } else {
          plain.contactShare = cs; // admin sees everything
        }
      }

      // Privacy: strip recipient personal contact info from donor view before acceptance
      if (req.user.role === 'DONOR' && plain.recipientId && typeof plain.recipientId === 'object') {
        delete plain.recipientId.phone;
        delete plain.recipientId.city;
        delete plain.recipientId.name;
        delete plain.recipientId.address;
      }

      if (req.user.role === 'DONOR') {
        plain._myResponse = myResponseMap[rid] || null;
      }

      return plain;
    });

    res.status(200).json({ success: true, total, bloodRequests: enriched });
  } catch (error) {
    next(error);
  }
};


// GET /api/blood-requests/:id
const getBloodRequestById = async (req, res, next) => {
  try {
    const sharedStatuses = ['DONOR_ACCEPTED', 'CONTACT_SHARED', 'DONATION_COMPLETED'];

    const request = await BloodRequest.findById(req.params.id)
      .populate('recipientId', 'name phone city address')
      .populate('matchedDonors', 'bloodGroup donorStatus userId')
      .populate('acceptedDonor', 'bloodGroup donorStatus userId');

    if (!request) return res.status(404).json({ success: false, message: 'Blood request not found.' });

    // Check access
    if (req.user.role === 'RECIPIENT' && request.recipientId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // For donors – only show if they were notified
    // NOTE: Must use .some() with toString() comparison — .includes() fails for ObjectIds
    let currentDonor = null;
    if (req.user.role === 'DONOR') {
      currentDonor = await Donor.findOne({ userId: req.user._id });
      const notified = currentDonor && request.notifiedDonors.some(
        (id) => id.toString() === currentDonor._id.toString()
      );
      if (!notified) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    // Get contact share if exists
    let contactShare = null;
    if (req.user.role === 'RECIPIENT' && sharedStatuses.includes(request.status)) {
      const cs = await ContactShare.findOne({ requestId: request._id, recipientId: req.user._id });
      if (cs) contactShare = { donorContactShared: cs.donorContactShared };
    }
    if (req.user.role === 'DONOR' && currentDonor) {
      const cs = await ContactShare.findOne({ requestId: request._id, donorId: currentDonor._id });
      if (cs) contactShare = { recipientContactShared: cs.recipientContactShared };
    }
    if (req.user.role === 'ADMIN') {
      contactShare = await ContactShare.findOne({ requestId: request._id });
    }

    // Build response — strip recipient personal contact from donors if not yet accepted
    const plain = request.toObject();
    if (req.user.role === 'DONOR' && plain.recipientId && typeof plain.recipientId === 'object' && !contactShare) {
      // Before acceptance: hide recipient personal info
      delete plain.recipientId.phone;
      delete plain.recipientId.city;
      delete plain.recipientId.name;
      delete plain.recipientId.address;
    }

    // Attach donor's own response status
    let myResponse = null;
    if (req.user.role === 'DONOR' && currentDonor) {
      const dr = await DonorResponse.findOne({ requestId: request._id, donorId: currentDonor._id });
      myResponse = dr ? dr.response : null;
    }

    res.status(200).json({ success: true, request: plain, contactShare, myResponse });
  } catch (error) {
    next(error);
  }
};

// POST /api/blood-requests/:id/respond  (donor accept/decline)
const respondToBloodRequest = async (req, res, next) => {
  try {
    const { response, declineReason } = req.body; // 'ACCEPTED' | 'DECLINED'

    const donor = await Donor.findOne({ userId: req.user._id }).populate('userId');
    if (!donor) return res.status(404).json({ success: false, message: 'Donor profile not found.' });

    // Only ELIGIBLE donors can accept
    if (response === 'ACCEPTED' && donor.donorStatus !== 'ELIGIBLE') {
      return res.status(403).json({ success: false, message: 'Only eligible donors can accept blood requests.' });
    }

    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Blood request not found.' });

    if (!['SEARCHING', 'PENDING'].includes(request.status)) {
      return res.status(400).json({ success: false, message: 'This request is no longer accepting responses.' });
    }

    const donorResponse = await DonorResponse.findOneAndUpdate(
      { requestId: request._id, donorId: donor._id },
      {
        response,
        acceptedAt: response === 'ACCEPTED' ? new Date() : undefined,
        declinedAt: response === 'DECLINED' ? new Date() : undefined,
        declineReason: response === 'DECLINED' ? declineReason : undefined,
      },
      { upsert: true, new: true }
    );

    if (response === 'ACCEPTED') {
      // Update request status
      request.status = 'CONTACT_SHARED';
      request.acceptedDonor = donor._id;
      await request.save();

      // Get recipient user (fetch full profile including address)
      const recipientUser = await User.findById(request.recipientId);

      // Create ContactShare record — include personal address for both parties
      const contactShare = await ContactShare.create({
        requestId: request._id,
        donorId: donor._id,
        recipientId: request.recipientId,
        // Donor info shared with recipient
        donorContactShared: {
          name: donor.userId.name,
          phone: donor.userId.phone,
          bloodGroup: donor.bloodGroup,
          city: donor.userId.city,
          address: donor.userId.address || '',
        },
        // Recipient personal info shared with donor
        recipientContactShared: {
          name: recipientUser.name,
          phone: recipientUser.phone,
          address: recipientUser.address || '',
          city: recipientUser.city || '',
          hospitalName: request.hospitalName,
          hospitalLocation: request.hospitalLocation,
          hospitalContact: request.hospitalContact,
          patientName: request.patientName,
        },
      });

      donorResponse.contactShared = true;
      await donorResponse.save();

      const appClientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      // Notify recipient (with donor contact info in emailData)
      await createNotification({
        userId: request.recipientId,
        title: '✅ Donor Accepted Your Blood Request!',
        message: `Your blood request (${request.requestId}) has been accepted by a donor. Donor contact information is now available. Please check your Blood Requests page.`,
        type: 'REQUEST_ACCEPTED',
        relatedId: request._id,
        relatedModel: 'BloodRequest',
        clickUrl: `${appClientUrl}/recipient/my-requests`,
        emailData: {
          requestId:          request.requestId,
          bloodGroup:         request.bloodGroup,
          unitsRequired:      request.unitsRequired,
          donorContactShared: contactShare.donorContactShared,
        },
      });

      // Notify donor (with recipient contact info in emailData)
      await createNotification({
        userId: req.user._id,
        title: '✅ You Accepted a Blood Request',
        message: `You accepted the blood request (${request.requestId}) from ${recipientUser.name}. Recipient contact information is now available. Please check your Blood Requests page.`,
        type: 'CONTACT_SHARED',
        relatedId: request._id,
        relatedModel: 'BloodRequest',
        clickUrl: `${appClientUrl}/donor/blood-requests`,
        emailData: {
          requestId:              request.requestId,
          bloodGroup:             request.bloodGroup,
          unitsRequired:          request.unitsRequired,
          recipientName:          recipientUser.name,
          recipientContactShared: contactShare.recipientContactShared,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Request accepted. Contact information has been shared with both parties.',
        contactShare: {
          donorContactShared: contactShare.donorContactShared,
          recipientContactShared: contactShare.recipientContactShared,
        },
      });
    } else if (response === 'DECLINED') {
      // Notify recipient that a donor declined (but others may still respond)
      await createNotification({
        userId: request.recipientId,
        title: 'Donor Response Update',
        message: `A donor has declined your blood request (${request.requestId}). Other eligible donors may still be available — we'll keep searching.`,
        type: 'BLOOD_REQUEST',
        relatedId: request._id,
        relatedModel: 'BloodRequest',
        clickUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/recipient/my-requests`,
        emailData: {
          _recipientNotif: true,
          requestId:       request.requestId,
          bloodGroup:      request.bloodGroup,
        },
      });
      res.status(200).json({ success: true, message: 'Request declined.' });
    }
  } catch (error) {
    next(error);
  }
};

// PUT /api/blood-requests/:id  (admin: approve, cancel, complete)
const updateBloodRequest = async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Blood request not found.' });

    const prevStatus = request.status;
    request.status = status || request.status;
    if (adminNotes) request.adminNotes = adminNotes;
    if (req.user) request.reviewedBy = req.user._id;

    // If marking as DONATION_COMPLETED
    if (status === 'DONATION_COMPLETED' && prevStatus !== 'DONATION_COMPLETED') {
      if (request.acceptedDonor) {
        const donor = await Donor.findById(request.acceptedDonor);
        if (donor) {
          // Update donation history
          donor.totalDonations += 1;
          donor.lastDonationDate = new Date();
          const isFemale = (await User.findById(donor.userId))?.gender === 'Female';
          const intervalDays = isFemale ? 120 : 90;
          donor.nextEligibleDonationDate = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);
          await donor.save();

          // Create donation record
          await DonationRecord.create({
            requestId: request._id,
            donorId: donor._id,
            recipientId: request.recipientId,
            bloodGroup: request.bloodGroup,
            units: request.unitsRequired,
            hospital: request.hospitalName,
            donationDate: new Date(),
            status: 'COMPLETED',
            markedBy: req.user._id,
          });

          const donationClientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
          // Notify donor
          await createNotification({
            userId: donor.userId,
            title: 'Donation Completed!',
            message: `Thank you for your donation at ${request.hospitalName}. Your donation record has been updated.`,
            type: 'DONATION_COMPLETED',
            relatedId: request._id,
            clickUrl: `${donationClientUrl}/donor/dashboard`,
            emailData: {
              bloodGroup:   request.bloodGroup,
              units:        request.unitsRequired,
              hospitalName: request.hospitalName,
              donationDate: new Date(),
            },
          });
        }
      }

      // Notify recipient
      await createNotification({
        userId: request.recipientId,
        title: 'Donation Completed',
        message: `Blood donation for your request (${request.requestId}) has been marked as completed.`,
        type: 'DONATION_COMPLETED',
        relatedId: request._id,
        clickUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/recipient/my-requests`,
        emailData: {
          _recipientNotif: true,
          requestId:       request.requestId,
          bloodGroup:      request.bloodGroup,
          units:           request.unitsRequired,
          hospitalName:    request.hospitalName,
        },
      });

      // Update recipient active requests
      await Recipient.findOneAndUpdate({ userId: request.recipientId }, { $inc: { activeRequests: -1 } });
    }

    await request.save();
    res.status(200).json({ success: true, message: 'Blood request updated.', request });
  } catch (error) {
    next(error);
  }
};

// GET /api/blood-requests/:id/responses  (admin view all responses)
const getRequestResponses = async (req, res, next) => {
  try {
    const responses = await DonorResponse.find({ requestId: req.params.id })
      .populate({ path: 'donorId', populate: { path: 'userId', select: 'name phone city' } });
    res.status(200).json({ success: true, responses });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/blood-requests/:id  (admin only)
const deleteBloodRequest = async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Blood request not found.' });
    }

    const requestId = request._id;

    // 1. Delete all DonorResponse records linked to this request
    await DonorResponse.deleteMany({ requestId });

    // 2. Delete all ContactShare records linked to this request
    await ContactShare.deleteMany({ requestId });

    // 3. Delete all Notifications whose relatedId points to this request
    await Notification.deleteMany({ relatedId: requestId, relatedModel: 'BloodRequest' });

    // 4. Decrement recipient's active request counter (if request was not already completed/cancelled)
    const activeStatuses = ['PENDING', 'SEARCHING', 'DONOR_ACCEPTED', 'CONTACT_SHARED'];
    if (activeStatuses.includes(request.status)) {
      await Recipient.findOneAndUpdate(
        { userId: request.recipientId },
        { $inc: { activeRequests: -1 } }
      );
    }

    // 5. Hard-delete the BloodRequest document itself
    // NOTE: DonationRecord history is preserved intentionally for audit trail.
    await BloodRequest.findByIdAndDelete(requestId);

    res.status(200).json({ success: true, message: 'Blood request deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBloodRequest,
  getBloodRequests,
  getBloodRequestById,
  respondToBloodRequest,
  updateBloodRequest,
  getRequestResponses,
  deleteBloodRequest,
};

