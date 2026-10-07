/**
 * HealthBridge Seed Script
 * Creates demo data for development.
 * 
 * Run: npm run seed
 * 
 * Demo credentials (DEVELOPMENT ONLY):
 *   Admin:     admin@healthbridge.com / Admin@1234
 *   Donor 1:   asha@demo.com / Demo@1234  (ELIGIBLE)
 *   Donor 2:   rahul@demo.com / Demo@1234 (HOLD)
 *   Recipient: priya@demo.com / Demo@1234
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Donor = require('../models/Donor');
const Recipient = require('../models/Recipient');
const HealthReport = require('../models/HealthReport');
const Doctor = require('../models/Doctor');
const BloodRequest = require('../models/BloodRequest');
const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const DonationRecord = require('../models/DonationRecord');

const connectDB = require('../config/db');

const seed = async () => {
  await connectDB();
  console.log('🌱 Starting seed...');

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Donor.deleteMany({}),
    Recipient.deleteMany({}),
    HealthReport.deleteMany({}),
    Doctor.deleteMany({}),
    BloodRequest.deleteMany({}),
    Appointment.deleteMany({}),
    Notification.deleteMany({}),
    DonationRecord.deleteMany({}),
  ]);
  console.log('✅ Cleared existing data');

  // ── ADMIN ─────────────────────────────────────────────────────────────────
  const adminUser = new User({
    name: 'HealthBridge Admin',
    email: 'admin@healthbridge.com',
    passwordHash: 'Admin@1234',
    role: 'ADMIN',
    phone: '+91-9800000000',
    gender: 'Male',
    isActive: true,
  });
  await adminUser.save();
  console.log('✅ Admin created');

  // ── DOCTORS ───────────────────────────────────────────────────────────────
  const doctors = await Doctor.insertMany([
    {
      name: 'Dr. Sunita Sharma',
      specialization: 'Hematology',
      hospital: 'City Blood Center',
      phone: '+91-9811111111',
      email: 'sunita@cityblood.com',
      availableDays: ['Monday', 'Wednesday', 'Friday'],
      availableTime: '10:00 AM – 4:00 PM',
      createdBy: adminUser._id,
    },
    {
      name: 'Dr. Ramesh Patel',
      specialization: 'Internal Medicine',
      hospital: 'Apollo Hospital',
      phone: '+91-9822222222',
      email: 'ramesh@apollo.com',
      availableDays: ['Tuesday', 'Thursday', 'Saturday'],
      availableTime: '9:00 AM – 1:00 PM',
      createdBy: adminUser._id,
    },
  ]);
  console.log('✅ Doctors created');

  // ── DONOR 1 – Asha Kumar (ELIGIBLE) ─────────────────────────────────────
  const ashaUser = new User({
    name: 'Asha Kumar',
    email: 'asha@demo.com',
    passwordHash: 'Demo@1234',
    role: 'DONOR',
    phone: '+91-9833333333',
    dateOfBirth: new Date('1992-05-15'),
    gender: 'Female',
    address: '14, Rose Garden, Sector 5',
    city: 'Mumbai',
    emergencyContact: '+91-9877777777',
    isActive: true,
  });
  await ashaUser.save();

  const ashaDonor = await Donor.create({
    userId: ashaUser._id,
    bloodGroup: 'O+',
    initialQuestionnaireCompleted: true,
    donorStatus: 'ELIGIBLE',
    healthScore: 88,
    lastHealthCheck: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    nextHealthCheck: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    lastDonationDate: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000),
    totalDonations: 3,
    availability: true,
    preferredLocation: 'City Blood Center',
    preferredDays: ['Saturday', 'Sunday'],
    preferredTime: 'Morning',
  });

  await HealthReport.create({
    donorId: ashaDonor._id,
    reportType: 'MONTHLY',
    reportDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    age: 33,
    height: 162,
    weight: 58,
    bmi: 22.1,
    systolicBP: 118,
    diastolicBP: 76,
    hemoglobin: 13.2,
    pulse: 72,
    temperature: 36.8,
    fastingBloodSugar: 88,
    healthScore: 88,
    calculatedStatus: 'ELIGIBLE',
    statusReason: 'All preliminary screening criteria met.',
    reviewedBy: adminUser._id,
    reviewedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  });
  console.log('✅ Donor Asha (ELIGIBLE) created');

  // ── DONOR 2 – Rahul Mehta (HOLD) ────────────────────────────────────────
  const rahulUser = new User({
    name: 'Rahul Mehta',
    email: 'rahul@demo.com',
    passwordHash: 'Demo@1234',
    role: 'DONOR',
    phone: '+91-9844444444',
    dateOfBirth: new Date('1988-11-20'),
    gender: 'Male',
    address: '7, Green Park Avenue',
    city: 'Delhi',
    emergencyContact: '+91-9866666666',
    isActive: true,
  });
  await rahulUser.save();

  const rahulDonor = await Donor.create({
    userId: rahulUser._id,
    bloodGroup: 'B+',
    initialQuestionnaireCompleted: true,
    donorStatus: 'HOLD',
    statusReason: 'Hemoglobin below male threshold (13.5 g/dL). Doctor appointment scheduled.',
    healthScore: 65,
    lastHealthCheck: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    nextHealthCheck: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    totalDonations: 1,
    availability: false,
    preferredLocation: 'Apollo Hospital',
  });

  await HealthReport.create({
    donorId: rahulDonor._id,
    reportType: 'MONTHLY',
    reportDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    age: 37,
    height: 175,
    weight: 70,
    bmi: 22.9,
    systolicBP: 128,
    diastolicBP: 84,
    hemoglobin: 12.8,
    pulse: 78,
    temperature: 36.9,
    fastingBloodSugar: 95,
    healthScore: 65,
    calculatedStatus: 'HOLD',
    statusReason: 'Hemoglobin 12.8 g/dL is below the male threshold (13.5 g/dL) – Hold / Medical Review',
    reviewedBy: adminUser._id,
    reviewedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  });

  // Appointment for Rahul
  await Appointment.create({
    donorId: rahulDonor._id,
    doctorId: doctors[0]._id,
    adminId: adminUser._id,
    type: 'DOCTOR_CONSULTATION',
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    time: '11:00 AM',
    hospital: 'City Blood Center',
    reason: 'Low Hemoglobin – Follow-up',
    status: 'CONFIRMED',
  });
  console.log('✅ Donor Rahul (HOLD) created');

  // ── DONOR 3 – Meera Nair (MEDICAL_REVIEW) ───────────────────────────────
  const meeraUser = new User({
    name: 'Meera Nair',
    email: 'meera@demo.com',
    passwordHash: 'Demo@1234',
    role: 'DONOR',
    phone: '+91-9855555555',
    dateOfBirth: new Date('1975-03-08'),
    gender: 'Female',
    address: '21, Palm Street',
    city: 'Chennai',
    emergencyContact: '+91-9888888888',
    isActive: true,
  });
  await meeraUser.save();

  const meeraDonor = await Donor.create({
    userId: meeraUser._id,
    bloodGroup: 'AB+',
    initialQuestionnaireCompleted: true,
    donorStatus: 'MEDICAL_REVIEW',
    statusReason: 'BP outside screening range. Medical review required.',
    healthScore: 55,
    lastHealthCheck: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    totalDonations: 0,
    availability: false,
  });
  console.log('✅ Donor Meera (MEDICAL_REVIEW) created');

  // ── RECIPIENT ─────────────────────────────────────────────────────────────
  const priyaUser = new User({
    name: 'Priya Verma',
    email: 'priya@demo.com',
    passwordHash: 'Demo@1234',
    role: 'RECIPIENT',
    phone: '+91-9899999999',
    dateOfBirth: new Date('1990-07-22'),
    gender: 'Female',
    address: '3, Lotus Lane',
    city: 'Bangalore',
    emergencyContact: '+91-9800001111',
    isActive: true,
  });
  await priyaUser.save();
  await Recipient.create({ userId: priyaUser._id, totalRequests: 1 });

  // Blood request from Priya
  await BloodRequest.create({
    recipientId: priyaUser._id,
    patientName: 'Ravi Verma',
    patientAge: 58,
    gender: 'Male',
    bloodGroup: 'O+',
    unitsRequired: 2,
    urgency: 'URGENT',
    requiredDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    hospitalName: 'Manipal Hospital',
    hospitalLocation: 'Bangalore, Karnataka',
    hospitalContact: '+91-8022222222',
    doctorName: 'Dr. Arun Kumar',
    reason: 'Scheduled surgery',
    status: 'SEARCHING',
    matchedDonors: [ashaDonor._id],
    notifiedDonors: [ashaDonor._id],
  });
  console.log('✅ Recipient Priya and blood request created');

  // Notifications
  await Notification.insertMany([
    {
      userId: ashaUser._id,
      title: '⚠️ URGENT – O+ Blood Needed',
      message: 'A patient at Manipal Hospital requires 2 units of O+ blood. Please check your Blood Requests page.',
      type: 'BLOOD_REQUEST',
      isRead: false,
    },
    {
      userId: rahulUser._id,
      title: 'Appointment Confirmed',
      message: 'Your doctor consultation at City Blood Center is confirmed for 3 days from now at 11:00 AM.',
      type: 'APPOINTMENT',
      isRead: false,
    },
  ]);

  console.log('\n🎉 Seed completed successfully!\n');
  console.log('Demo accounts (DEVELOPMENT ONLY):');
  console.log('  Admin:     admin@healthbridge.com / Admin@1234');
  console.log('  Donor 1:   asha@demo.com / Demo@1234  (ELIGIBLE)');
  console.log('  Donor 2:   rahul@demo.com / Demo@1234 (HOLD)');
  console.log('  Donor 3:   meera@demo.com / Demo@1234 (MEDICAL_REVIEW)');
  console.log('  Recipient: priya@demo.com / Demo@1234\n');

  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
