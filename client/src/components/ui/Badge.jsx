const variantMap = {
  primary: 'badge-primary',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  neutral: 'badge-neutral',
  emergency: 'badge-emergency',
};

export function Badge({ children, variant = 'neutral', icon, className = '' }) {
  return (
    <span className={`badge ${variantMap[variant] || 'badge-neutral'} ${className}`}>
      {icon}
      {children}
    </span>
  );
}

// Convenience helpers
export function UrgencyBadge({ urgency }) {
  const map = {
    EMERGENCY: { variant: 'emergency', label: 'Emergency' },
    URGENT:    { variant: 'warning',   label: 'Urgent' },
    NORMAL:    { variant: 'info',      label: 'Normal' },
  };
  const { variant, label } = map[urgency] || { variant: 'neutral', label: urgency };
  return <Badge variant={variant}>{label}</Badge>;
}

export function DonorStatusBadge({ status }) {
  const map = {
    ELIGIBLE:       { variant: 'success', label: 'Eligible' },
    PENDING:        { variant: 'warning', label: 'Pending' },
    HOLD:           { variant: 'danger',  label: 'On Hold' },
    MEDICAL_REVIEW: { variant: 'info',    label: 'Medical Review' },
    NOT_ELIGIBLE:   { variant: 'neutral', label: 'Not Eligible' },
  };
  const { variant, label } = map[status] || { variant: 'neutral', label: status };
  return <Badge variant={variant}>{label}</Badge>;
}

export function BloodGroupBadge({ group }) {
  return (
    <Badge variant="primary" className="font-bold" style={{ fontSize: '0.75rem' }}>
      {group}
    </Badge>
  );
}
