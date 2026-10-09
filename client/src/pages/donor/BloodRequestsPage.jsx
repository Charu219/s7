import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Droplet, MapPin, Phone, Search, CheckCircle, XCircle,
  User, Building2, ChevronDown, ChevronUp, Heart, Calendar,
  AlertTriangle, Clock, Lock, Unlock, FileText, UserCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getBloodRequests, respondToBloodRequest } from '../../api/bloodRequests';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Badge, UrgencyBadge, BloodGroupBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SpinnerCenter } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';

/* ── Recipient contact panel (shown to donor ONLY after acceptance) ── */
function RecipientContactPanel({ contactShare }) {
  const info = contactShare?.recipientContactShared;
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
          fontSize: '0.7rem',
          fontWeight: 700,
          color: 'var(--accent-400)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
        }}>
          <Unlock size={12} /> Recipient Contact Details (Unlocked)
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.8125rem' }}>
          {info.name && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <User size={13} style={{ color: 'var(--accent-400)', flexShrink: 0, marginTop: '0.1rem' }} />
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Recipient Name</div>
                <strong style={{ color: 'var(--text-primary)' }}>{info.name}</strong>
              </div>
            </div>
          )}
          {info.phone && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <Phone size={13} style={{ color: 'var(--accent-400)', flexShrink: 0, marginTop: '0.1rem' }} />
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Phone</div>
                <a
                  href={`tel:${info.phone}`}
                  style={{ color: 'var(--primary-400)', fontWeight: 600, textDecoration: 'none' }}
                >
                  {info.phone}
                </a>
              </div>
            </div>
          )}
          {(info.address || info.city) && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <MapPin size={13} style={{ color: 'var(--accent-400)', flexShrink: 0, marginTop: '0.1rem' }} />
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Address</div>
                <span style={{ color: 'var(--text-primary)' }}>
                  {[info.address, info.city].filter(Boolean).join(', ')}
                </span>
              </div>
            </div>
          )}
          {info.patientName && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <Heart size={13} style={{ color: 'var(--accent-400)', flexShrink: 0, marginTop: '0.1rem' }} />
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Patient</div>
                <strong style={{ color: 'var(--text-primary)' }}>{info.patientName}</strong>
              </div>
            </div>
          )}
          {info.hospitalName && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <Building2 size={13} style={{ color: 'var(--accent-400)', flexShrink: 0, marginTop: '0.1rem' }} />
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Hospital</div>
                <span style={{ color: 'var(--text-primary)' }}>
                  {info.hospitalName}
                  {info.hospitalLocation ? `, ${info.hospitalLocation}` : ''}
                </span>
              </div>
            </div>
          )}
          {info.hospitalContact && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <Phone size={13} style={{ color: 'var(--accent-400)', flexShrink: 0, marginTop: '0.1rem' }} />
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Hospital Contact</div>
                <a
                  href={`tel:${info.hospitalContact}`}
                  style={{ color: 'var(--primary-400)', fontWeight: 600, textDecoration: 'none' }}
                >
                  {info.hospitalContact}
                </a>
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
          ✓ Contact information is visible because you accepted this request. Please reach out as soon as possible.
        </div>
      </div>
    </motion.div>
  );
}

