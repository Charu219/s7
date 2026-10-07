/**
 * HealthBridge - Full Data Flow Diagnostic Script
 * Run: node scripts/diagnose.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const BloodRequest = require('../models/BloodRequest');
const Donor = require('../models/Donor');
const User = require('../models/User');
const DonorResponse = require('../models/DonorResponse');
const Notification = require('../models/Notification');
const { isCompatible, BLOOD_COMPATIBILITY } = require('../services/eligibilityService');

async function diagnose() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('\n✅ Connected to MongoDB:', process.env.MONGODB_URI);

  // ─── 1. Blood Requests ────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════');
  console.log('  STEP 1: ALL BLOOD REQUESTS IN DATABASE');
  console.log('══════════════════════════════════════════════');
  const allRequests = await BloodRequest.find({})
    .populate('recipientId', 'name email role')
    .sort({ createdAt: -1 })
    .limit(10);

  if (allRequests.length === 0) {
    console.log('  ⚠️  NO blood requests found in database at all!');
    console.log('  → Recipient has not created any requests yet.');
  } else {
    allRequests.forEach((r, i) => {
      console.log(`\n  [${i + 1}] requestId: ${r.requestId}`);
      console.log(`      _id:        ${r._id}`);
      console.log(`      bloodGroup: ${r.bloodGroup}`);
      console.log(`      status:     ${r.status}`);
      console.log(`      urgency:    ${r.urgency}`);
      console.log(`      hospital:   ${r.hospitalName}`);
      console.log(`      recipient:  ${r.recipientId?.name} (${r.recipientId?.email})`);
      console.log(`      matchedDonors count: ${r.matchedDonors?.length || 0}`);
      console.log(`      notifiedDonors count: ${r.notifiedDonors?.length || 0}`);
      console.log(`      notifiedDonors IDs: ${(r.notifiedDonors || []).join(', ') || 'NONE'}`);
      console.log(`      acceptedDonor: ${r.acceptedDonor || 'none'}`);
      console.log(`      createdAt:  ${r.createdAt}`);
    });
  }

  // ─── 2. All Donors ────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════');
  console.log('  STEP 2: ALL DONORS IN DATABASE');
  console.log('══════════════════════════════════════════════');
  const allDonors = await Donor.find({})
    .populate('userId', 'name email isActive role');

  if (allDonors.length === 0) {
    console.log('  ⚠️  NO donors found!');
  } else {
    allDonors.forEach((d, i) => {
      console.log(`\n  [${i + 1}] Donor _id: ${d._id}`);
      console.log(`      User:        ${d.userId?.name} (${d.userId?.email})`);
      console.log(`      User _id:    ${d.userId?._id}`);
      console.log(`      bloodGroup:  ${d.bloodGroup}`);
      console.log(`      donorStatus: ${d.donorStatus}`);
      console.log(`      availability: ${d.availability}`);
      console.log(`      isActive (user): ${d.userId?.isActive}`);
      console.log(`      nextEligibleDonation: ${d.nextEligibleDonationDate || 'not set'}`);
    });
  }

  // ─── 3. Cross-check: Would matching find donors for each request? ─────────
  console.log('\n══════════════════════════════════════════════');
  console.log('  STEP 3: MATCHING SIMULATION');
  console.log('══════════════════════════════════════════════');

  // Find all ELIGIBLE donors
  const eligibleDonors = await Donor.find({
    donorStatus: 'ELIGIBLE',
    availability: true,
  }).populate('userId', 'name email isActive');

  console.log(`\n  Eligible + available donors: ${eligibleDonors.length}`);
  eligibleDonors.forEach((d) => {
    console.log(`    → ${d.userId?.name} | ${d.bloodGroup} | active: ${d.userId?.isActive}`);
  });

  if (allRequests.length > 0) {
    for (const req of allRequests.slice(0, 5)) {
      console.log(`\n  Request ${req.requestId} (${req.bloodGroup}):`);
      const now = new Date();
      const matched = eligibleDonors.filter((donor) => {
        if (!donor.userId || !donor.userId.isActive) return false;
        if (!isCompatible(donor.bloodGroup, req.bloodGroup)) return false;
        if (donor.nextEligibleDonationDate && donor.nextEligibleDonationDate > now) return false;
        return true;
      });
      if (matched.length > 0) {
        console.log(`    ✅ ${matched.length} matching donor(s):`);
        matched.forEach((d) => console.log(`      → ${d.userId?.name} (${d.bloodGroup})`));
      } else {
        console.log(`    ❌ No matching donors found!`);
        console.log(`    Compatibility for ${req.bloodGroup} requires donors: ${JSON.stringify(BLOOD_COMPATIBILITY[req.bloodGroup])}`);
        eligibleDonors.forEach((d) => {
          const compat = isCompatible(d.bloodGroup, req.bloodGroup);
          console.log(`      ${d.userId?.name}: bloodGroup=${d.bloodGroup}, compatible=${compat}`);
        });
      }
    }
  }

  // ─── 4. Simulate the GET /api/blood-requests query for each donor ─────────
  console.log('\n══════════════════════════════════════════════');
  console.log('  STEP 4: SIMULATE DONOR GET-REQUESTS QUERY');
  console.log('══════════════════════════════════════════════');

  for (const donor of allDonors) {
    console.log(`\n  Donor: ${donor.userId?.name} | bloodGroup: ${donor.bloodGroup} | Donor._id: ${donor._id}`);

    // Condition 1: notifiedDonors contains this donor
    const byNotification = await BloodRequest.find({ notifiedDonors: donor._id });
    console.log(`    [Condition 1] Requests with donor in notifiedDonors: ${byNotification.length}`);
    byNotification.forEach(r => console.log(`      → ${r.requestId} (${r.bloodGroup}, ${r.status})`));

    // Condition 2: exact blood group match + SEARCHING/PENDING
    const byBloodGroup = await BloodRequest.find({
      bloodGroup: donor.bloodGroup,
      status: { $in: ['SEARCHING', 'PENDING'] },
    });
    console.log(`    [Condition 2] SEARCHING/PENDING requests with exact bloodGroup=${donor.bloodGroup}: ${byBloodGroup.length}`);
    byBloodGroup.forEach(r => console.log(`      → ${r.requestId} (${r.bloodGroup}, ${r.status})`));

    // Combined $or query (what the API actually uses)
    const combined = await BloodRequest.find({
      $or: [
        { notifiedDonors: donor._id },
        { bloodGroup: donor.bloodGroup, status: { $in: ['SEARCHING', 'PENDING'] } },
      ],
    });
    console.log(`    [COMBINED] Total requests this donor would see: ${combined.length}`);

    if (combined.length === 0) {
      console.log(`    ⚠️  ROOT CAUSE: donor ${donor.userId?.name} sees 0 requests!`);
      // Check all SEARCHING/PENDING requests
      const allActive = await BloodRequest.find({ status: { $in: ['SEARCHING', 'PENDING'] } });
      if (allActive.length === 0) {
        console.log(`    → No SEARCHING/PENDING requests exist in DB at all`);
      } else {
        console.log(`    → There ARE ${allActive.length} active requests, but none match this donor:`);
        allActive.forEach(r => {
          const exactMatch = r.bloodGroup === donor.bloodGroup;
          const inNotified = (r.notifiedDonors || []).some(id => id.toString() === donor._id.toString());
          console.log(`      ${r.requestId}: bloodGroup=${r.bloodGroup}, exactMatch=${exactMatch}, inNotified=${inNotified}`);
        });
      }
    }
  }

  // ─── 5. DonorResponse records ─────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════');
  console.log('  STEP 5: DONOR RESPONSE RECORDS');
  console.log('══════════════════════════════════════════════');
  const responses = await DonorResponse.find({})
    .populate('donorId', 'bloodGroup')
    .populate('requestId', 'requestId bloodGroup status');

  if (responses.length === 0) {
    console.log('  No DonorResponse records found.');
  } else {
    responses.forEach((r, i) => {
      console.log(`  [${i+1}] ${r.requestId?.requestId} | donor bloodGroup: ${r.donorId?.bloodGroup} | response: ${r.response}`);
    });
  }

  // ─── 6. Recent notifications for donors ──────────────────────────────────
  console.log('\n══════════════════════════════════════════════');
  console.log('  STEP 6: RECENT BLOOD REQUEST NOTIFICATIONS');
  console.log('══════════════════════════════════════════════');
  const donorUserIds = allDonors.map(d => d.userId?._id).filter(Boolean);
  const notifs = await Notification.find({
    userId: { $in: donorUserIds },
    type: { $in: ['BLOOD_REQUEST', 'REQUEST_ACCEPTED', 'EMERGENCY'] },
  }).sort({ createdAt: -1 }).limit(10);

  if (notifs.length === 0) {
    console.log('  No blood request notifications for donors found.');
  } else {
    notifs.forEach((n, i) => {
      console.log(`  [${i+1}] userId: ${n.userId} | type: ${n.type} | relatedId: ${n.relatedId} | title: ${n.title}`);
    });
  }

  await mongoose.disconnect();
  console.log('\n══════════════════════════════════════════════');
  console.log('  DIAGNOSTIC COMPLETE');
  console.log('══════════════════════════════════════════════\n');
}

diagnose().catch((err) => {
  console.error('\n❌ Diagnostic failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
