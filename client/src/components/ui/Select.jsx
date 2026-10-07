import { forwardRef } from 'react';

export const Select = forwardRef(function Select(
  { label, error, hint, options = [], placeholder, className = '', id, ...props },
  ref
) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="form-group">
      {label && <label className="form-label" htmlFor={selectId}>{label}</label>}
      <select
        ref={ref}
        id={selectId}
        className={`form-select ${error ? 'error' : ''} ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) =>
          typeof opt === 'string'
            ? <option key={opt} value={opt}>{opt}</option>
            : <option key={opt.value} value={opt.value}>{opt.label}</option>
        )}
      </select>
      {error && <span className="form-error">{error}</span>}
      {hint && !error && <span className="form-hint">{hint}</span>}
    </div>
  );
});
