/**
 * HealthBridge - Quick Query Verification Script
 * Tests the FIXED compatibility-based query for each donor
 */
require('dotenv').config();
const mongoose = require('mongoose');
const BloodRequest = require('../models/BloodRequest');
const User = require('../models/User');
const Donor = require('../models/Donor');
const { BLOOD_COMPATIBILITY } = require('../services/eligibilityService');

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('\n✅ Connected:', process.env.MONGODB_URI);
  console.log('\n══════ FIXED QUERY VERIFICATION ══════\n');

  const allDonors = await Donor.find({}).populate('userId', 'name email isActive');

  for (const donor of allDonors) {
    // Get compatible recipient blood groups (same logic as fixed controller)
    const compatibleRecipientGroups = Object.keys(BLOOD_COMPATIBILITY).filter(
      (rg) => BLOOD_COMPATIBILITY[rg].includes(donor.bloodGroup)
    );

    // Run the fixed $or query
    const results = await BloodRequest.find({
      $or: [
        { notifiedDonors: donor._id },
        {
          bloodGroup: { $in: compatibleRecipientGroups },
          status: { $in: ['SEARCHING', 'PENDING'] },
        },
      ],
    }).select('requestId bloodGroup status');

    console.log(`Donor: ${donor.userId?.name} (${donor.bloodGroup}) — donorStatus: ${donor.donorStatus}`);
    console.log(`  Compatible recipient groups: ${compatibleRecipientGroups.join(', ')}`);
    console.log(`  Requests visible: ${results.length}`);
    results.forEach(r => console.log(`    → ${r.requestId} | ${r.bloodGroup} | ${r.status}`));
    console.log();
  }

  await mongoose.disconnect();
  console.log('══════ DONE ══════\n');
}

verify().catch(err => { console.error(err.message); process.exit(1); });
