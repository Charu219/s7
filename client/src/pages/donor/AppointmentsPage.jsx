import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { format, isFuture } from 'date-fns';
import { Calendar, Clock, MapPin, Stethoscope } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDonorAppointments } from '../../api/donors';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { SpinnerCenter } from '../../components/ui/Spinner';

const typeLabels = {
  MONTHLY_HEALTH_CHECK: 'Monthly Health Check',
  DOCTOR_CONSULTATION: 'Doctor Consultation',
};

export default function AppointmentsPage() {
  const { donor } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming');

  useEffect(() => {
    if (!donor?._id) { setLoading(false); return; }
    getDonorAppointments(donor._id)
      .then((res) => setAppointments(res.data.appointments || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [donor]);

  if (loading) return <SpinnerCenter />;

  const now = new Date();
  const upcoming = appointments.filter((a) => isFuture(new Date(a.date)));
  const past = appointments.filter((a) => !isFuture(new Date(a.date)));
  const displayed = tab === 'upcoming' ? upcoming : past;

  const statusMap = {
    SCHEDULED: { variant: 'info', label: 'Scheduled' },
    COMPLETED: { variant: 'success', label: 'Completed' },
    CANCELLED: { variant: 'danger', label: 'Cancelled' },
    RESCHEDULED: { variant: 'warning', label: 'Rescheduled' },
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">My Appointments</h1>
        <p className="page-subtitle">View your scheduled and past appointments</p>
      </div>

      <div className="tabs" style={{ marginBottom: '1.5rem', display: 'inline-flex' }}>
        <button className={`tab-item ${tab === 'upcoming' ? 'active' : ''}`} onClick={() => setTab('upcoming')}>
          Upcoming ({upcoming.length})
        </button>
        <button className={`tab-item ${tab === 'past' ? 'active' : ''}`} onClick={() => setTab('past')}>
          Past ({past.length})
        </button>
      </div>

      {displayed.length === 0 ? (
        <Card>
          <div className="empty-state">
            <div className="empty-icon"><Calendar size={24} /></div>
            <div className="empty-title">{tab === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'}</div>
            <div className="empty-desc">
              {tab === 'upcoming'
                ? 'Your next appointment will appear here once scheduled by an admin.'
                : 'Completed appointments will appear here.'}
            </div>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {displayed.map((appt, i) => {
            const { variant, label } = statusMap[appt.status] || { variant: 'neutral', label: appt.status };
            return (
              <motion.div
                key={appt._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="card"
                style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}
              >
                {/* Date block */}
                <div style={{
                  background: 'linear-gradient(135deg, var(--primary-600), var(--primary-400))',
                  borderRadius: 'var(--radius-md)', padding: '0.75rem',
                  minWidth: '4.5rem', textAlign: 'center', flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(225,29,72,0.3)',
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', lineHeight: 1 }}>
                    {format(new Date(appt.date), 'd')}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600, textTransform: 'uppercase' }}>
                    {format(new Date(appt.date), 'MMM yyyy')}
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
                    <h4>{typeLabels[appt.type] || appt.type}</h4>
                    <Badge variant={variant}>{label}</Badge>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div className="flex items-center gap-2 text-sm text-secondary">
                      <Clock size={14} /> {appt.time}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-secondary">
                      <MapPin size={14} /> {appt.hospital}
                    </div>
                    {appt.doctorId && (
                      <div className="flex items-center gap-2 text-sm text-secondary">
                        <Stethoscope size={14} /> Dr. {appt.doctorId?.name || 'TBA'}
                      </div>
                    )}
                    {appt.reason && (
                      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {appt.reason}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
