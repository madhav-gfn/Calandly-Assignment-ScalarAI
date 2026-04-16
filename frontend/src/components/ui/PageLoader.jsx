export default function PageLoader({ label, compact = false }) {
  return (
    <div className={`loader ${compact ? 'loader--compact' : ''}`}>
      <div className="loader__spinner" />
      <span>{label}</span>
    </div>
  );
}
