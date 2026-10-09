require('dotenv').config();
const mongoose = require('mongoose');
const Donor = require('../models/Donor');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const result = await Donor.updateMany(
    { initialQuestionnaireCompleted: true, donorStatus: 'PENDING', isDeleted: { $ne: true } },
    { $set: { donorStatus: 'ELIGIBLE', statusReason: 'Auto-approved after questionnaire completion.', statusChangedAt: new Date() } }
  );
  console.log('Updated', result.modifiedCount, 'donor(s) from PENDING to ELIGIBLE');

  const pending = await Donor.countDocuments({ donorStatus: 'PENDING', isDeleted: { $ne: true } });
  console.log('Donors still PENDING (questionnaire not done yet):', pending);

  const eligible = await Donor.countDocuments({ donorStatus: 'ELIGIBLE', isDeleted: { $ne: true } });
  console.log('Total ELIGIBLE donors now:', eligible);

  await mongoose.disconnect();
  process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
