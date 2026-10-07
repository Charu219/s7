import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Droplet, Plus, MapPin, Phone, User, ChevronDown, ChevronUp,
  CheckCircle2, Clock, XCircle, AlertCircle, Unlock, Lock,
  Building2, Calendar, Heart,
} from 'lucide-react';
import { getBloodRequests } from '../../api/bloodRequests';
import { Card } from '../../components/ui/Card';
import { Badge, UrgencyBadge, BloodGroupBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SpinnerCenter } from '../../components/ui/Spinner';

// Map real DB status values to display config
const statusConfig = {
  PENDING:            { variant: 'warning',  label: 'Pending',          icon: <Clock size={12} /> },
  SEARCHING:          { variant: 'info',     label: 'Searching',        icon: <Clock size={12} /> },
  DONOR_ACCEPTED:     { variant: 'success',  label: 'Donor Accepted',   icon: <CheckCircle2 size={12} /> },
  CONTACT_SHARED:     { variant: 'success',  label: 'Donor Confirmed',  icon: <CheckCircle2 size={12} /> },
  DONATION_COMPLETED: { variant: 'success',  label: 'Completed',        icon: <CheckCircle2 size={12} /> },
  CANCELLED:          { variant: 'danger',   label: 'Cancelled',        icon: <XCircle size={12} /> },
  EXPIRED:            { variant: 'neutral',  label: 'Expired',          icon: <AlertCircle size={12} /> },
};

// Filter tab groupings
const FILTER_GROUPS = {
  ALL:       null,
  ACTIVE:    ['PENDING', 'SEARCHING'],
  ACCEPTED:  ['DONOR_ACCEPTED', 'CONTACT_SHARED'],
  COMPLETED: ['DONATION_COMPLETED'],
  CLOSED:    ['CANCELLED', 'EXPIRED'],
};

