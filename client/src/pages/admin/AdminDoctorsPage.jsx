import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Stethoscope } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { getDoctors, createDoctor, updateDoctor, deleteDoctor } from '../../api/doctors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SpinnerCenter } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/Modal';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  specialization: z.string().min(2, 'Specialization is required'),
  hospital: z.string().min(2, 'Hospital is required'),
  phone: z.string().min(7, 'Phone is required'),
  email: z.string().email('Valid email required').optional().or(z.literal('')),
});

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formModal, setFormModal] = useState(null); // null | 'create' | doctor object
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const isEdit = formModal && formModal !== 'create';

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    getDoctors()
      .then((res) => setDoctors(res.data.doctors || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openCreate = () => { reset({}); setFormModal('create'); };
  const openEdit = (doc) => { reset(doc); setFormModal(doc); };

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        const res = await updateDoctor(formModal._id, data);
        toast.success('Doctor updated.');
        setDoctors((prev) => prev.map((d) => d._id === formModal._id ? res.data.doctor : d));
      } else {
        const res = await createDoctor(data);
        toast.success('Doctor added.');
        setDoctors((prev) => [res.data.doctor, ...prev]);
      }
      setFormModal(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoctor(deleteTarget._id);
      toast.success('Doctor removed.');
      setDoctors((prev) => prev.filter((d) => d._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch { toast.error('Delete failed.'); }
    finally { setDeleting(false); }
  };

  if (loading) return <SpinnerCenter />;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="page-title">Doctors</h1>
          <p className="page-subtitle">{doctors.length} doctors on record</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={openCreate}>Add Doctor</Button>
      </div>

      {doctors.length === 0 ? (
        <Card>
          <div className="empty-state">
            <div className="empty-icon"><Stethoscope size={24} /></div>
            <div className="empty-title">No doctors added yet</div>
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={openCreate} className="mt-4">Add First Doctor</Button>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {doctors.map((doc, i) => (
            <motion.div
              key={doc._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card"
            >
              <div className="flex items-center gap-3" style={{ marginBottom: '1rem' }}>
                <div style={{
                  width: '3rem', height: '3rem', borderRadius: 'var(--radius-full)',
                  background: 'linear-gradient(135deg, var(--secondary-600), var(--secondary-400))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0,
                }}>
                  <Stethoscope size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>Dr. {doc.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--primary-400)', fontWeight: 600 }}>{doc.specialization}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <div>🏥 {doc.hospital}</div>
                <div>📞 {doc.phone}</div>
                {doc.email && <div>✉️ {doc.email}</div>}
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" size="sm" icon={<Pencil size={14} />} full onClick={() => openEdit(doc)}>Edit</Button>
                <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => setDeleteTarget(doc)}>Delete</Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      <Modal
        isOpen={!!formModal}
        onClose={() => setFormModal(null)}
        title={isEdit ? 'Edit Doctor' : 'Add Doctor'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormModal(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
              {isEdit ? 'Save Changes' : 'Add Doctor'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label="Full Name *" placeholder="John Smith" error={errors.name?.message} {...register('name')} />
          <Input label="Specialization *" placeholder="Hematologist" error={errors.specialization?.message} {...register('specialization')} />
          <Input label="Hospital *" placeholder="City General Hospital" error={errors.hospital?.message} {...register('hospital')} />
          <Input label="Phone *" type="tel" placeholder="+91 98765 43210" error={errors.phone?.message} {...register('phone')} />
          <Input label="Email" type="email" placeholder="doctor@hospital.com" error={errors.email?.message} {...register('email')} />
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove Doctor"
        message={`Are you sure you want to remove Dr. ${deleteTarget?.name}?`}
        confirmLabel="Remove"
        confirmVariant="danger"
        loading={deleting}
      />
    </div>
  );
}