/* ── Single request card ─────────────────────────────────────── */
function RequestCard({ req, donor, onAccept, onDecline }) {
  const [expanded, setExpanded] = useState(false);
  const myResponse = req._myResponse;
  const isAccepted = myResponse === 'ACCEPTED';
  const isDeclined = myResponse === 'DECLINED';
  const hasContactInfo = !!req.contactShare?.recipientContactShared;
  const isActive = ['PENDING', 'SEARCHING'].includes(req.status);
  // A donor can respond if they haven't explicitly accepted/declined yet
  // (null = never notified, 'PENDING' = notified but no action yet)
  const hasNotResponded = !myResponse || myResponse === 'PENDING';
  // Use server-computed _canRespond (based on LIVE DB donor status, not stale localStorage cache)
  const canRespond = !!req._canRespond;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
      style={{
        border: isAccepted
          ? '1px solid rgba(16,185,129,0.4)'
          : isDeclined
          ? '1px solid var(--border)'
          : canRespond
          ? '1px solid rgba(220,38,38,0.25)'
          : '1px solid var(--border)',
        position: 'relative',
        overflow: 'hidden',
        opacity: isDeclined ? 0.7 : 1,
      }}
    >
      {/* Top accent line */}
      {isAccepted && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: 'linear-gradient(90deg, var(--accent-500), var(--accent-400))',
        }} />
      )}
      {canRespond && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: 'linear-gradient(90deg, var(--primary-600), var(--primary-400))',
        }} />
      )}

      {/* ── Header row ── */}
      <div className="flex items-center justify-between" style={{ marginBottom: '0.875rem' }}>
        <BloodGroupBadge group={req.bloodGroup} />
        <div className="flex items-center gap-2">
          <UrgencyBadge urgency={req.urgency} />
          {isAccepted && <Badge variant="success">✓ Accepted</Badge>}
          {isDeclined && <Badge variant="neutral">Declined</Badge>}
        </div>
      </div>

      {/* ── Patient info ── */}
      <h4 style={{ marginBottom: '0.25rem', fontSize: '1rem', fontWeight: 700 }}>
        {req.patientName}
      </h4>
      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.875rem' }}>
        {req.gender && <span>{req.gender} · </span>}
        Age {req.patientAge} · {req.unitsRequired} unit{req.unitsRequired > 1 ? 's' : ''} needed
      </div>

      {/* ── Hospital & date info ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.875rem' }}>
        <div className="flex items-center gap-2" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          <Building2 size={13} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
          {req.hospitalName}
        </div>
        <div className="flex items-center gap-2" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          <MapPin size={13} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
          {req.hospitalLocation}
        </div>
        <div className="flex items-center gap-2" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          <Calendar size={13} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
          Required by: <strong style={{ color: 'var(--text-primary)' }}>
            {format(new Date(req.requiredDate), 'MMM d, yyyy')}
          </strong>
        </div>
      </div>

      {/* ── Expandable details ── */}
      {(req.reason || req.notes || req.doctorName) && (
        <div style={{ marginBottom: '0.875rem' }}>
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: '0.775rem', fontWeight: 500, padding: 0,
            }}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Hide details' : 'View request details'}
          </button>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{
                  marginTop: '0.625rem',
                  padding: '0.75rem',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  display: 'flex', flexDirection: 'column', gap: '0.4rem',
                }}>
                  {req.doctorName && (
                    <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <UserCheck size={12} style={{ color: 'var(--text-muted)' }} />
                      Doctor: <strong style={{ color: 'var(--text-primary)' }}>{req.doctorName}</strong>
                    </div>
                  )}
                  {req.reason && (
                    <div className="flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <FileText size={12} style={{ color: 'var(--text-muted)', marginTop: '0.1rem' }} />
                      <span>Reason: {req.reason}</span>
                    </div>
                  )}
                  {req.notes && (
                    <div className="flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                      <FileText size={12} style={{ color: 'var(--text-muted)', marginTop: '0.1rem' }} />
                      <span>Notes: {req.notes}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Privacy notice (before action) ── */}
      {canRespond && (
        <div style={{
          marginBottom: '0.875rem',
          padding: '0.5rem 0.75rem',
          background: 'rgba(220,38,38,0.06)',
          border: '1px solid rgba(220,38,38,0.15)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
          display: 'flex', alignItems: 'center', gap: '0.4rem',
        }}>
          <Lock size={11} style={{ flexShrink: 0 }} />
          Recipient contact details are hidden until you accept this request.
        </div>
      )}

      {/* ── Accept / Decline buttons ── */}
      {canRespond && (
        <div className="flex gap-2" style={{ marginTop: '0.25rem' }}>
          <Button
            variant="success"
            size="sm"
            full
            icon={<CheckCircle size={14} />}
            onClick={() => onAccept(req)}
          >
            Accept Request
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<XCircle size={14} />}
            onClick={() => onDecline(req)}
          >
            Decline
          </Button>
        </div>
      )}

      {/* ── Post-acceptance state ── */}
      {isAccepted && (
        <div style={{ marginTop: '0.25rem' }}>
          {hasContactInfo ? (
            <>
              <button
                onClick={() => setExpanded((v) => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--accent-400)', fontSize: '0.8rem',
                  fontWeight: 600, padding: '0.25rem 0',
                }}
              >
                <Unlock size={13} />
                {expanded ? 'Hide recipient contact info' : 'View recipient contact info'}
                {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              <AnimatePresence initial={false}>
                {expanded && <RecipientContactPanel contactShare={req.contactShare} />}
              </AnimatePresence>
            </>
          ) : (
            <div style={{
              padding: '0.625rem 0.875rem',
              background: 'rgba(16,185,129,0.06)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
            }}>
              ✅ You accepted this request. Contact information will appear shortly.
            </div>
          )}
        </div>
      )}

      {/* ── Declined state ── */}
      {isDeclined && (
        <div style={{
          padding: '0.5rem 0.75rem',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}>
          You declined this request
        </div>
      )}


      {/* ── Donor not yet eligible ── */}
      {!canRespond && hasNotResponded && isActive && !req._canRespond && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.25rem' }}>
          {donor?.donorStatus !== 'ELIGIBLE'
            ? `Your status must be Eligible to respond (current: ${donor?.donorStatus || 'Unknown'})`
            : 'You are not currently eligible to respond to this request'}
        </div>
      )}

      {/* ── Request already accepted by someone else ── */}
      {!canRespond && hasNotResponded && !isActive && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.25rem' }}>
          This request has already been fulfilled
        </div>
      )}
    </motion.div>
  );
}

