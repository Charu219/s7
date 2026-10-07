const Donor = require('../models/Donor');
const User = require('../models/User');
const { isCompatible } = require('./eligibilityService');

/**
 * Find eligible donors matching a blood request.
 * Criteria:
 *  1. Blood group compatibility
 *  2. donorStatus = ELIGIBLE
 *  3. availability = true
 *  4. isDeleted != true  (donor not soft-deleted)
 *  5. userId.isActive = true  (user account not deactivated)
 *  6. Donation interval satisfied (nextEligibleDonationDate)
 */
const findEligibleDonors = async (bloodGroup) => {
  try {
    // Exclude soft-deleted donors at the DB level
    const eligibleDonors = await Donor.find({
      donorStatus:  'ELIGIBLE',
      availability: true,
      isDeleted:    { $ne: true },
    }).populate('userId', 'name email phone city gender dateOfBirth isActive');

    // Filter: user must be active + blood group compatible + donation interval satisfied
    const now = new Date();
    const matched = eligibleDonors.filter((donor) => {
      // User must exist and be active (handles orphaned donors)
      if (!donor.userId || !donor.userId.isActive) return false;
      // Blood group compatible
      if (!isCompatible(donor.bloodGroup, bloodGroup)) return false;
      // Donation interval
      if (donor.nextEligibleDonationDate && donor.nextEligibleDonationDate > now) return false;
      return true;
    });

    return matched;
  } catch (error) {
    console.error('Matching service error:', error.message);
    return [];
  }
};

module.exports = { findEligibleDonors };

