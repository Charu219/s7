import { useAuth } from '../../context/AuthContext';
import { NotificationBell } from '../ui/NotificationBell';

export function Navbar({ pageTitle }) {
  const { user } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-left">
        {pageTitle && (
          <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {pageTitle}
          </h1>
        )}
      </div>
      <div className="navbar-right">
        <NotificationBell user={user} />
        <div className="user-avatar" style={{ width: '2rem', height: '2rem', fontSize: '0.7rem' }}>
          {user?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
        </div>
      </div>
    </header>
  );
}