/* ── Accept Confirm Modal ─────────────────────────────────────── */
function AcceptConfirmModal({ isOpen, req, onClose, onConfirm, loading }) {
  if (!req) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Accept Blood Request?" size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div style={{
          padding: '0.875rem',
          background: 'rgba(220,38,38,0.06)',
          border: '1px solid rgba(220,38,38,0.2)',
          borderRadius: 'var(--radius-md)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <BloodGroupBadge group={req.bloodGroup} />
            <UrgencyBadge urgency={req.urgency} />
          </div>
          <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{req.patientName}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {req.hospitalName} — {req.unitsRequired} unit{req.unitsRequired > 1 ? 's' : ''} needed
          </div>
        </div>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          By accepting, you commit to donating blood at <strong>{req.hospitalName}</strong>.
          The recipient's contact information will be shared with you, and your contact
          information will be shared with the recipient.
        </p>

        <div style={{
          padding: '0.625rem 0.875rem',
          background: 'rgba(16,185,129,0.06)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.78rem',
          color: 'var(--accent-400)',
          display: 'flex', alignItems: 'center', gap: '0.4rem',
        }}>
          <Unlock size={12} />
          Contact details will be unlocked for both parties after acceptance.
        </div>
      </div>
      <div className="modal-footer">
        <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="success" onClick={onConfirm} loading={loading} icon={<CheckCircle size={14} />}>
          Yes, Accept Request
        </Button>
      </div>
    </Modal>
  );
}

