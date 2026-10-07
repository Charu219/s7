import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getAppointments, createAppointment, updateAppointment, deleteAppointment } from '../../api/appointments';
import { getAllDonors } from '../../api/donors';
import { getDoctors } from '../../api/doctors';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { SpinnerCenter } from '../../components/ui/Spinner';
import { Modal, ConfirmModal } from '../../components/ui/Modal';

const schema = z.object({
  donorId: z.string().min(1, 'Donor is required'),
  type: z.enum(['MONTHLY_HEALTH_CHECK', 'DOCTOR_CONSULTATION']),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  hospital: z.string().min(2, 'Hospital is required'),
  reason: z.string().min(2, 'Reason is required'),
  doctorId: z.string().optional(),
});

const statusConfig = {
  SCHEDULED: 'info', PENDING: 'warning', COMPLETED: 'success', CANCELLED: 'danger', RESCHEDULED: 'warning',
};

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [donors, setDonors] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [updateModal, setUpdateModal] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { type: 'MONTHLY_HEALTH_CHECK' },
  });

  useEffect(() => {
    Promise.all([
      getAppointments().catch(() => ({ data: { appointments: [] } })),
      getAllDonors().catch(() => ({ data: { donors: [] } })),
      getDoctors().catch(() => ({ data: { doctors: [] } })),
    ]).then(([a, d, doc]) => {
      setAppointments(a.data.appointments || []);
      setDonors(d.data.donors || []);
      setDoctors(doc.data.doctors || []);
    }).finally(() => setLoading(false));
  }, []);

  const onCreateSubmit = async (data) => {
    try {
      const res = await createAppointment(data);
      toast.success('Appointment created!');
      setAppointments((prev) => [res.data.appointment, ...prev]);
      setCreateModal(false);
      reset();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create appointment.');
    }
  };

  const handleUpdateStatus = async () => {
    if (!updateModal || !newStatus) return;
    try {
      await updateAppointment(updateModal._id, { status: newStatus });
      toast.success('Status updated.');
      setAppointments((prev) => prev.map((a) => a._id === updateModal._id ? { ...a, status: newStatus } : a));
      setUpdateModal(null);
    } catch (err) {
      toast.error('Update failed.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAppointment(deleteTarget._id);
      toast.success('Appointment deleted successfully.');
      setAppointments((prev) => prev.filter((a) => a._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to delete. Please try again.');
    } finally { setDeleting(false); }
  };

  if (loading) return <SpinnerCenter />;

  const donorOptions = donors.map((d) => ({ value: d._id, label: `${d.userId?.name || '?'} (${d.bloodGroup})` }));
  const doctorOptions = doctors.map((d) => ({ value: d._id, label: `Dr. ${d.name} — ${d.specialization}` }));

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="page-title">Appointments</h1>
          <p className="page-subtitle">Schedule and manage donor appointments</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreateModal(true)}>
          New Appointment
        </Button>
      </div>

      <Card>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Donor</th>
                <th>Type</th>
                <th>Date &amp; Time</th>
                <th>Hospital</th>
                <th>Doctor</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No appointments yet
                  </td>
                </tr>
              )}
              {appointments.map((a, i) => (
                <motion.tr key={a._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                  <td style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {a.donorId?.userId?.name || '—'}
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {a.type === 'MONTHLY_HEALTH_CHECK' ? 'Health Check' : 'Consultation'}
                  </td>
                  <td style={{ fontSize: '0.8125rem' }}>
                    <div style={{ fontWeight: 600 }}>{format(new Date(a.date), 'MMM d, yyyy')}</div>
                    <div style={{ color: 'var(--text-muted)' }}>{a.time}</div>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{a.hospital}</td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {a.doctorId?.name ? `Dr. ${a.doctorId.name}` : '—'}
                  </td>
                  <td>
                    <Badge variant={statusConfig[a.status] || 'neutral'}>{a.status}</Badge>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setUpdateModal(a); setNewStatus(a.status); }}
                      >
                        Update
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(a)}
                        style={{ color: 'var(--primary-500)', padding: '0.25rem 0.5rem' }}
                        title="Delete appointment"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create modal */}
      <Modal
        isOpen={createModal}
        onClose={() => { setCreateModal(false); reset(); }}
        title="Schedule Appointment"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setCreateModal(false); reset(); }}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit(onCreateSubmit)} loading={isSubmitting}>Create</Button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Select label="Donor *" placeholder="Select donor" options={donorOptions} error={errors.donorId?.message} {...register('donorId')} />
          </div>
          <Select
            label="Type *"
            options={[
              { value: 'MONTHLY_HEALTH_CHECK', label: 'Monthly Health Check' },
              { value: 'DOCTOR_CONSULTATION', label: 'Doctor Consultation' },
            ]}
            error={errors.type?.message}
            {...register('type')}
          />
          <Select label="Doctor" placeholder="Select doctor (optional)" options={doctorOptions} {...register('doctorId')} />
          <Input label="Date *" type="date" error={errors.date?.message} {...register('date')} />
          <Input label="Time *" type="time" error={errors.time?.message} {...register('time')} />
          <div style={{ gridColumn: '1 / -1' }}>
            <Input label="Hospital *" placeholder="City Hospital" error={errors.hospital?.message} {...register('hospital')} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <Input label="Reason *" placeholder="Reason for appointment" error={errors.reason?.message} {...register('reason')} />
          </div>
        </div>
      </Modal>

      {/* Update status modal */}
      <Modal
        isOpen={!!updateModal}
        onClose={() => setUpdateModal(null)}
        title="Update Appointment Status"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setUpdateModal(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleUpdateStatus}>Update</Button>
          </>
        }
      >
        <Select
          label="Status"
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value)}
          options={['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((s) => ({ value: s, label: s }))}
        />
      </Modal>

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Appointment"
        message={`Are you sure you want to delete the ${deleteTarget?.type === 'MONTHLY_HEALTH_CHECK' ? 'health check' : 'consultation'} appointment for ${deleteTarget?.donorId?.userId?.name || 'this donor'} on ${deleteTarget?.date ? format(new Date(deleteTarget.date), 'MMM d, yyyy') : ''}? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  );
}
