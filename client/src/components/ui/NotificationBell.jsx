import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, BellOff, Check, CheckCheck, Droplet,
  Calendar, FileText, Activity, AlertCircle, Info,
  X, Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '../../context/NotificationContext';

/* ── Icon per notification type ─────────────────────────────── */
const TYPE_CONFIG = {
  BLOOD_REQUEST:       { icon: Droplet,       color: '#e11d48', bg: 'rgba(225,29,72,0.1)',   label: 'Blood Request' },
  REQUEST_ACCEPTED:    { icon: Check,          color: '#16a34a', bg: 'rgba(22,163,74,0.1)',   label: 'Accepted' },
  CONTACT_SHARED:      { icon: Check,          color: '#16a34a', bg: 'rgba(22,163,74,0.1)',   label: 'Contact Shared' },
  DONATION_COMPLETED:  { icon: CheckCheck,     color: '#16a34a', bg: 'rgba(22,163,74,0.1)',   label: 'Completed' },
  APPOINTMENT:         { icon: Calendar,       color: '#0284c7', bg: 'rgba(14,165,233,0.1)',  label: 'Appointment' },
  HEALTH_REPORT:       { icon: FileText,       color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', label: 'Health Report' },
  STATUS_CHANGE:       { icon: Activity,       color: '#d97706', bg: 'rgba(217,119,6,0.1)',  label: 'Status Update' },
  EMERGENCY:           { icon: AlertCircle,    color: '#dc2626', bg: 'rgba(220,38,38,0.15)', label: 'Emergency' },
  REGISTRATION:        { icon: Info,           color: '#0284c7', bg: 'rgba(14,165,233,0.1)', label: 'Registration' },
  QUESTIONNAIRE_REMINDER: { icon: FileText,   color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', label: 'Reminder' },
  HEALTH_CHECK_REMINDER:  { icon: Calendar,   color: '#0284c7', bg: 'rgba(14,165,233,0.1)', label: 'Reminder' },
  GENERAL:             { icon: Info,           color: '#6b7280', bg: 'rgba(107,114,128,0.1)', label: 'Info' },
};

/* ── Navigate target per type ───────────────────────────────── */
const getNavTarget = (notification, user) => {
  const role = user?.role?.toLowerCase();
  switch (notification.type) {
    case 'BLOOD_REQUEST':
      return role === 'donor' ? `/${role}/blood-requests` : `/${role}/my-requests`;
    case 'REQUEST_ACCEPTED':
    case 'CONTACT_SHARED':
    case 'DONATION_COMPLETED':
      return role === 'donor' ? `/${role}/blood-requests` : `/${role}/my-requests`;
    case 'APPOINTMENT':
      return `/${role}/appointments`;
    case 'HEALTH_REPORT':
      return `/${role}/health-reports`;
    case 'STATUS_CHANGE':
      return role === 'donor' ? `/${role}/health-reports` : null;
    default:
      return null;
  }
};

/* ── Single notification row ────────────────────────────────── */
function NotifItem({ notification, user, onRead }) {
  const navigate = useNavigate();
  const cfg = TYPE_CONFIG[notification.type] || TYPE_CONFIG.GENERAL;
  const Icon = cfg.icon;
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });
  const target = getNavTarget(notification, user);

  const handleClick = () => {
    if (!notification.isRead) onRead(notification._id);
    if (target) navigate(target);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleClick}
      style={{
        display: 'flex',
        gap: '0.75rem',
        padding: '0.875rem 1rem',
        cursor: target || !notification.isRead ? 'pointer' : 'default',
        background: notification.isRead ? 'transparent' : 'rgba(225,29,72,0.04)',
        borderBottom: '1px solid var(--border)',
        transition: 'background 150ms',
        position: 'relative',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elevated)'}
      onMouseLeave={(e) => e.currentTarget.style.background = notification.isRead ? 'transparent' : 'rgba(225,29,72,0.04)'}
    >
      {/* Unread indicator */}
      {!notification.isRead && (
        <div style={{
          position: 'absolute',
          left: 0, top: 0, bottom: 0,
          width: '3px',
          background: 'var(--primary-500)',
          borderRadius: '0 2px 2px 0',
        }} />
      )}

      {/* Icon */}
      <div style={{
        width: '2.25rem',
        height: '2.25rem',
        borderRadius: '50%',
        background: cfg.bg,
        color: cfg.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={14} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.8125rem',
          fontWeight: notification.isRead ? 500 : 700,
          color: 'var(--text-primary)',
          marginBottom: '0.125rem',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {notification.title}
        </div>
        <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {notification.message}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          marginTop: '0.25rem',
          fontSize: '0.6875rem',
          color: 'var(--text-muted)',
        }}>
          <Clock size={10} />
          {timeAgo}
        </div>
      </div>

      {/* Unread dot */}
      {!notification.isRead && (
        <div style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: 'var(--primary-500)',
          flexShrink: 0,
          alignSelf: 'center',
        }} />
      )}
    </motion.div>
  );
}

/* ── Main bell component ─────────────────────────────────────── */
export function NotificationBell({ user }) {
  const { notifications, unreadCount, loading, fetchNotifications, markOneAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen((v) => {
      if (!v) fetchNotifications(); // refresh on open
      return !v;
    });
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        ref={buttonRef}
        className="btn btn-ghost btn-icon btn-sm"
        aria-label="Notifications"
        onClick={handleOpen}
        style={{ position: 'relative' }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            minWidth: '16px',
            height: '16px',
            background: 'var(--primary-500)',
            color: 'white',
            fontSize: '0.6rem',
            fontWeight: 800,
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
            lineHeight: 1,
            border: '1.5px solid white',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '380px',
              maxWidth: 'calc(100vw - 2rem)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-modal)',
              zIndex: 500,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.875rem 1rem',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-surface)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bell size={16} style={{ color: 'var(--primary-500)' }} />
                <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span style={{
                    background: 'var(--primary-500)',
                    color: 'white',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    borderRadius: '9999px',
                    padding: '0 6px',
                    lineHeight: '18px',
                  }}>
                    {unreadCount}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--primary-600)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.25rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', padding: '0.25rem',
                    borderRadius: 'var(--radius-sm)', display: 'flex',
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* List */}
            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
              {loading && notifications.length === 0 ? (
                <div style={{
                  padding: '2.5rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                }}>
                  Loading…
                </div>
              ) : notifications.length === 0 ? (
                <div style={{
                  padding: '3rem 1rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}>
                  <div style={{
                    width: '3rem', height: '3rem',
                    borderRadius: '50%',
                    background: 'var(--bg-elevated)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-muted)',
                  }}>
                    <BellOff size={20} />
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    No notifications yet
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    You'll see blood request updates, health reports, and appointments here.
                  </div>
                </div>
              ) : (
                notifications.map((n) => (
                  <NotifItem
                    key={n._id}
                    notification={n}
                    user={user}
                    onRead={async (id) => {
                      await markOneAsRead(id);
                    }}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div style={{
                padding: '0.625rem 1rem',
                borderTop: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                textAlign: 'center',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
              }}>
                Showing {notifications.length} most recent · auto-refreshes every 30s
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
