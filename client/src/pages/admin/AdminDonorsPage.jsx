import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, Activity, Eye, Calendar, Stethoscope, Trash2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { getAllDonors, deleteDonor, updateDonor, getHealthReports, createHealthReport } from '../../api/donors';
import { getAppointments, createAppointment } from '../../api/appointments';
import { getDoctors } from '../../api/doctors';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge, DonorStatusBadge, BloodGroupBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { SpinnerCenter } from '../../components/ui/Spinner';
import { ConfirmModal, Modal } from '../../components/ui/Modal';

const STATUSES = ['PENDING', 'ELIGIBLE', 'HOLD', 'MEDICAL_REVIEW', 'NOT_ELIGIBLE'];

// ─── Manage Dropdown ──────────────────────────────────────────────────────────
function ManageDropdown({ donor, onAction }) {
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Reposition on scroll/resize so the fixed menu tracks the button
  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      if (!btnRef.current) return;
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    };
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen((v) => !v);
  };

  const items = [
    { label: 'View Details',              icon: Eye,          action: 'view' },
    { label: 'Update Health Report',      icon: Activity,     action: 'health' },
    { label: 'View Health History',       icon: FileText,     action: 'history' },
    { label: 'Schedule Monthly Checkup',  icon: Calendar,     action: 'checkup' },
    { label: 'Schedule Doctor Consultation', icon: Stethoscope, action: 'consult' },
    { label: 'Delete Donor',              icon: Trash2,       action: 'delete', danger: true },
  ];

  return (
    <>
      <button
        ref={btnRef}
        className="btn btn-ghost btn-sm"
        onClick={handleToggle}
        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
      >
        Manage <ChevronDown size={13} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              right: dropdownPos.right,
              zIndex: 9999,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-modal)',
              minWidth: '220px',
              overflow: 'hidden',
            }}
          >
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.action}
                  onClick={() => { setOpen(false); onAction(item.action, donor); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.625rem',
                    width: '100%', padding: '0.625rem 1rem',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '0.875rem', textAlign: 'left',
                    color: item.danger ? 'var(--primary-400)' : 'var(--text-primary)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover, rgba(0,0,0,0.05))'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <Icon size={14} style={{ flexShrink: 0, opacity: 0.75 }} />
                  {item.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Health Report Modal ──────────────────────────────────────────────────────
function HealthReportModal({ donor, isOpen, onClose, onSaved }) {
  const [form, setForm] = useState({
    weight: '', height: '', hemoglobin: '', systolicBP: '', diastolicBP: '',
    pulse: '', temperature: '', fastingBloodSugar: '', lastDonationDate: '',
    medicalObservations: '', notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Pre-fill height from initialData if available
      setForm({
        weight: donor?.initialData?.weight || '',
        height: donor?.initialData?.height || '',
        hemoglobin: '', systolicBP: '', diastolicBP: '',
        pulse: '', temperature: '', fastingBloodSugar: '',
        lastDonationDate: donor?.lastDonationDate
          ? format(new Date(donor.lastDonationDate), 'yyyy-MM-dd') : '',
        medicalObservations: '', notes: '',
      });
    }
  }, [isOpen, donor]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    const required = ['weight', 'height', 'hemoglobin', 'systolicBP', 'diastolicBP', 'pulse', 'temperature'];
    for (const f of required) {
      if (!form[f]) { toast.error(`Please enter ${f}`); return; }
    }
    setSaving(true);
    try {
      const payload = {
        reportType: 'MONTHLY',
        weight: parseFloat(form.weight),
        height: parseFloat(form.height),
        hemoglobin: parseFloat(form.hemoglobin),
        systolicBP: parseFloat(form.systolicBP),
        diastolicBP: parseFloat(form.diastolicBP),
        pulse: parseFloat(form.pulse),
        temperature: parseFloat(form.temperature),
        fastingBloodSugar: form.fastingBloodSugar ? parseFloat(form.fastingBloodSugar) : undefined,
        lastDonationDate: form.lastDonationDate || undefined,
        medicalObservations: form.medicalObservations,
        notes: form.notes,
        donorId: donor._id,
      };
      const res = await createHealthReport(donor._id, payload);
      toast.success(`Health report saved! New status: ${res.data.screening?.status || 'Updated'}`);
      onSaved(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save report.');
    } finally {
      setSaving(false);
    }
  };

  if (!donor) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Monthly Health Report — ${donor?.userId?.name}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>Save & Calculate Eligibility</Button>
        </>
      }
    >
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
        Enter current health measurements. A new health report will be created and donor eligibility will be automatically recalculated.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Input label="Weight (kg) *" type="number" placeholder="e.g. 65" value={form.weight} onChange={set('weight')} />
        <Input label="Height (cm) *" type="number" placeholder="e.g. 170" value={form.height} onChange={set('height')} />
        <Input label="Hemoglobin (g/dL) *" type="number" step="0.1" placeholder="e.g. 13.5" value={form.hemoglobin} onChange={set('hemoglobin')} />
        <div>
          <label className="form-label">Blood Pressure (mmHg) *</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              className="form-input" type="number" placeholder="Systolic"
              value={form.systolicBP} onChange={set('systolicBP')}
              style={{ flex: 1 }}
            />
            <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>/</span>
            <input
              className="form-input" type="number" placeholder="Diastolic"
              value={form.diastolicBP} onChange={set('diastolicBP')}
              style={{ flex: 1 }}
            />
          </div>
        </div>
        <Input label="Pulse Rate (bpm) *" type="number" placeholder="e.g. 72" value={form.pulse} onChange={set('pulse')} />
        <Input label="Body Temperature (°C) *" type="number" step="0.1" placeholder="e.g. 36.8" value={form.temperature} onChange={set('temperature')} />
        <Input label="Fasting Blood Sugar (mg/dL)" type="number" placeholder="e.g. 90" value={form.fastingBloodSugar} onChange={set('fastingBloodSugar')} />
        <Input label="Last Blood Donation Date" type="date" value={form.lastDonationDate} onChange={set('lastDonationDate')} />
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Medical Observations</label>
          <textarea
            className="form-textarea"
            placeholder="Any observations from the health check..."
            value={form.medicalObservations}
            onChange={set('medicalObservations')}
            style={{ minHeight: '72px' }}
          />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Notes</label>
          <textarea
            className="form-textarea"
            placeholder="Internal notes..."
            value={form.notes}
            onChange={set('notes')}
            style={{ minHeight: '60px' }}
          />
        </div>
      </div>
    </Modal>
  );
}

// ─── Health History Modal ────────────────────────────────────────────────────
function HealthHistoryModal({ donor, isOpen, onClose }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !donor?._id) return;
    setLoading(true);
    getHealthReports(donor._id)
      .then((res) => setReports(res.data.healthReports || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, donor]);

  const statusVariant = { ELIGIBLE: 'success', HOLD: 'danger', MEDICAL_REVIEW: 'info', NOT_ELIGIBLE: 'neutral', PENDING: 'warning' };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Health History — ${donor?.userId?.name}`} size="xl">
      {loading ? <SpinnerCenter /> : reports.length === 0 ? (
        <div className="empty-state"><div className="empty-title">No reports yet</div></div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th><th>Type</th><th>Score</th><th>Hb (g/dL)</th>
                <th>BP (Sys/Dia)</th><th>Pulse</th><th>Temp</th><th>Weight</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r._id}>
                  <td style={{ fontSize: '0.8125rem' }}>{format(new Date(r.createdAt), 'MMM d, yyyy')}</td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{r.reportType}</td>
                  <td><span style={{ fontWeight: 800, color: r.healthScore >= 80 ? 'var(--accent-400)' : r.healthScore >= 60 ? 'var(--warning-400)' : 'var(--primary-400)' }}>{r.healthScore ?? '—'}</span></td>
                  <td>{r.hemoglobin ?? '—'}</td>
                  <td>{r.systolicBP && r.diastolicBP ? `${r.systolicBP}/${r.diastolicBP}` : '—'}</td>
                  <td>{r.pulse ?? '—'}</td>
                  <td>{r.temperature ?? '—'}</td>
                  <td>{r.weight ? `${r.weight} kg` : '—'}</td>
                  <td><Badge variant={statusVariant[r.calculatedStatus] || 'neutral'}>{r.calculatedStatus || '—'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

// ─── Schedule Appointment Modal ──────────────────────────────────────────────
function ScheduleModal({ donor, type, isOpen, onClose }) {
  const [form, setForm] = useState({ date: '', time: '', hospital: '', reason: '', doctorId: '' });
  const [doctors, setDoctors] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getDoctors().then((r) => setDoctors(r.data.doctors || [])).catch(() => {});
      setForm({ date: '', time: '', hospital: '', reason: '', doctorId: '' });
    }
  }, [isOpen]);

  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const handleSave = async () => {
    if (!form.date || !form.time || !form.hospital || !form.reason) {
      toast.error('Please fill all required fields.'); return;
    }
    setSaving(true);
    try {
      await createAppointment({
        donorId: donor._id,
        type: type === 'checkup' ? 'MONTHLY_HEALTH_CHECK' : 'DOCTOR_CONSULTATION',
        date: form.date,
        time: form.time,
        hospital: form.hospital,
        reason: form.reason,
        doctorId: form.doctorId || undefined,
      });
      toast.success('Appointment scheduled!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule.');
    } finally { setSaving(false); }
  };

  const title = type === 'checkup' ? 'Schedule Monthly Checkup' : 'Schedule Doctor Consultation';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${title} — ${donor?.userId?.name}`} size="md"
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="primary" onClick={handleSave} loading={saving}>Schedule</Button>
      </>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Input label="Date *" type="date" value={form.date} onChange={set('date')} />
        <Input label="Time *" type="time" value={form.time} onChange={set('time')} />
        <div style={{ gridColumn: '1 / -1' }}>
          <Input label="Hospital *" placeholder="Hospital name" value={form.hospital} onChange={set('hospital')} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <Input label="Reason *" placeholder="Reason for appointment" value={form.reason} onChange={set('reason')} />
        </div>
        {doctors.length > 0 && (
          <div style={{ gridColumn: '1 / -1' }}>
            <Select
              label="Doctor (optional)"
              placeholder="Select doctor"
              value={form.doctorId}
              onChange={set('doctorId')}
              options={doctors.map((d) => ({ value: d._id, label: `Dr. ${d.name} — ${d.specialization}` }))}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── View Details Modal ──────────────────────────────────────────────────────
function ViewDetailsModal({ donor, isOpen, onClose }) {
  if (!donor) return null;
  const u = donor.userId || {};
  const rows = [
    { label: 'Name', value: u.name || '—' },
    { label: 'Email', value: u.email || '—' },
    { label: 'Phone', value: u.phone || '—' },
    { label: 'City', value: u.city || '—' },
    { label: 'Gender', value: u.gender || '—' },
    { label: 'Blood Group', value: <BloodGroupBadge group={donor.bloodGroup} /> },
    { label: 'Status', value: <DonorStatusBadge status={donor.donorStatus} /> },
    { label: 'Health Score', value: donor.healthScore ?? '—' },
    { label: 'Total Donations', value: donor.totalDonations ?? 0 },
    { label: 'Last Health Check', value: donor.lastHealthCheck ? format(new Date(donor.lastHealthCheck), 'MMM d, yyyy') : 'Never' },
    { label: 'Next Health Check', value: donor.nextHealthCheck ? format(new Date(donor.nextHealthCheck), 'MMM d, yyyy') : '—' },
    { label: 'Last Donation', value: donor.lastDonationDate ? format(new Date(donor.lastDonationDate), 'MMM d, yyyy') : 'Never' },
    { label: 'Preferred Location', value: donor.preferredLocation || '—' },
    { label: 'Status Reason', value: donor.statusReason || '—' },
    { label: 'Registered', value: u.createdAt ? format(new Date(u.createdAt), 'MMM d, yyyy') : '—' },
  ];
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Donor Details — ${u.name}`} size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {rows.map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-muted)' }}>{label}</span>
            <span style={{ fontWeight: 500, textAlign: 'right' }}>{value}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminDonorsPage() {
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal states
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [healthModal, setHealthModal] = useState(null);   // donor
  const [historyModal, setHistoryModal] = useState(null); // donor
  const [scheduleModal, setScheduleModal] = useState(null); // { donor, type }
  const [viewModal, setViewModal]       = useState(null); // donor

  const load = () => {
    setLoading(true);
    getAllDonors()
      .then((res) => setDonors(res.data.donors || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleAction = (action, donor) => {
    if (action === 'delete')  setDeleteTarget(donor);
    if (action === 'health')  setHealthModal(donor);
    if (action === 'history') setHistoryModal(donor);
    if (action === 'checkup') setScheduleModal({ donor, type: 'checkup' });
    if (action === 'consult') setScheduleModal({ donor, type: 'consult' });
    if (action === 'view')    setViewModal(donor);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDonor(deleteTarget._id);
      toast.success('Donor deleted successfully.');
      setDonors((prev) => prev.filter((d) => d._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to delete donor. Please try again.');
    } finally { setDeleting(false); }
  };

  // After a new health report is saved, refresh donor list to reflect new status
  const handleHealthSaved = () => { load(); };

  if (loading) return <SpinnerCenter />;

  const filtered = donors.filter((d) => {
    const name  = d.userId?.name?.toLowerCase() || '';
    const email = d.userId?.email?.toLowerCase() || '';
    const matchSearch = !search || name.includes(search.toLowerCase()) || email.includes(search.toLowerCase()) || d.bloodGroup?.includes(search.toUpperCase());
    const matchStatus = filterStatus === 'ALL' || d.donorStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Manage Donors</h1>
        <p className="page-subtitle">
          {filtered.length} donor{filtered.length !== 1 ? 's' : ''} registered
          {' · '}
          {filtered.filter((d) => d.donorStatus === 'ELIGIBLE').length} eligible
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3" style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: '1 1 240px' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            placeholder="Search by name, email, blood group…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-select"
          style={{ width: 'auto' }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <Card>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Donor</th>
                <th>Blood Group</th>
                <th>Status</th>
                <th>Health Score</th>
                <th>Total Donations</th>
                <th>Last Check</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No donors found
                  </td>
                </tr>
              )}
              {filtered.map((d, i) => (
                <motion.tr key={d._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="user-avatar" style={{ flexShrink: 0, fontSize: '0.6875rem' }}>
                        {d.userId?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('') || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{d.userId?.name || '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.userId?.email || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td><BloodGroupBadge group={d.bloodGroup} /></td>
                  <td><DonorStatusBadge status={d.donorStatus} /></td>
                  <td>
                    <span style={{
                      fontWeight: 700,
                      color: d.healthScore >= 80 ? 'var(--accent-400)' : d.healthScore >= 60 ? 'var(--warning-400)' : d.healthScore ? 'var(--primary-400)' : 'var(--text-muted)',
                    }}>
                      {d.healthScore ?? '—'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{d.totalDonations}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    {d.lastHealthCheck ? format(new Date(d.lastHealthCheck), 'MMM d, yyyy') : 'Never'}
                  </td>
                  <td>
                    <ManageDropdown donor={d} onAction={handleAction} />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Donor"
        message={`Are you sure you want to delete ${deleteTarget?.userId?.name}? Their account will be deactivated. This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleting}
      />

      {/* Monthly health report */}
      <HealthReportModal
        donor={healthModal}
        isOpen={!!healthModal}
        onClose={() => setHealthModal(null)}
        onSaved={handleHealthSaved}
      />

      {/* Health history */}
      <HealthHistoryModal
        donor={historyModal}
        isOpen={!!historyModal}
        onClose={() => setHistoryModal(null)}
      />

      {/* Schedule appointment */}
      <ScheduleModal
        donor={scheduleModal?.donor}
        type={scheduleModal?.type}
        isOpen={!!scheduleModal}
        onClose={() => setScheduleModal(null)}
      />

      {/* View details */}
      <ViewDetailsModal
        donor={viewModal}
        isOpen={!!viewModal}
        onClose={() => setViewModal(null)}
      />
    </div>
  );
}
