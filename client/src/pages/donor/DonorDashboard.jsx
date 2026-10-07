import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Droplet, Calendar, Activity, Award, AlertCircle, ArrowRight, Clock, CheckCircle } from 'lucide-react';
import { format, isAfter } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getMyDonorProfile, getDonationHistory } from '../../api/donors';
import { getBloodRequests } from '../../api/bloodRequests';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge, DonorStatusBadge, UrgencyBadge, BloodGroupBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SpinnerCenter } from '../../components/ui/Spinner';

function HealthScoreRing({ score }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const pct = score != null ? Math.min(100, Math.max(0, score)) : 0;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#f43f5e';

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="65" cy="65" r={radius} fill="none" stroke="var(--bg-elevated)" strokeWidth="10" />
        <circle
          cx="65" cy="65" r={radius} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{score != null ? score : '—'}</div>
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Health Score</div>
      </div>
    </div>
  );
}

export default function DonorDashboard() {
  const { user, donor, refreshDonor } = useAuth();
  const [donations, setDonations] = useState([]);
  const [activeRequests, setActiveRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        await refreshDonor();
        const [donRes, reqRes] = await Promise.all([
          donor?._id ? getDonationHistory(donor._id) : Promise.resolve({ data: { donations: [] } }),
          getBloodRequests({ status: 'SEARCHING' }),
        ]);
        setDonations(donRes.data.donations || []);
        setActiveRequests((reqRes.data.bloodRequests || []).slice(0, 3));
      } catch { /* silently fail */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <SpinnerCenter />;

  const needsQuestionnaire = !donor?.initialQuestionnaireCompleted;
  const isEligible = donor?.donorStatus === 'ELIGIBLE';

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="page-subtitle">Here's your donor overview for today</p>
      </div>

      {/* Questionnaire banner */}
      {needsQuestionnaire && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="alert alert-warning"
          style={{ marginBottom: '1.5rem', alignItems: 'center' }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong>Complete your health questionnaire</strong> to unlock your donor status and start saving lives.
          </div>
          <Link to="/donor/questionnaire" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
            Start Now <ArrowRight size={14} />
          </Link>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          icon={<Droplet size={18} />}
          label="Total Donations"
          value={donor?.totalDonations ?? 0}
          gradient="linear-gradient(90deg, var(--primary-600), var(--primary-400))"
          iconBg="rgba(244,63,94,0.15)" iconColor="var(--primary-400)"
        />
        <StatCard
          icon={<Activity size={18} />}
          label="Health Score"
          value={donor?.healthScore ?? '—'}
          gradient="linear-gradient(90deg, var(--accent-600), var(--accent-400))"
          iconBg="rgba(16,185,129,0.15)" iconColor="var(--accent-400)"
        />
        <StatCard
          icon={<Calendar size={18} />}
          label="Next Check"
          value={donor?.nextHealthCheck ? format(new Date(donor.nextHealthCheck), 'MMM d') : '—'}
          gradient="linear-gradient(90deg, var(--secondary-600), var(--secondary-400))"
          iconBg="rgba(99,102,241,0.15)" iconColor="var(--secondary-400)"
        />
        <StatCard
          icon={<Award size={18} />}
          label="Status"
          value={<DonorStatusBadge status={donor?.donorStatus || 'PENDING'} />}
          gradient="linear-gradient(90deg, var(--warning-600), var(--warning-400))"
          iconBg="rgba(245,158,11,0.15)" iconColor="var(--warning-400)"
        />
      </div>

      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.25rem' }}>
        {/* Health card */}
        <Card>
          <CardHeader title="Health Overview" />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <HealthScoreRing score={donor?.healthScore} />
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {[
                { label: 'Blood Group', value: <BloodGroupBadge group={donor?.bloodGroup || '—'} /> },
                { label: 'Last Donation', value: donor?.lastDonationDate ? format(new Date(donor.lastDonationDate), 'MMM d, yyyy') : 'Never' },
                { label: 'Next Eligible', value: donor?.nextEligibleDonationDate ? format(new Date(donor.nextEligibleDonationDate), 'MMM d, yyyy') : 'Now' },
                { label: 'Availability', value: donor?.availability ? <Badge variant="success">Available</Badge> : <Badge variant="neutral">Unavailable</Badge> },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between" style={{ fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                  <span style={{ fontWeight: 600 }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Active requests */}
        <Card>
          <CardHeader
            title="Active Blood Requests"
            subtitle={`${activeRequests.length} urgent need${activeRequests.length !== 1 ? 's' : ''} nearby`}
            action={<Link to="/donor/blood-requests" className="btn btn-ghost btn-sm">View all</Link>}
          />
          {activeRequests.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-icon"><Droplet size={20} /></div>
              <div className="empty-title">No active requests</div>
              <div className="empty-desc">New blood requests will appear here</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {activeRequests.map((req) => (
                <div
                  key={req._id}
                  style={{
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.875rem 1rem',
                    display: 'flex', alignItems: 'center', gap: '0.875rem',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{
                    width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius-md)',
                    background: 'rgba(244,63,94,0.15)', color: 'var(--primary-400)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.8125rem', flexShrink: 0,
                  }}>{req.bloodGroup}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.125rem' }}>{req.patientName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.hospitalName} · {req.unitsRequired} unit{req.unitsRequired > 1 ? 's' : ''}</div>
                  </div>
                  <UrgencyBadge urgency={req.urgency} />
                </div>
              ))}
              <Link to="/donor/blood-requests" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-end' }}>
                See All & Respond
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Donation history */}
      {donations.length > 0 && (
        <Card style={{ marginTop: '1.25rem' }}>
          <CardHeader
            title="Donation History"
            action={<Link to="/donor/health-reports" className="btn btn-ghost btn-sm">View reports</Link>}
          />
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th><th>Hospital</th><th>Units</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {donations.slice(0, 5).map((d) => (
                  <tr key={d._id}>
                    <td>{format(new Date(d.donationDate || d.createdAt), 'MMM d, yyyy')}</td>
                    <td>{d.hospital || '—'}</td>
                    <td>{d.units || 1}</td>
                    <td><Badge variant="success">Completed</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
