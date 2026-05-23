import './FloatingButton.css';

export default function FloatingButton({ onClick, icon, ariaLabel }) {
  return (
    <button
      className="floating-button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {icon || '+'}
    </button>
  );
}
