import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Droplet, Clock, CheckCircle, AlertCircle, Plus, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { getBloodRequests } from '../../api/bloodRequests';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge, UrgencyBadge, BloodGroupBadge } from '../../components/ui/Badge';
import { SpinnerCenter } from '../../components/ui/Spinner';

export default function RecipientDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBloodRequests()
      .then((res) => setRequests(res.data.bloodRequests || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SpinnerCenter />;

  const myRequests = requests; // already filtered to own on server
  const active   = myRequests.filter((r) => r.status === 'ACTIVE');
  const fulfilled = myRequests.filter((r) => r.status === 'FULFILLED');
  const closed   = myRequests.filter((r) => r.status === 'CLOSED' || r.status === 'CANCELLED');

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Hello, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="page-subtitle">Manage your blood requests and track their status</p>
      </div>

      <div className="grid grid-3" style={{ marginBottom: '1.5rem' }}>
        <StatCard icon={<Droplet size={18} />} label="Active Requests" value={active.length}
          gradient="linear-gradient(90deg, var(--primary-600), var(--primary-400))"
          iconBg="rgba(244,63,94,0.15)" iconColor="var(--primary-400)" />
        <StatCard icon={<CheckCircle size={18} />} label="Fulfilled" value={fulfilled.length}
          gradient="linear-gradient(90deg, var(--accent-600), var(--accent-400))"
          iconBg="rgba(16,185,129,0.15)" iconColor="var(--accent-400)" />
        <StatCard icon={<Clock size={18} />} label="Total Requests" value={myRequests.length}
          gradient="linear-gradient(90deg, var(--secondary-600), var(--secondary-400))"
          iconBg="rgba(99,102,241,0.15)" iconColor="var(--secondary-400)" />
      </div>

      {/* Quick action */}
      <Link to="/recipient/new-request" style={{ textDecoration: 'none' }}>
        <motion.div
          className="card"
          whileHover={{ scale: 1.01 }}
          style={{
            marginBottom: '1.5rem',
            background: 'linear-gradient(135deg, rgba(225,29,72,0.12) 0%, rgba(99,102,241,0.08) 100%)',
            border: '1px solid rgba(225,29,72,0.2)',
            display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer',
          }}
        >
          <div style={{
            width: '3rem', height: '3rem', background: 'linear-gradient(135deg, var(--primary-600), var(--primary-400))',
            borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', flexShrink: 0, boxShadow: '0 4px 12px rgba(225,29,72,0.35)',
          }}>
            <Plus size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Submit a Blood Request</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Quickly post an emergency or planned request</div>
          </div>
          <ArrowRight size={20} style={{ color: 'var(--text-muted)' }} />
        </motion.div>
      </Link>

      <Card>
        <CardHeader
          title="Recent Requests"
          action={<Link to="/recipient/my-requests" className="btn btn-ghost btn-sm">View all</Link>}
        />
        {myRequests.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <div className="empty-icon"><Droplet size={24} /></div>
            <div className="empty-title">No requests yet</div>
            <div className="empty-desc">Submit your first blood request to get started</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>Patient</th><th>Blood Group</th><th>Urgency</th><th>Hospital</th><th>Required By</th><th>Status</th></tr>
              </thead>
              <tbody>
                {myRequests.slice(0, 5).map((r) => (
                  <tr key={r._id}>
                    <td style={{ fontWeight: 600 }}>{r.patientName}</td>
                    <td><BloodGroupBadge group={r.bloodGroup} /></td>
                    <td><UrgencyBadge urgency={r.urgency} /></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{r.hospitalName}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{format(new Date(r.requiredDate), 'MMM d, yyyy')}</td>
                    <td>
                      <Badge variant={r.status === 'ACTIVE' ? 'warning' : r.status === 'FULFILLED' ? 'success' : 'neutral'}>
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
