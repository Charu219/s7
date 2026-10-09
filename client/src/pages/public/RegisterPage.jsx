import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Mail, Lock, User, Phone, Eye, EyeOff, ArrowLeft, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

const schema = z.object({
  role: z.enum(['DONOR', 'RECIPIENT']),
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(7, 'Please enter a valid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  bloodGroup: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  city: z.string().optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
}).refine((d) => d.role !== 'DONOR' || !!d.bloodGroup, {
  message: 'Blood group is required for donors',
  path: ['bloodGroup'],
});

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();

  const defaultRole = searchParams.get('role') || 'DONOR';

  const { register, handleSubmit, watch, trigger, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { role: defaultRole },
  });

  const role = watch('role');
  const isDonor = role === 'DONOR';
  // Recipients only have 2 steps; donors have 3
  const totalSteps = isDonor ? 3 : 2;

  // If user switches to RECIPIENT while on step 3, go back to step 2
  if (step > totalSteps) setStep(totalSteps);

  const nextStep = async () => {
    const fields = step === 1
      ? ['role', 'name', 'email', 'phone']
      : ['password', 'confirmPassword'];
    const valid = await trigger(fields);
    if (valid) setStep((s) => s + 1);
  };

  const onSubmit = async (data) => {
    try {
      const { confirmPassword, ...payload } = data;
      await authRegister(payload);
      toast.success('Account created! Welcome to HealthBridge 🎉');
      navigate(isDonor ? '/donor/dashboard' : '/recipient/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem',
      background: 'radial-gradient(ellipse 100% 60% at 50% 0%, rgba(225,29,72,0.1) 0%, var(--bg-base) 60%)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: '520px' }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link to="/" className="flex items-center justify-center gap-2" style={{ marginBottom: '1.5rem' }}>
            <div className="logo-icon"><Heart size={16} fill="currentColor" /></div>
            <span className="logo-text">HealthBridge</span>
          </Link>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Create your account</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
            Join thousands making a difference
          </p>
        </div>

        {/* Stepper — 2 steps for recipients, 3 for donors */}
        <div className="flex items-center" style={{ marginBottom: '2rem', gap: 0 }}>
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => (
            <div key={n} className="step" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <div className={`step-circle ${n === step ? 'active' : n < step ? 'done' : ''}`}
                style={{
                  width: '2rem', height: '2rem', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                  border: n <= step ? `2px solid ${n < step ? 'var(--accent-500)' : 'var(--primary-500)'}` : '2px solid var(--border)',
                  background: n < step ? 'var(--accent-500)' : n === step ? 'var(--primary-600)' : 'var(--bg-elevated)',
                  color: n <= step ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.3s',
                }}
              >{n}</div>
              {n < totalSteps && (
                <div style={{
                  flex: 1, height: '2px',
                  background: n < step ? 'var(--accent-500)' : 'var(--border)',
                  transition: 'background 0.3s',
                }} />
              )}
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
                >
                  <h3 style={{ marginBottom: '0.25rem' }}>Basic Information</h3>

                  {/* Role selector */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {['DONOR', 'RECIPIENT'].map((r) => (
                      <label
                        key={r}
                        style={{
                          border: `2px solid ${role === r ? 'var(--primary-500)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-md)',
                          padding: '1rem',
                          cursor: 'pointer',
                          textAlign: 'center',
                          background: role === r ? 'rgba(225,29,72,0.08)' : 'var(--bg-elevated)',
                          transition: 'all 0.2s',
                        }}
                      >
                        <input type="radio" value={r} {...register('role')} style={{ display: 'none' }} />
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{r === 'DONOR' ? '🩸' : '🏥'}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: role === r ? 'var(--primary-600)' : 'var(--text-primary)' }}>{r}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {r === 'DONOR' ? 'Give blood' : 'Request blood'}
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.role && <span className="form-error">{errors.role.message}</span>}

                  <Input label="Full Name" placeholder="Jane Smith" icon={<User size={16} />} error={errors.name?.message} {...register('name')} />
                  <Input label="Email Address" type="email" placeholder="you@example.com" icon={<Mail size={16} />} error={errors.email?.message} {...register('email')} />
                  <Input label="Phone Number" type="tel" placeholder="+91 98765 43210" icon={<Phone size={16} />} error={errors.phone?.message} {...register('phone')} />
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
                >
                  <h3>Set Your Password</h3>
                  <Input
                    label="Password" type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters"
                    icon={<Lock size={16} />}
                    iconRight={showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    onIconRightClick={() => setShowPassword((v) => !v)}
                    error={errors.password?.message}
                    hint="At least 8 characters"
                    {...register('password')}
                  />
                  <Input
                    label="Confirm Password" type={showPassword ? 'text' : 'password'} placeholder="Repeat your password"
                    icon={<Lock size={16} />}
                    error={errors.confirmPassword?.message}
                    {...register('confirmPassword')}
                  />
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
                >
                  <h3>Profile Details <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></h3>

                  {isDonor && (
                    <Select
                      label="Blood Group *"
                      placeholder="Select blood group"
                      options={BLOOD_GROUPS}
                      error={errors.bloodGroup?.message}
                      {...register('bloodGroup')}
                    />
                  )}

                  <Input label="Date of Birth" type="date" error={errors.dateOfBirth?.message} {...register('dateOfBirth')} />

                  <Select
                    label="Gender"
                    placeholder="Select gender"
                    options={[
                      { value: 'Male', label: 'Male' },
                      { value: 'Female', label: 'Female' },
                      { value: 'Other', label: 'Other' },
                    ]}
                    error={errors.gender?.message}
                    {...register('gender')}
                  />

                  <Input label="City" placeholder="Mumbai" error={errors.city?.message} {...register('city')} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between" style={{ marginTop: '1.5rem', gap: '0.75rem' }}>
              {step > 1 ? (
                <Button variant="ghost" onClick={() => setStep((s) => s - 1)} icon={<ArrowLeft size={16} />}>
                  Back
                </Button>
              ) : <div />}

              {step < totalSteps ? (
                <Button variant="primary" onClick={nextStep} icon={<ArrowRight size={16} />}>
                  Continue
                </Button>
              ) : (
                <Button type="submit" variant="primary" loading={isSubmitting}>
                  Create Account
                </Button>
              )}
            </div>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Already have an account? </span>
          <Link to="/login" style={{ fontSize: '0.875rem', fontWeight: 600 }}>Sign in</Link>
        </div>
      </motion.div>
    </div>
  );
}
