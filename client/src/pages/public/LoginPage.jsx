import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Heart, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isDonor, isRecipient, isAdmin } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const result = await login(data.email, data.password);
      toast.success(`Welcome back, ${result.user.name.split(' ')[0]}!`);
      const role = result.user.role;
      if (role === 'DONOR') navigate('/donor/dashboard');
      else if (role === 'RECIPIENT') navigate('/recipient/dashboard');
      else navigate('/admin/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg-base)',
    }}>
      {/* Left panel */}
      <div style={{
        flex: '0 0 45%',
        background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--primary-800) 100%)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        padding: '3rem',
        position: 'relative', overflow: 'hidden',
      }} className="hide-mobile">
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 80% at 50% 0%, rgba(255,255,255,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <Link to="/" className="flex items-center gap-3" style={{ position: 'relative' }}>
          <div className="logo-icon"><Heart size={16} fill="currentColor" /></div>
          <span className="logo-text" style={{ color: 'white' }}>HealthBridge</span>
        </Link>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'white' }}>
              Every drop counts.<br /><span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 400 }}>Sign in to help.</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.7 }}>
              Access your donor dashboard, respond to blood requests, and track your impact on thousands of lives.
            </p>

            <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { icon: '🩸', text: 'Real-time blood request notifications' },
                { icon: '📊', text: 'Track your health score & eligibility' },
                { icon: '📅', text: 'Manage appointments seamlessly' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3">
                  <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                  <span style={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.8)' }}>{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
      }}>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          style={{ width: '100%', maxWidth: '420px' }}
        >
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Welcome back</h1>
            <p style={{ color: 'var(--text-muted)' }}>Sign in to your HealthBridge account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                icon={<Mail size={16} />}
                error={errors.email?.message}
                {...register('email')}
              />

              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                icon={<Lock size={16} />}
                iconRight={showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                onIconRightClick={() => setShowPassword((v) => !v)}
                error={errors.password?.message}
                {...register('password')}
              />

              <Button
                type="submit"
                variant="primary"
                full
                loading={isSubmitting}
                size="lg"
              >
                Sign In
              </Button>
            </div>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Don't have an account?{' '}
            </span>
            <Link to="/register" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
              Create one
            </Link>
          </div>

          {/* Demo hints */}
          <div className="alert alert-info" style={{ marginTop: '2rem', fontSize: '0.8125rem' }}>
            <div>
              <strong>Demo:</strong> Register a new account to explore all features.
              Use role <strong>ADMIN</strong> seeded via server seed script for admin access.
            </div>
          </div>
        </motion.div>
      </div>

      <style>{`.hide-mobile { @media (max-width: 768px) { display: none !important; } }`}</style>
    </div>
  );
}
