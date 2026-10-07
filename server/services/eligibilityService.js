/**
 * HealthBridge Eligibility Service
 * 
 * Provides PRELIMINARY screening only.
 * Final eligibility must be confirmed by an authorized healthcare professional.
 * 
 * DISCLAIMER: This software does NOT provide medical diagnoses.
 * It performs preliminary screening based on configured criteria only.
 */

/**
 * Calculate BMI
 * @param {number} weightKg 
 * @param {number} heightCm 
 * @returns {number} BMI rounded to 2 decimals
 */
const calculateBMI = (weightKg, heightCm) => {
  if (!weightKg || !heightCm || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 100) / 100;
};

/**
 * Get BMI category label
 */
const getBMICategory = (bmi) => {
  if (!bmi) return 'Unknown';
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Healthy Range';
  if (bmi < 30) return 'Overweight';
  return 'Obesity';
};

/**
 * Calculate age from DOB
 */
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const today = new Date();
  const dob = new Date(dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
};

/**
 * Calculate days since last donation
 */
const daysSinceLastDonation = (lastDonationDate) => {
  if (!lastDonationDate) return null;
  const now = new Date();
  const last = new Date(lastDonationDate);
  return Math.floor((now - last) / (1000 * 60 * 60 * 24));
};

/**
 * Perform preliminary eligibility screening
 * Returns: { status, healthScore, flags, statusReason, bmi, bmiCategory }
 */
