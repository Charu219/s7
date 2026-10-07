const User = require('../models/User');
const Donor = require('../models/Donor');
const Recipient = require('../models/Recipient');
const BloodRequest = require('../models/BloodRequest');
const DonationRecord = require('../models/DonationRecord');
const Appointment = require('../models/Appointment');
const HealthReport = require('../models/HealthReport');

// GET /api/admin/stats  (public – for landing page counters)
const getPublicStats = async (req, res, next) => {
  try {
    const ACTIVE_DONOR = { isDeleted: { $ne: true } };
    const [totalDonors, eligibleDonors, totalRequests, completedDonations] = await Promise.all([
      Donor.countDocuments(ACTIVE_DONOR),
      Donor.countDocuments({ ...ACTIVE_DONOR, donorStatus: 'ELIGIBLE' }),
      BloodRequest.countDocuments(),
      DonationRecord.countDocuments({ status: 'COMPLETED' }),
    ]);
    res.status(200).json({ success: true, stats: { totalDonors, eligibleDonors, totalRequests, completedDonations } });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/analytics  (admin only)
const getAnalytics = async (req, res, next) => {
  try {
    const ACTIVE_DONOR = { isDeleted: { $ne: true } };
    const [
      totalDonors, eligibleDonors, holdDonors, medReviewDonors, notEligibleDonors,
      totalRecipients, activeRequests, donorAcceptedRequests, completedDonations,
      monthlyChecksDue, appointmentsPending,
    ] = await Promise.all([
      Donor.countDocuments(ACTIVE_DONOR),
      Donor.countDocuments({ ...ACTIVE_DONOR, donorStatus: 'ELIGIBLE' }),
      Donor.countDocuments({ ...ACTIVE_DONOR, donorStatus: 'HOLD' }),
      Donor.countDocuments({ ...ACTIVE_DONOR, donorStatus: 'MEDICAL_REVIEW' }),
      Donor.countDocuments({ ...ACTIVE_DONOR, donorStatus: 'NOT_ELIGIBLE' }),
      Recipient.countDocuments(),
      BloodRequest.countDocuments({ status: { $in: ['PENDING', 'SEARCHING'] } }),
      BloodRequest.countDocuments({ status: 'DONOR_ACCEPTED' }),
      DonationRecord.countDocuments({ status: 'COMPLETED' }),
      Donor.countDocuments({
        ...ACTIVE_DONOR,
        donorStatus: 'ELIGIBLE',
        nextHealthCheck: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      }),
      Appointment.countDocuments({ status: { $in: ['PENDING', 'CONFIRMED'] } }),
    ]);

    // Blood group demand (last 90 days)
    const bloodGroupDemand = await BloodRequest.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: '$bloodGroup', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Monthly donations (last 6 months)
    const monthlyDonations = await DonationRecord.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: { year: { $year: '$donationDate' }, month: { $month: '$donationDate' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Donor growth (last 6 months) — only active users
    const donorGrowth = await User.aggregate([
      { $match: { role: 'DONOR', isActive: true, createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.status(200).json({
      success: true,
      overview: {
        totalDonors, eligibleDonors, holdDonors, medReviewDonors, notEligibleDonors,
        totalRecipients, activeRequests, donorAcceptedRequests, completedDonations,
        monthlyChecksDue, appointmentsPending,
        pendingDonors: await Donor.countDocuments({ ...ACTIVE_DONOR, donorStatus: 'PENDING' }),
      },
      bloodGroupDemand,
      monthlyDonations,
      donorGrowth,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/recipients
const getAllRecipients = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const filter = { role: 'RECIPIENT' };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-passwordHash')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    // Attach recipient stats
    const recipientIds = users.map((u) => u._id);
    const recipientStats = await Recipient.find({ userId: { $in: recipientIds } });
    const statsMap = Object.fromEntries(recipientStats.map((r) => [r.userId.toString(), r]));

    const result = users.map((u) => ({
      ...u.toJSON(),
      recipientStats: statsMap[u._id.toString()] || {},
    }));

    res.status(200).json({ success: true, total, recipients: result });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/health-monitoring  – donors due/overdue for health checks
const getHealthMonitoring = async (req, res, next) => {
  try {
    const now = new Date();
    const oneWeekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const ACTIVE_DONOR = { isDeleted: { $ne: true } };

    const [dueDonors, overdueDonors, holdDonors, medReviewDonors] = await Promise.all([
      Donor.find({ ...ACTIVE_DONOR, donorStatus: 'ELIGIBLE', nextHealthCheck: { $lte: oneWeekAhead, $gte: now } })
        .populate('userId', 'name email phone')
        .sort({ nextHealthCheck: 1 })
        .limit(50),
      Donor.find({ ...ACTIVE_DONOR, donorStatus: 'ELIGIBLE', nextHealthCheck: { $lt: now } })
        .populate('userId', 'name email phone')
        .sort({ nextHealthCheck: 1 })
        .limit(50),
      Donor.find({ ...ACTIVE_DONOR, donorStatus: 'HOLD' })
        .populate('userId', 'name email phone')
        .limit(50),
      Donor.find({ ...ACTIVE_DONOR, donorStatus: 'MEDICAL_REVIEW' })
        .populate('userId', 'name email phone')
        .limit(50),
    ]);

    // Strip any orphaned records whose userId didn't populate
    const clean = (arr) => arr.filter((d) => d.userId != null);

    res.status(200).json({
      success: true,
      dueDonors:       clean(dueDonors),
      overdueDonors:   clean(overdueDonors),
      holdDonors:      clean(holdDonors),
      medReviewDonors: clean(medReviewDonors),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPublicStats, getAnalytics, getAllRecipients, getHealthMonitoring };
