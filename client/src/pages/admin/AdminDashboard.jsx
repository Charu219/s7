import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Droplet, Calendar, Activity, TrendingUp, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { getAllDonors } from '../../api/donors';
import { getBloodRequests } from '../../api/bloodRequests';
import { getAppointments } from '../../api/appointments';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge, DonorStatusBadge, UrgencyBadge, BloodGroupBadge } from '../../components/ui/Badge';
import { SpinnerCenter } from '../../components/ui/Spinner';

const COLORS = ['#f43f5e', '#6366f1', '#10b981', '#f59e0b', '#818cf8', '#34d399', '#fb7185', '#fbbf24'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', fontSize: '0.8125rem' }}>
      <div style={{ fontWeight: 700, marginBottom: '0.375rem' }}>{label}</div>
      {payload.map((p) => <div key={p.dataKey} style={{ color: p.fill || p.color }}>{p.name}: {p.value}</div>)}
    </div>
  );
};

export default function AdminDashboard() {
  const [donors, setDonors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAllDonors().catch(() => ({ data: { donors: [] } })),
      getBloodRequests().catch(() => ({ data: { bloodRequests: [] } })),
      getAppointments().catch(() => ({ data: { appointments: [] } })),
    ]).then(([d, r, a]) => {
      setDonors(d.data.donors || []);
      setRequests(r.data.bloodRequests || []);
      setAppointments(a.data.appointments || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <SpinnerCenter />;

  // Chart data
  const statusCounts = {};
  donors.forEach((d) => { statusCounts[d.donorStatus] = (statusCounts[d.donorStatus] || 0) + 1; });
  const donorStatusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  const bgCounts = {};
  donors.forEach((d) => { if (d.bloodGroup) bgCounts[d.bloodGroup] = (bgCounts[d.bloodGroup] || 0) + 1; });
  const bloodGroupData = Object.entries(bgCounts).map(([name, value]) => ({ name, value }));

  const urgencyCounts = {};
  requests.forEach((r) => { urgencyCounts[r.urgency] = (urgencyCounts[r.urgency] || 0) + 1; });
  const urgencyData = Object.entries(urgencyCounts).map(([name, value]) => ({ name, value }));

  const eligible = donors.filter((d) => d.donorStatus === 'ELIGIBLE').length;
  const activeReqs = requests.filter((r) => r.status === 'ACTIVE').length;
  const upcomingAppts = appointments.filter((a) => a.status === 'SCHEDULED').length;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">System-wide overview and analytics</p>
      </div>

      {/* Stats */}
      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        <StatCard icon={<Users size={18} />} label="Total Donors" value={donors.length}
          gradient="linear-gradient(90deg, var(--primary-600), var(--primary-400))"
          iconBg="rgba(244,63,94,0.15)" iconColor="var(--primary-400)" />
        <StatCard icon={<Activity size={18} />} label="Eligible Donors" value={eligible}
          gradient="linear-gradient(90deg, var(--accent-600), var(--accent-400))"
          iconBg="rgba(16,185,129,0.15)" iconColor="var(--accent-400)" />
        <StatCard icon={<Droplet size={18} />} label="Active Requests" value={activeReqs}
          gradient="linear-gradient(90deg, var(--secondary-600), var(--secondary-400))"
          iconBg="rgba(99,102,241,0.15)" iconColor="var(--secondary-400)" />
        <StatCard icon={<Calendar size={18} />} label="Upcoming Appointments" value={upcomingAppts}
          gradient="linear-gradient(90deg, var(--warning-600), var(--warning-400))"
          iconBg="rgba(245,158,11,0.15)" iconColor="var(--warning-400)" />
      </div>

      {/* Charts row */}
      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <Card>
          <CardHeader title="Donors by Blood Group" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={bloodGroupData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Donors" radius={[4, 4, 0, 0]}>
                {bloodGroupData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader title="Donor Status Distribution" />
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={donorStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {donorStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        <Card>
          <CardHeader title="Recent Blood Requests" subtitle="Latest submissions" />
          {requests.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <div className="empty-icon"><Droplet size={20} /></div>
              <div className="empty-title">No requests yet</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {requests.slice(0, 5).map((req) => (
                <div key={req._id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)' }}>
                  <BloodGroupBadge group={req.bloodGroup} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.patientName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.hospitalName}</div>
                  </div>
                  <UrgencyBadge urgency={req.urgency} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Recent Donors" subtitle="Newly registered" />
          {donors.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <div className="empty-icon"><Users size={20} /></div>
              <div className="empty-title">No donors yet</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {donors.slice(0, 5).map((d) => (
                <div key={d._id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)' }}>
                  <div className="user-avatar" style={{ flexShrink: 0 }}>
                    {d.userId?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('') || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{d.userId?.name || 'Unknown'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.bloodGroup}</div>
                  </div>
                  <DonorStatusBadge status={d.donorStatus} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