const performEligibilityScreening = ({
  age,
  gender,
  weight,
  height,
  hemoglobin,
  systolicBP,
  diastolicBP,
  pulse,
  temperature,
  fastingBloodSugar,
  lastDonationDate,
  medicalResponses = {},
}) => {
  const flags = [];
  const warnings = [];
  let notEligible = false;
  let holdRequired = false;
  let medicalReviewRequired = false;

  // ── BMI ──────────────────────────────────────────────────────────────
  const bmi = calculateBMI(weight, height);
  const bmiCategory = getBMICategory(bmi);
  // BMI is monitoring indicator ONLY – does not affect eligibility

  // ── AGE ──────────────────────────────────────────────────────────────
  if (age !== null && age !== undefined) {
    if (age < 18) {
      flags.push('Age below 18 – Not eligible for donation');
      notEligible = true;
    } else if (age > 65) {
      flags.push('Age above 65 – Medical review recommended');
      medicalReviewRequired = true;
    }
  }

  // ── WEIGHT ───────────────────────────────────────────────────────────
  if (weight !== null && weight !== undefined) {
    if (weight < 45) {
      flags.push('Weight below 45 kg – Not eligible for donation');
      notEligible = true;
    } else if (weight < 50) {
      flags.push('Weight between 45–50 kg – Confirm with blood bank (450 mL collection may require 50 kg+)');
      warnings.push('Weight between 45–50 kg');
    }
  }

  // ── HEMOGLOBIN ───────────────────────────────────────────────────────
  if (hemoglobin !== null && hemoglobin !== undefined) {
    const isFemale = gender === 'Female';
    const hbThreshold = isFemale ? 12.5 : 13.5;
    if (hemoglobin < hbThreshold) {
      flags.push(`Hemoglobin ${hemoglobin} g/dL is below the ${isFemale ? 'female' : 'male'} threshold (${hbThreshold} g/dL) – Hold / Medical Review`);
      holdRequired = true;
    }
  }

  // ── BLOOD PRESSURE ───────────────────────────────────────────────────
  if (systolicBP !== null && systolicBP !== undefined) {
    if (systolicBP < 100 || systolicBP > 140) {
      flags.push(`Systolic BP ${systolicBP} mmHg is outside screening range (100–140 mmHg) – Medical Review`);
      medicalReviewRequired = true;
    }
  }
  if (diastolicBP !== null && diastolicBP !== undefined) {
    if (diastolicBP < 60 || diastolicBP > 90) {
      flags.push(`Diastolic BP ${diastolicBP} mmHg is outside screening range (60–90 mmHg) – Medical Review`);
      medicalReviewRequired = true;
    }
  }

  // ── PULSE ────────────────────────────────────────────────────────────
  if (pulse !== null && pulse !== undefined) {
    if (pulse < 60 || pulse > 100) {
      flags.push(`Pulse ${pulse} bpm is outside screening range (60–100 bpm) – Medical Review`);
      medicalReviewRequired = true;
    }
  }

  // ── TEMPERATURE ──────────────────────────────────────────────────────
  if (temperature !== null && temperature !== undefined) {
    if (temperature > 37.6) {
      flags.push(`Temperature ${temperature}°C indicates possible fever – Hold`);
      holdRequired = true;
    }
  }

  // ── FASTING BLOOD SUGAR ──────────────────────────────────────────────
  if (fastingBloodSugar !== null && fastingBloodSugar !== undefined) {
    if (fastingBloodSugar >= 126) {
      flags.push(`Fasting blood sugar ${fastingBloodSugar} mg/dL requires medical evaluation`);
      medicalReviewRequired = true;
    } else if (fastingBloodSugar >= 100) {
      flags.push(`Fasting blood sugar ${fastingBloodSugar} mg/dL is elevated – Medical Review recommended`);
      warnings.push('Elevated blood sugar');
    }
  }

  // ── DONATION INTERVAL ────────────────────────────────────────────────
  if (lastDonationDate) {
    const days = daysSinceLastDonation(lastDonationDate);
    const isFemale = gender === 'Female';
    const minDays = isFemale ? 120 : 90;
    if (days !== null && days < minDays) {
      flags.push(`Only ${days} days since last donation (minimum ${minDays} days for ${isFemale ? 'females' : 'males'}) – Not currently eligible`);
      holdRequired = true;
    }
  }

  // ── MEDICAL HISTORY ──────────────────────────────────────────────────
  const mr = medicalResponses || {};
  if (mr.heartConditions) {
    flags.push('Heart condition reported – Medical Review required');
    medicalReviewRequired = true;
  }
  if (mr.kidneyConditions) {
    flags.push('Kidney condition reported – Medical Review required');
    medicalReviewRequired = true;
  }
  if (mr.recentSurgery) {
    flags.push('Recent surgery reported – Hold / Medical Review required');
    holdRequired = true;
  }
  if (mr.recentTattoo) {
    flags.push('Recent tattoo reported – Hold (risk of infection)');
    holdRequired = true;
  }
  if (mr.recentPiercing) {
    flags.push('Recent piercing reported – Hold (risk of infection)');
    holdRequired = true;
  }
  if (mr.currentIllness && mr.currentIllness.trim()) {
    flags.push(`Current illness reported: "${mr.currentIllness}" – Hold`);
    holdRequired = true;
  }
  if (mr.currentMedications && mr.currentMedications.trim()) {
    warnings.push(`Currently on medications: "${mr.currentMedications}" – Requires professional review`);
    medicalReviewRequired = true;
  }

  // ── HEALTH SCORE (monitoring indicator only) ──────────────────────────
  let healthScore = 100;
  if (bmi && (bmi < 18.5 || bmi >= 30)) healthScore -= 5;
  if (flags.length > 0) healthScore -= flags.length * 10;
  if (warnings.length > 0) healthScore -= warnings.length * 3;
  healthScore = Math.max(0, Math.min(100, healthScore));

  // ── DETERMINE STATUS ─────────────────────────────────────────────────
  let status;
  let statusReason;

  if (notEligible) {
    status = 'NOT_ELIGIBLE';
    statusReason = flags.filter(f => f.includes('Not eligible')).join('; ');
  } else if (medicalReviewRequired && holdRequired) {
    // Both flags – use Medical Review (more informative)
    status = 'MEDICAL_REVIEW';
    statusReason = 'Multiple concerns require professional medical assessment.';
  } else if (medicalReviewRequired) {
    status = 'MEDICAL_REVIEW';
    statusReason = 'One or more parameters require medical professional review.';
  } else if (holdRequired) {
    status = 'HOLD';
    statusReason = 'Temporary hold due to health parameters. Follow-up assessment required.';
  } else {
    status = 'ELIGIBLE';
    statusReason = 'All preliminary screening criteria met. Subject to authorized healthcare professional confirmation.';
  }

  return {
    status,
    healthScore,
    flags,
    warnings,
    statusReason,
    bmi,
    bmiCategory,
  };
};

/**
 * Blood group compatibility map
 * key = recipient blood group, value = compatible donor blood groups
 */
const BLOOD_COMPATIBILITY = {
  'A+':  ['A+', 'A-', 'O+', 'O-'],
  'A-':  ['A-', 'O-'],
  'B+':  ['B+', 'B-', 'O+', 'O-'],
  'B-':  ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+':  ['O+', 'O-'],
  'O-':  ['O-'],
};

/**
 * Check if donor blood group is compatible with recipient
 */
const isCompatible = (donorBloodGroup, recipientBloodGroup) => {
  const compatible = BLOOD_COMPATIBILITY[recipientBloodGroup] || [];
  return compatible.includes(donorBloodGroup);
};

module.exports = {
  calculateBMI,
  getBMICategory,
  calculateAge,
  daysSinceLastDonation,
  performEligibilityScreening,
  isCompatible,
  BLOOD_COMPATIBILITY,
};
