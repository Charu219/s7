import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { changePassword } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

const pwSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z.string().min(8, 'Must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function ProfilePage() {
  const { user, donor } = useAuth();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(pwSchema),
  });

  const onPasswordSubmit = async (data) => {
    try {
      await changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      toast.success('Password updated successfully!');
      reset();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password.');
    }
  };

  const initials = user?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Manage your account information</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem', maxWidth: '900px' }}>
        {/* Profile card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Card style={{ textAlign: 'center' }}>
            <div style={{
              width: '5rem', height: '5rem', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary-600), var(--secondary-600))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 800, color: 'white',
              margin: '0 auto 1rem', boxShadow: '0 8px 25px rgba(225,29,72,0.3)',
            }}>
              {initials}
            </div>
            <h3>{user?.name}</h3>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0.25rem 0 1rem' }}>{user?.email}</div>
            <Badge variant={user?.role === 'ADMIN' ? 'info' : user?.role === 'DONOR' ? 'primary' : 'success'}>
              {user?.role}
            </Badge>

            {donor && (
              <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Blood Group</span>
                  <strong style={{ color: 'var(--primary-400)' }}>{donor.bloodGroup}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total Donations</span>
                  <strong>{donor.totalDonations}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Health Score</span>
                  <strong style={{ color: 'var(--accent-400)' }}>{donor.healthScore ?? '—'}</strong>
                </div>
              </div>
            )}
          </Card>

          {/* Info */}
          <Card>
            <CardHeader title="Contact Info" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              {[
                { icon: Mail, label: user?.email || '—' },
                { icon: Phone, label: user?.phone || 'Not set' },
                { icon: MapPin, label: user?.city || 'Not set' },
              ].map(({ icon: Icon, label }, i) => (
                <div key={i} className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <Icon size={15} style={{ flexShrink: 0, color: 'var(--text-muted)' }} /> {label}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Change password */}
        <Card>
          <CardHeader title="Change Password" subtitle="Keep your account secure" />
          <form onSubmit={handleSubmit(onPasswordSubmit)} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <Input
                label="Current Password"
                type={showCurrent ? 'text' : 'password'}
                placeholder="Enter current password"
                icon={<Lock size={16} />}
                iconRight={showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                onIconRightClick={() => setShowCurrent((v) => !v)}
                error={errors.currentPassword?.message}
                {...register('currentPassword')}
              />
              <Input
                label="New Password"
                type={showNew ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                icon={<Lock size={16} />}
                iconRight={showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                onIconRightClick={() => setShowNew((v) => !v)}
                hint="At least 8 characters"
                error={errors.newPassword?.message}
                {...register('newPassword')}
              />
              <Input
                label="Confirm New Password"
                type={showNew ? 'text' : 'password'}
                placeholder="Repeat new password"
                icon={<Lock size={16} />}
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
              <Button type="submit" variant="primary" loading={isSubmitting} full>
                Update Password
              </Button>
            </div>
          </form>

          <div className="divider" />

          <div>
            <h4 style={{ marginBottom: '0.75rem' }}>Account Details</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem' }}>
              {[
                { label: 'Account Created', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—' },
                { label: 'Account Status', value: <Badge variant={user?.isActive ? 'success' : 'danger'}>{user?.isActive ? 'Active' : 'Inactive'}</Badge> },
                { label: 'Role', value: <Badge variant="info">{user?.role}</Badge> },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
