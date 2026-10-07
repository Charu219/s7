/**
 * HealthBridge — Orphaned Donor Cleanup Script
 *
 * Finds and soft-deletes donor records whose linked User account either:
 *   a) No longer exists (true orphan — User was hard-deleted)
 *   b) Has isActive = false (user was deactivated but donor was not soft-deleted)
 *
 * SAFE: does NOT touch any HealthReport, DonationRecord, BloodRequest, or Appointment data.
 * Run ONCE after deploying the isDeleted fix.
 *
 * Usage:
 *   cd server
 *   node scripts/cleanup_orphaned_donors.js
 */

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');

const Donor = require('../models/Donor');
const User  = require('../models/User');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB:', process.env.MONGODB_URI);

  // 1. Find all donor records that are NOT already soft-deleted
  const donors = await Donor.find({ isDeleted: { $ne: true } }).lean();
  console.log(`\nTotal active (not yet soft-deleted) donor records: ${donors.length}`);

  let orphaned = 0;
  let deactivated = 0;
  let clean = 0;

  for (const donor of donors) {
    const user = await User.findById(donor.userId).select('isActive').lean();

    if (!user) {
      // True orphan — User document deleted
      console.log(`  ⚠️  Orphan (no User): donor._id=${donor._id}`);
      await Donor.findByIdAndUpdate(donor._id, {
        isDeleted:    true,
        deletedAt:    new Date(),
        donorStatus:  'NOT_ELIGIBLE',
        availability: false,
      });
      orphaned++;
    } else if (!user.isActive) {
      // Deactivated user without corresponding isDeleted flag on donor
      console.log(`  ⚠️  Deactivated user not marked deleted: donor._id=${donor._id}`);
      await Donor.findByIdAndUpdate(donor._id, {
        isDeleted:    true,
        deletedAt:    new Date(),
        donorStatus:  'NOT_ELIGIBLE',
        availability: false,
      });
      deactivated++;
    } else {
      clean++;
    }
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(`✅ Clean (active) donors:              ${clean}`);
  console.log(`🗑️  Orphaned donors soft-deleted:       ${orphaned}`);
  console.log(`🗑️  Deactivated donors soft-deleted:    ${deactivated}`);
  console.log(`   Total soft-deleted in this run:     ${orphaned + deactivated}`);
  console.log('─────────────────────────────────────────────');
  console.log('\nDone. No health reports or donation records were modified.');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Script failed:', err.message);
  process.exit(1);
});
