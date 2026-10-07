export function Spinner({ size = 'md', className = '' }) {
  return <div className={`spinner spinner-${size} ${className}`} />;
}

export function SpinnerCenter({ size = 'lg' }) {
  return (
    <div className="spinner-center">
      <Spinner size={size} />
    </div>
  );
}