/* ── Accepted Donor Contact Panel ─────────────────────────────── */
function DonorContactPanel({ contactShare }) {
  const info = contactShare?.donorContactShared;
  if (!info) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      style={{ overflow: 'hidden' }}
    >
      <div style={{
        marginTop: '1rem',
        padding: '1.125rem',
        background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.04))',
        border: '1px solid rgba(16,185,129,0.35)',
        borderRadius: 'var(--radius-md)',
      }}>
        {/* Header */}
        <div style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          color: 'var(--accent-400)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
        }}>
          <Unlock size={12} /> Donor Contact Information (Unlocked)
        </div>

        {/* Contact grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.75rem',
        }}>
          {info.name && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem' }}>
              <User size={14} style={{ color: 'var(--accent-400)', flexShrink: 0, marginTop: '0.1rem' }} />
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Donor Name</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{info.name}</div>
              </div>
            </div>
          )}
          {info.bloodGroup && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem' }}>
              <Droplet size={14} style={{ color: 'var(--accent-400)', flexShrink: 0, marginTop: '0.1rem' }} />
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Blood Group</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{info.bloodGroup}</div>
              </div>
            </div>
          )}
          {info.phone && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem' }}>
              <Phone size={14} style={{ color: 'var(--accent-400)', flexShrink: 0, marginTop: '0.1rem' }} />
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Phone</div>
                <a
                  href={`tel:${info.phone}`}
                  style={{ fontWeight: 600, color: 'var(--primary-400)', textDecoration: 'none' }}
                >
                  {info.phone}
                </a>
              </div>
            </div>
          )}
          {(info.address || info.city) && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem' }}>
              <MapPin size={14} style={{ color: 'var(--accent-400)', flexShrink: 0, marginTop: '0.1rem' }} />
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Address</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {[info.address, info.city].filter(Boolean).join(', ')}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{
          marginTop: '0.75rem',
          padding: '0.5rem 0.75rem',
          background: 'rgba(16,185,129,0.08)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.72rem',
          color: 'var(--accent-400)',
          fontWeight: 500,
        }}>
          ✓ Contact information is visible because the donor accepted your request. Please coordinate your visit.
        </div>
      </div>
    </motion.div>
  );
}

/* ── Waiting for donor banner ─────────────────────────────────── */
function WaitingForDonorBanner() {
  return (
    <div style={{
      marginTop: '0.875rem',
      padding: '0.875rem 1rem',
      background: 'rgba(59,130,246,0.06)',
      border: '1px solid rgba(59,130,246,0.2)',
      borderRadius: 'var(--radius-md)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.375rem',
        fontWeight: 600,
        fontSize: '0.875rem',
        color: 'var(--text-primary)',
      }}>
        <Clock size={14} style={{ color: '#3b82f6' }} />
        Waiting for donor acceptance
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Eligible donors have been notified. Donor contact details will appear here once a donor accepts your request.
      </div>
      <div style={{
        marginTop: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontSize: '0.72rem',
        color: 'var(--text-muted)',
      }}>
        <Lock size={11} />
        Donor contact information is hidden until acceptance.
      </div>
    </div>
  );
}

/* ── Single request card ────────────────────────────────────── */
function RequestCard({ req, index }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = statusConfig[req.status] || { variant: 'neutral', label: req.status };
  const isAccepted = ['CONTACT_SHARED', 'DONATION_COMPLETED', 'DONOR_ACCEPTED'].includes(req.status);
  const isSearching = ['PENDING', 'SEARCHING'].includes(req.status);
  const hasContactInfo = !!req.contactShare?.donorContactShared;

  return (
    <motion.div
      key={req._id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="card"
      style={{
        border: isAccepted
          ? '1px solid rgba(16,185,129,0.3)'
          : '1px solid var(--border)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top accent line for accepted */}
      {isAccepted && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: 'linear-gradient(90deg, var(--accent-500), var(--accent-400))',
        }} />
      )}

      {/* ── Header row ── */}
      <div className="flex items-center justify-between" style={{ marginBottom: '0.875rem' }}>
        <div className="flex items-center gap-3">
          <BloodGroupBadge group={req.bloodGroup} />
          <div>
            <div style={{ fontWeight: 700 }}>{req.patientName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {req.gender && <span>{req.gender} · </span>}
              Age {req.patientAge} · {req.unitsRequired} unit{req.unitsRequired > 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
          <UrgencyBadge urgency={req.urgency} />
          <Badge variant={cfg.variant} icon={cfg.icon}>{cfg.label}</Badge>
        </div>
      </div>

      {/* ── Details grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '0.5rem',
        fontSize: '0.875rem',
        marginBottom: '0.5rem',
      }}>
        <div className="flex items-center gap-2 text-secondary">
          <Building2 size={14} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
          {req.hospitalName}
        </div>
        <div className="flex items-center gap-2 text-secondary">
          <MapPin size={14} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
          {req.hospitalLocation}
        </div>
        <div className="flex items-center gap-2 text-secondary">
          <Phone size={14} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
          {req.hospitalContact}
        </div>
        <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
          <Calendar size={14} style={{ flexShrink: 0 }} />
          Required by:{' '}
          <strong style={{ color: 'var(--text-primary)' }}>
            {format(new Date(req.requiredDate), 'MMM d, yyyy')}
          </strong>
        </div>
      </div>

      {/* Request ID + submitted date */}
      <div style={{
        fontSize: '0.72rem',
        color: 'var(--text-muted)',
        marginBottom: '0.5rem',
        display: 'flex',
        gap: '1rem',
      }}>
        <span>ID: <strong style={{ color: 'var(--text-secondary)' }}>{req.requestId}</strong></span>
        <span>Submitted: {format(new Date(req.createdAt), 'MMM d, yyyy')}</span>
      </div>

      {req.notes && (
        <div style={{
          padding: '0.5rem 0.75rem',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          marginBottom: '0.5rem',
        }}>
          {req.notes}
        </div>
      )}

      {/* ── Searching state: waiting for donor ── */}
      {isSearching && <WaitingForDonorBanner />}

      {/* ── Accepted + has contact info: show expand toggle ── */}
      {isAccepted && hasContactInfo && (
        <div style={{ marginTop: '0.875rem' }}>
          {/* "Donor Found" banner */}
          <div style={{
            padding: '0.625rem 0.875rem',
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--accent-400)',
          }}>
            <CheckCircle2 size={14} />
            Donor Found ✓ — Blood Request: ACCEPTED
          </div>

          <button
            onClick={() => setExpanded((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--accent-400)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              padding: 0,
            }}
          >
            <Unlock size={13} />
            {expanded ? 'Hide donor contact info' : 'View donor contact info'}
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <AnimatePresence initial={false}>
            {expanded && <DonorContactPanel contactShare={req.contactShare} />}
          </AnimatePresence>
        </div>
      )}

      {/* ── Accepted but contact info not yet attached to this response ── */}
      {isAccepted && !hasContactInfo && (
        <div style={{
          marginTop: '0.875rem',
          padding: '0.75rem 1rem',
          background: 'rgba(16,185,129,0.06)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: 'var(--radius-md)',
        }}>
          <div style={{
            fontWeight: 600,
            fontSize: '0.875rem',
            color: 'var(--accent-400)',
            marginBottom: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}>
            <CheckCircle2 size={14} /> A donor has accepted your request!
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Contact details will be available shortly.
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ── Main page ──────────────────────────────────────────────── */
export default function MyRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    getBloodRequests()
      .then((res) => setRequests(res.data.bloodRequests || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SpinnerCenter />;

  const getCount = (key) => {
    const statuses = FILTER_GROUPS[key];
    if (!statuses) return requests.length;
    return requests.filter((r) => statuses.includes(r.status)).length;
  };

  const filtered = (() => {
    const statuses = FILTER_GROUPS[filter];
    if (!statuses) return requests;
    return requests.filter((r) => statuses.includes(r.status));
  })();

  // Summary counts for quick reference
  const acceptedCount = requests.filter((r) =>
    ['DONOR_ACCEPTED', 'CONTACT_SHARED', 'DONATION_COMPLETED'].includes(r.status)
  ).length;
  const searchingCount = requests.filter((r) =>
    ['PENDING', 'SEARCHING'].includes(r.status)
  ).length;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="page-title">My Blood Requests</h1>
          <p className="page-subtitle">Track all your submitted blood requests</p>
        </div>
        <Link to="/recipient/new-request" className="btn btn-primary btn-sm">
          <Plus size={16} /> New Request
        </Link>
      </div>

      {/* ── Summary banners ── */}
      {acceptedCount > 0 && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem 1rem',
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.25)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          fontSize: '0.875rem',
        }}>
          <Unlock size={15} style={{ color: 'var(--accent-400)', flexShrink: 0 }} />
          <span>
            <strong style={{ color: 'var(--accent-400)' }}>
              {acceptedCount} request{acceptedCount > 1 ? 's' : ''} accepted
            </strong>
            {' '}— Donor contact information is now available. Click the card to view details.
          </span>
        </div>
      )}
      {searchingCount > 0 && acceptedCount === 0 && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem 1rem',
          background: 'rgba(59,130,246,0.06)',
          border: '1px solid rgba(59,130,246,0.18)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
        }}>
          <Lock size={15} style={{ flexShrink: 0 }} />
          Eligible donors have been notified. Donor contact details will appear once a donor accepts.
        </div>
      )}

      {/* ── Filter tabs ── */}
      <div className="tabs" style={{ marginBottom: '1.5rem', display: 'inline-flex', flexWrap: 'wrap' }}>
        {Object.keys(FILTER_GROUPS).map((key) => (
          <button
            key={key}
            className={`tab-item ${filter === key ? 'active' : ''}`}
            onClick={() => setFilter(key)}
          >
            {key === 'ALL' ? 'All' : key.charAt(0) + key.slice(1).toLowerCase()} ({getCount(key)})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <div className="empty-state">
            <div className="empty-icon"><Droplet size={24} /></div>
            <div className="empty-title">No requests in this category</div>
            <Link to="/recipient/new-request" className="btn btn-primary btn-sm mt-4">
              <Plus size={14} /> Submit a Request
            </Link>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map((req, i) => (
            <RequestCard key={req._id} req={req} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
