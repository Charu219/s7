import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { submitQuestionnaire } from '../../api/donors';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

const schema = z.object({
  height: z.coerce.number().min(50).max(300),
  weight: z.coerce.number().min(20).max(300),
  currentIllness: z.string().optional(),
  diabetes: z.boolean().optional(),
  heartConditions: z.boolean().optional(),
  kidneyConditions: z.boolean().optional(),
  currentMedications: z.string().optional(),
  recentSurgery: z.boolean().optional(),
  recentDentalProcedure: z.boolean().optional(),
  recentTattoo: z.boolean().optional(),
  recentPiercing: z.boolean().optional(),
  recentVaccination: z.boolean().optional(),
  smoking: z.enum(['Never', 'Occasionally', 'Regularly', '']).optional(),
  alcoholConsumption: z.enum(['Never', 'Occasionally', 'Regularly', '']).optional(),
  previousBloodDonation: z.boolean().optional(),
  numberOfPreviousDonations: z.coerce.number().min(0).optional(),
  otherMedicalConditions: z.string().optional(),
});

const STEPS = [
  { title: 'Body Measurements', subtitle: 'Your current physical stats' },
  { title: 'Medical History', subtitle: 'Existing conditions & medications' },
  { title: 'Recent Activities', subtitle: 'Procedures & lifestyle factors' },
  { title: 'Donation History', subtitle: 'Previous blood donation experience' },
];

function CheckboxField({ label, desc, id, register: reg }) {
  return (
    <label htmlFor={id} style={{
      display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
      padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)',
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      cursor: 'pointer', transition: 'all 0.2s',
    }}>
      <input type="checkbox" id={id} {...reg} style={{ marginTop: '2px', accentColor: 'var(--primary-500)' }} />
      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{label}</div>
        {desc && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{desc}</div>}
      </div>
    </label>
  );
}

export default function QuestionnairePage() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const { refreshDonor } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, trigger, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      diabetes: false, heartConditions: false, kidneyConditions: false,
      recentSurgery: false, recentDentalProcedure: false,
      recentTattoo: false, recentPiercing: false, recentVaccination: false,
      previousBloodDonation: false, numberOfPreviousDonations: 0,
      smoking: 'Never', alcoholConsumption: 'Never',
    },
  });

  const prevDonation = watch('previousBloodDonation');

  const stepFields = [
    ['height', 'weight'],
    ['currentIllness', 'diabetes', 'heartConditions', 'kidneyConditions', 'currentMedications', 'otherMedicalConditions'],
    ['recentSurgery', 'recentDentalProcedure', 'recentTattoo', 'recentPiercing', 'recentVaccination', 'smoking', 'alcoholConsumption'],
    ['previousBloodDonation', 'numberOfPreviousDonations'],
  ];

  const next = async () => {
    const valid = await trigger(stepFields[step]);
    if (valid && step < STEPS.length - 1) setStep((s) => s + 1);
  };

  const onSubmit = async (data) => {
    try {
      await submitQuestionnaire(data);
      await refreshDonor();
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed. Please try again.');
    }
  };

  if (submitted) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ textAlign: 'center', maxWidth: '400px' }}
        >
          <div style={{
            width: '5rem', height: '5rem', background: 'rgba(16,185,129,0.15)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem', color: 'var(--accent-400)',
          }}>
            <CheckCircle size={40} />
          </div>
          <h2 style={{ marginBottom: '0.75rem' }}>Questionnaire Submitted!</h2>
          <p style={{ marginBottom: '2rem' }}>
            Our medical team will review your health data and update your donor status within 24 hours.
          </p>
          <Button variant="primary" onClick={() => navigate('/donor/dashboard')}>
            Go to Dashboard
          </Button>
        </motion.div>
      </div>
    );
  }

  const progress = ((step) / STEPS.length) * 100;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Health Questionnaire</h1>
        <p className="page-subtitle">Complete this one-time form to determine your donor eligibility</p>
      </div>

      <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
        <AlertCircle size={16} style={{ flexShrink: 0 }} />
        All information is kept strictly confidential and used only for medical screening purposes.
      </div>

      {/* Progress */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Step {step + 1} of {STEPS.length}: {STEPS[step].title}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{Math.round(((step + 1) / STEPS.length) * 100)}% complete</span>
        </div>
        <div className="progress-bar">
          <motion.div
            className="progress-fill"
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      <Card style={{ maxWidth: '660px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <AnimatePresence mode="wait">
            {/* ── Step 0: Measurements ── */}
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h3 style={{ marginBottom: '1.25rem' }}>{STEPS[0].subtitle}</h3>
                <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <Input label="Height (cm)" type="number" placeholder="170" error={errors.height?.message} {...register('height')} />
                  <Input label="Weight (kg)" type="number" placeholder="65" error={errors.weight?.message} {...register('weight')} />
                </div>
              </motion.div>
            )}

            {/* ── Step 1: Medical History ── */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <h3 style={{ marginBottom: '0.25rem' }}>{STEPS[1].subtitle}</h3>
                <CheckboxField id="diabetes" label="Diabetes" desc="Type 1 or Type 2" register={register('diabetes')} />
                <CheckboxField id="heartConditions" label="Heart Conditions" desc="Any cardiovascular issues" register={register('heartConditions')} />
                <CheckboxField id="kidneyConditions" label="Kidney Conditions" desc="Kidney disease or failure" register={register('kidneyConditions')} />
                <Input label="Current Medications" placeholder="List any medications you're currently taking" {...register('currentMedications')} />
                <Input label="Current Illness" placeholder="Any illness you currently have?" {...register('currentIllness')} />
                <Input label="Other Medical Conditions" placeholder="Any other relevant conditions" {...register('otherMedicalConditions')} />
              </motion.div>
            )}

            {/* ── Step 2: Recent Activities ── */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <h3 style={{ marginBottom: '0.25rem' }}>{STEPS[2].subtitle}</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>In the past 6 months, have you had any of the following?</p>
                <CheckboxField id="recentSurgery" label="Surgery" register={register('recentSurgery')} />
                <CheckboxField id="recentDentalProcedure" label="Dental Procedure" register={register('recentDentalProcedure')} />
                <CheckboxField id="recentTattoo" label="Tattoo" register={register('recentTattoo')} />
                <CheckboxField id="recentPiercing" label="Piercing" register={register('recentPiercing')} />
                <CheckboxField id="recentVaccination" label="Vaccination" register={register('recentVaccination')} />
                <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                  <Select label="Smoking" options={['Never','Occasionally','Regularly']} {...register('smoking')} />
                  <Select label="Alcohol Consumption" options={['Never','Occasionally','Regularly']} {...register('alcoholConsumption')} />
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Donation History ── */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <h3 style={{ marginBottom: '0.25rem' }}>{STEPS[3].subtitle}</h3>
                <CheckboxField id="previousBloodDonation" label="I have donated blood before" register={register('previousBloodDonation')} />
                {prevDonation && (
                  <Input
                    label="Number of Previous Donations"
                    type="number" min="0" placeholder="0"
                    {...register('numberOfPreviousDonations')}
                  />
                )}
                <div className="alert alert-success" style={{ marginTop: '0.5rem' }}>
                  <CheckCircle size={16} />
                  You're almost done! Click submit to send your questionnaire for review.
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between" style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
              ← Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button variant="primary" onClick={next}>Continue →</Button>
            ) : (
              <Button type="submit" variant="primary" loading={isSubmitting}>Submit Questionnaire</Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
