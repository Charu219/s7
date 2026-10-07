import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { createBloodRequest } from '../../api/bloodRequests';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

const schema = z.object({
  patientName: z.string().min(2, 'Patient name is required'),
  patientAge: z.coerce.number().int().min(0).max(120),
  gender: z.enum(['Male', 'Female', 'Other'], { required_error: 'Gender is required' }),
  bloodGroup: z.enum(['A+','A-','B+','B-','AB+','AB-','O+','O-'], { required_error: 'Blood group is required' }),
  unitsRequired: z.coerce.number().int().min(1).max(20),
  urgency: z.enum(['EMERGENCY','URGENT','NORMAL']),
  requiredDate: z.string().min(1, 'Required date is needed'),
  hospitalName: z.string().min(2, 'Hospital name is required'),
  hospitalLocation: z.string().min(2, 'Hospital location is required'),
  hospitalContact: z.string().min(7, 'Contact number is required'),
  notes: z.string().optional(),
});

export default function NewBloodRequestPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { urgency: 'NORMAL', unitsRequired: 1 },
  });

  const onSubmit = async (data) => {
    try {
      await createBloodRequest(data);
      toast.success('Blood request submitted successfully!');
      navigate('/recipient/my-requests');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request. Please try again.');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">New Blood Request</h1>
        <p className="page-subtitle">Submit a blood request and we'll match you with eligible donors</p>
      </div>

      <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
        <CheckCircle size={16} style={{ flexShrink: 0 }} />
        Requests are reviewed immediately. For emergencies, use urgency level <strong>EMERGENCY</strong>.
      </div>

      <Card style={{ maxWidth: '720px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Patient Info */}
          <h4 style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>Patient Information</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <Input label="Patient Name *" placeholder="Full name" error={errors.patientName?.message} {...register('patientName')} />
            <Input label="Patient Age *" type="number" placeholder="25" error={errors.patientAge?.message} {...register('patientAge')} />
            <Select
              label="Gender *"
              placeholder="Select gender"
              options={['Male', 'Female', 'Other']}
              error={errors.gender?.message}
              {...register('gender')}
            />
            <Select
              label="Blood Group *"
              placeholder="Select blood group"
              options={['A+','A-','B+','B-','AB+','AB-','O+','O-']}
              error={errors.bloodGroup?.message}
              {...register('bloodGroup')}
            />
            <Input label="Units Required *" type="number" min="1" max="20" placeholder="1" error={errors.unitsRequired?.message} {...register('unitsRequired')} />
          </div>

          {/* Request Details */}
          <h4 style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>Request Details</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <Select
              label="Urgency Level *"
              options={[
                { value: 'NORMAL', label: 'Normal (planned)' },
                { value: 'URGENT', label: 'Urgent (within 48h)' },
                { value: 'EMERGENCY', label: '🚨 Emergency (immediate)' },
              ]}
              error={errors.urgency?.message}
              {...register('urgency')}
            />
            <Input
              label="Required By *"
              type="date"
              min={new Date().toISOString().split('T')[0]}
              error={errors.requiredDate?.message}
              {...register('requiredDate')}
            />
          </div>

          {/* Hospital Info */}
          <h4 style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>Hospital Information</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <Input label="Hospital Name *" placeholder="City Hospital" error={errors.hospitalName?.message} {...register('hospitalName')} />
            <Input label="Hospital Location *" placeholder="Mumbai, Maharashtra" error={errors.hospitalLocation?.message} {...register('hospitalLocation')} />
            <Input label="Hospital Contact *" type="tel" placeholder="+91 22 1234 5678" error={errors.hospitalContact?.message} {...register('hospitalContact')} />
          </div>

          {/* Notes */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Additional Notes</label>
            <textarea
              className="form-textarea"
              placeholder="Any additional information about the patient's condition or special requirements…"
              {...register('notes')}
            />
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" type="button" onClick={() => navigate(-1)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={isSubmitting} size="lg">
              Submit Request
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
