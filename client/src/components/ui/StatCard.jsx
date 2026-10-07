export function StatCard({ icon, label, value, change, gradient, iconBg, iconColor, style }) {
  return (
    <div
      className="stat-card"
      style={{
        '--stat-gradient': gradient,
        '--stat-bg': iconBg,
        '--stat-color': iconColor,
        ...style,
      }}
    >
      <div className="stat-icon">{icon}</div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
      {change && <div className="stat-change">{change}</div>}
    </div>
  );
}
