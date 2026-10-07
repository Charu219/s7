import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Droplet, Shield, Activity, Clock, Users, ArrowRight, CheckCircle } from 'lucide-react';

const features = [
  {
    icon: Droplet,
    title: 'Smart Blood Matching',
    desc: 'Our intelligent system matches donors with recipients based on blood group, location, and urgency.',
    color: 'var(--primary-400)',
    bg: 'rgba(244,63,94,0.1)',
  },
  {
    icon: Activity,
    title: 'Health Monitoring',
    desc: 'Continuous health score tracking with automated eligibility assessment for every donor.',
    color: 'var(--accent-400)',
    bg: 'rgba(16,185,129,0.1)',
  },
  {
    icon: Clock,
    title: 'Emergency Response',
    desc: 'Instant alerts for emergency blood requests, connecting donors to critical cases in minutes.',
    color: 'var(--warning-400)',
    bg: 'rgba(245,158,11,0.1)',
  },
  {
    icon: Shield,
    title: 'Verified & Safe',
    desc: 'Medical screening questionnaires and health checks ensure every donation is safe and compliant.',
    color: 'var(--secondary-400)',
    bg: 'rgba(99,102,241,0.1)',
  },
];

const steps = [
  { num: '01', title: 'Register', desc: 'Create your account as a donor or recipient in under 2 minutes.' },
  { num: '02', title: 'Complete Profile', desc: 'Donors fill a health questionnaire to determine eligibility.' },
  { num: '03', title: 'Connect', desc: 'Recipients post requests; eligible donors receive instant notifications.' },
  { num: '04', title: 'Save Lives', desc: 'Coordinate at the hospital and make a difference together.' },
];

const stats = [
  { value: '10K+', label: 'Registered Donors' },
  { value: '98%', label: 'Match Success Rate' },
  { value: '<15min', label: 'Emergency Response' },
  { value: '50K+', label: 'Lives Saved' },
];

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      {/* ── Navbar ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 2rem', height: '64px',
      }}>
        <div className="flex items-center gap-3">
          <div className="logo-icon"><Heart size={16} fill="currentColor" /></div>
          <span className="logo-text" style={{ fontSize: '1.25rem' }}>HealthBridge</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
          <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        padding: 'clamp(4rem, 10vw, 8rem) 2rem',
        textAlign: 'center',
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(225,29,72,0.08) 0%, transparent 70%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        <div style={{
          position: 'absolute', top: '10%', left: '5%',
          width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(225,29,72,0.05) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '0', right: '5%',
          width: '350px', height: '350px',
          background: 'radial-gradient(circle, rgba(14,165,233,0.04) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ maxWidth: '760px', margin: '0 auto', position: 'relative' }}
        >
          <div className="badge badge-primary" style={{ display: 'inline-flex', marginBottom: '1.5rem', fontSize: '0.75rem' }}>
            <Heart size={12} fill="currentColor" />
            Saving Lives Together
          </div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '1.5rem' }}>
            The Smarter Way to{' '}
            <span className="gradient-text">Donate Blood</span>{' '}
            & Save Lives
          </h1>
          <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', marginBottom: '2.5rem', maxWidth: '560px', margin: '0 auto 2.5rem' }}>
            HealthBridge connects blood donors with recipients in real-time. 
            Join thousands of life-savers in your community today.
          </p>
          <div className="flex items-center justify-center gap-4" style={{ flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary btn-lg">
              Become a Donor <ArrowRight size={18} />
            </Link>
            <Link to="/register?role=RECIPIENT" className="btn btn-secondary btn-lg">
              Request Blood
            </Link>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{
            display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap',
            marginTop: '4rem', padding: '2rem',
            background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border)',
            maxWidth: '700px', margin: '4rem auto 0',
          }}
        >
          {stats.map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary-400)' }}>{s.value}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: 'clamp(3rem, 8vw, 6rem) 2rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: '3rem' }}
          >
            <h2>Everything You Need to <span className="gradient-text">Save Lives</span></h2>
            <p style={{ marginTop: '0.75rem', maxWidth: '500px', margin: '0.75rem auto 0' }}>
              A comprehensive platform built for donors, recipients, and healthcare administrators.
            </p>
          </motion.div>
          <div className="grid grid-2" style={{ gap: '1.5rem' }}>
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  className="card"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}
                >
                  <div style={{
                    width: '3rem', height: '3rem', borderRadius: 'var(--radius-md)',
                    background: f.bg, color: f.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h4 style={{ marginBottom: '0.375rem' }}>{f.title}</h4>
                    <p style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{f.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={{ padding: 'clamp(3rem, 8vw, 6rem) 2rem', background: 'var(--bg-elevated)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: '3rem' }}
          >
            <h2>How It <span className="gradient-text">Works</span></h2>
            <p style={{ marginTop: '0.75rem' }}>Four simple steps to start saving lives</p>
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                style={{ textAlign: 'center' }}
              >
                <div style={{
                  width: '3.5rem', height: '3.5rem', borderRadius: 'var(--radius-full)',
                  background: 'linear-gradient(135deg, var(--primary-600), var(--primary-400))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1rem',
                  color: 'white', fontWeight: 800, fontSize: '0.875rem',
                  boxShadow: '0 6px 20px rgba(225,29,72,0.4)',
                }}>
                  {s.num}
                </div>
                <h4 style={{ marginBottom: '0.5rem' }}>{s.title}</h4>
                <p style={{ fontSize: '0.875rem' }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        padding: 'clamp(3rem, 8vw, 6rem) 2rem',
        background: 'linear-gradient(135deg, rgba(225,29,72,0.06) 0%, rgba(14,165,233,0.04) 100%)',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}
        >
          <div style={{
            width: '4rem', height: '4rem', background: 'linear-gradient(135deg, var(--primary-600), var(--primary-400))',
            borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem', boxShadow: '0 8px 30px rgba(225,29,72,0.4)',
          }}>
            <Heart size={24} fill="white" color="white" />
          </div>
          <h2 style={{ marginBottom: '1rem' }}>Ready to Make a Difference?</h2>
          <p style={{ marginBottom: '2rem', fontSize: '1.0625rem' }}>
            Join HealthBridge today and help build a future where no one waits for blood.
          </p>
          <div className="flex items-center justify-center gap-3" style={{ flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary btn-lg">
              Create Free Account <ArrowRight size={18} />
            </Link>
          </div>
          <div className="flex items-center justify-center gap-4" style={{ marginTop: '1.5rem', flexWrap: 'wrap' }}>
            {['No credit card required', 'Free forever', 'HIPAA compliant'].map((t) => (
              <div key={t} className="flex items-center gap-2" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                <CheckCircle size={14} style={{ color: 'var(--accent-400)' }} /> {t}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '1.5rem 2rem',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.875rem',
      }}>
        © 2026 HealthBridge. Built to save lives.
      </footer>
    </div>
  );
}
