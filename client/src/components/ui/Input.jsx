import { forwardRef } from 'react';

export const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    icon,
    iconRight,
    onIconRightClick,
    className = '',
    id,
    ...props
  },
  ref
) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="form-group">
      {label && <label className="form-label" htmlFor={inputId}>{label}</label>}
      <div className="input-wrapper">
        {icon && <span className="input-icon">{icon}</span>}
        <input
          ref={ref}
          id={inputId}
          className={`form-input ${icon ? '' : ''} ${iconRight ? 'has-icon-right' : ''} ${error ? 'error' : ''} ${className}`}
          style={icon ? { paddingLeft: '2.5rem' } : {}}
          {...props}
        />
        {iconRight && (
          <span
            className="input-icon input-icon-right"
            onClick={onIconRightClick}
            role={onIconRightClick ? 'button' : undefined}
          >
            {iconRight}
          </span>
        )}
      </div>
      {error && <span className="form-error">{error}</span>}
      {hint && !error && <span className="form-hint">{hint}</span>}
    </div>
  );
});
