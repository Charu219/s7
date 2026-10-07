export function Card({ children, className = '', style }) {
  return (
    <div className={`card ${className}`} style={style}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="card-header">
      <div>
        <div className="card-title">{title}</div>
        {subtitle && <div className="text-xs text-muted mt-1">{subtitle}</div>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