/* ── Decline Confirm Modal ────────────────────────────────────── */
function DeclineConfirmModal({ isOpen, req, onClose, onConfirm, loading }) {
  if (!req) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Decline Request?" size="sm">
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        You're declining the request for <strong>{req.patientName}</strong> at <strong>{req.hospitalName}</strong>.
        This is perfectly fine — other eligible donors may still respond.
      </p>
      <div className="modal-footer">
        <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} loading={loading} icon={<XCircle size={14} />}>
          Yes, Decline
        </Button>
      </div>
    </Modal>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function BloodRequestsPage() {
  const { donor, refreshDonor } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('ACTIVE'); // 'ACTIVE' | 'ACCEPTED' | 'DECLINED'
  const [acceptModal, setAcceptModal] = useState(null); // req object
  const [declineModal, setDeclineModal] = useState(null); // req object
  const [responding, setResponding] = useState(false);

  const fetchRequests = () => {
    setLoading(true);
    getBloodRequests()
      .then((res) => setRequests(res.data.bloodRequests || []))
      .catch((err) => {
        console.error('Failed to load blood requests:', err);
        toast.error('Failed to load blood requests. Please refresh.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Always refresh donor profile from server on mount so eligibility is never stale
    refreshDonor();
    fetchRequests();
  }, []);

  const handleAccept = async () => {
    if (!acceptModal) return;
    setResponding(true);
    try {
      await respondToBloodRequest(acceptModal._id, { response: 'ACCEPTED' });
      toast.success('✅ You accepted this blood request! Recipient contact information is now available.');
      setAcceptModal(null);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept. Please try again.');
    } finally {
      setResponding(false);
    }
  };

  const handleDecline = async () => {
    if (!declineModal) return;
    setResponding(true);
    try {
      await respondToBloodRequest(declineModal._id, { response: 'DECLINED' });
      toast.success('Request declined.');
      setDeclineModal(null);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline. Please try again.');
    } finally {
      setResponding(false);
    }
  };

  if (loading) return <SpinnerCenter />;

  // Partition requests
  // NOTE: _myResponse can be null (never notified), 'PENDING' (notified, no action yet),
  //       'ACCEPTED', or 'DECLINED'. Treat null and PENDING both as "awaiting action".
  const accepted = requests.filter((r) => r._myResponse === 'ACCEPTED');
  const declined = requests.filter((r) => r._myResponse === 'DECLINED');
  const active   = requests.filter((r) => !r._myResponse || r._myResponse === 'PENDING');

  const applySearchFilter = (list) => {
    return list.filter((r) => {
      const matchSearch = !search ||
        r.patientName?.toLowerCase().includes(search.toLowerCase()) ||
        r.hospitalName?.toLowerCase().includes(search.toLowerCase()) ||
        r.bloodGroup?.includes(search.toUpperCase());
      const matchFilter = filter === 'ALL' || r.bloodGroup === filter || r.urgency === filter;
      return matchSearch && matchFilter;
    });
  };

  const urgencyOrder = { EMERGENCY: 0, URGENT: 1, NORMAL: 2 };
  const sortByUrgency = (list) =>
    [...list].sort((a, b) => (urgencyOrder[a.urgency] ?? 9) - (urgencyOrder[b.urgency] ?? 9));

  const displayList = sortByUrgency(applySearchFilter(
    activeTab === 'ACCEPTED' ? accepted :
    activeTab === 'DECLINED' ? declined :
    active
  ));

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Blood Requests</h1>
        <p className="page-subtitle">
          Help save lives. Your blood group:{' '}
          <strong style={{ color: 'var(--primary-400)' }}>{donor?.bloodGroup || '—'}</strong>
        </p>
      </div>

      {/* ── Summary stats ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '0.75rem',
        marginBottom: '1.5rem',
      }}>
        {[
          { label: 'Pending', count: active.length, icon: <Clock size={16} />, color: 'var(--primary-400)', tab: 'ACTIVE' },
          { label: 'Accepted', count: accepted.length, icon: <CheckCircle size={16} />, color: 'var(--accent-400)', tab: 'ACCEPTED' },
          { label: 'Declined', count: declined.length, icon: <XCircle size={16} />, color: 'var(--text-muted)', tab: 'DECLINED' },
        ].map(({ label, count, icon, color, tab }) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.875rem',
              background: activeTab === tab ? 'var(--bg-elevated)' : 'var(--bg-card)',
              border: activeTab === tab ? `1px solid ${color}40` : '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ color, marginBottom: '0.25rem' }}>{icon}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{count}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-3" style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: '1 1 240px' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            placeholder="Search by patient, hospital, blood group…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="tabs" style={{ flexWrap: 'wrap' }}>
          {['ALL', 'EMERGENCY', 'URGENT', 'NORMAL'].map((u) => (
            <button
              key={u}
              className={`tab-item ${filter === u ? 'active' : ''}`}
              onClick={() => setFilter(u)}
            >
              {u === 'ALL' ? 'All Urgency' : u.charAt(0) + u.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab description ── */}
      {activeTab === 'ACCEPTED' && accepted.length > 0 && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.625rem 1rem',
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8125rem',
          color: 'var(--accent-400)',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <Unlock size={14} />
          You have accepted {accepted.length} request{accepted.length > 1 ? 's' : ''}. Recipient contact details are available below.
        </div>
      )}
      {activeTab === 'ACTIVE' && active.length > 0 && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.625rem 1rem',
          background: 'rgba(220,38,38,0.06)',
          border: '1px solid rgba(220,38,38,0.15)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8125rem',
          color: 'var(--text-muted)',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <Lock size={14} />
          Recipient contact details are hidden until you accept a request.
        </div>
      )}

      {/* ── Request cards grid ── */}
      {displayList.length === 0 ? (
        <Card>
          <div className="empty-state">
            <div className="empty-icon">
              {activeTab === 'ACCEPTED' ? <CheckCircle size={24} /> :
               activeTab === 'DECLINED' ? <XCircle size={24} /> :
               <Droplet size={24} />}
            </div>
            <div className="empty-title">
              {activeTab === 'ACCEPTED' ? 'No accepted requests yet' :
               activeTab === 'DECLINED' ? 'No declined requests' :
               'No active requests found'}
            </div>
            <div className="empty-desc">
              {activeTab === 'ACCEPTED' ? 'Accept a blood request to help a patient in need' :
               activeTab === 'DECLINED' ? 'Your declined requests will appear here' :
               search || filter !== 'ALL' ? 'Try adjusting your search or filters' :
               'No blood requests matching your blood group right now'}
            </div>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {displayList.map((req) => (
            <RequestCard
              key={req._id}
              req={req}
              donor={donor}
              onAccept={(r) => setAcceptModal(r)}
              onDecline={(r) => setDeclineModal(r)}
            />
          ))}
        </div>
      )}

      {/* ── Accept Modal ── */}
      <AcceptConfirmModal
        isOpen={!!acceptModal}
        req={acceptModal}
        onClose={() => setAcceptModal(null)}
        onConfirm={handleAccept}
        loading={responding}
      />

      {/* ── Decline Modal ── */}
      <DeclineConfirmModal
        isOpen={!!declineModal}
        req={declineModal}
        onClose={() => setDeclineModal(null)}
        onConfirm={handleDecline}
        loading={responding}
      />
    </div>
  );
}
