import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Heart, Calendar, Droplet, FileText,
  Users, ClipboardList, Stethoscope, LogOut, User,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const donorNav = [
  { label: 'Dashboard',      to: '/donor/dashboard',     icon: LayoutDashboard },
  { label: 'Blood Requests', to: '/donor/blood-requests', icon: Droplet },
  { label: 'Appointments',   to: '/donor/appointments',   icon: Calendar },
  { label: 'Health Reports', to: '/donor/health-reports', icon: FileText },
];

const recipientNav = [
  { label: 'Dashboard',    to: '/recipient/dashboard',    icon: LayoutDashboard },
  { label: 'New Request',  to: '/recipient/new-request',  icon: Droplet },
  { label: 'My Requests',  to: '/recipient/my-requests',  icon: ClipboardList },
];

const adminNav = [
  { label: 'Dashboard',      to: '/admin/dashboard',        icon: LayoutDashboard },
  { label: 'Donors',         to: '/admin/donors',           icon: Users },
  { label: 'Blood Requests', to: '/admin/blood-requests',   icon: Droplet },
  { label: 'Appointments',   to: '/admin/appointments',     icon: Calendar },
  { label: 'Doctors',        to: '/admin/doctors',          icon: Stethoscope },
];

export function Sidebar() {
  const { user, logout, isDonor, isRecipient, isAdmin } = useAuth();

  const navItems = isDonor ? donorNav : isRecipient ? recipientNav : adminNav;

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Heart size={16} fill="currentColor" />
        </div>
        <span className="logo-text">HealthBridge</span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <span className="nav-section-label">
          {isDonor ? 'Donor Portal' : isRecipient ? 'Recipient Portal' : 'Admin Portal'}
        </span>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={17} className="nav-icon" />
              {item.label}
            </NavLink>
          );
        })}

        <span className="nav-section-label" style={{ marginTop: '1rem' }}>Account</span>
        <NavLink
          to="/profile"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <User size={17} className="nav-icon" />
          Profile
        </NavLink>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{initials}</div>
          <div>
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role?.toLowerCase()}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="nav-item"
          style={{ color: 'var(--text-muted)', marginTop: '0.25rem', width: '100%' }}
        >
          <LogOut size={17} className="nav-icon" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
