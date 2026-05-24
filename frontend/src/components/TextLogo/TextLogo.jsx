import { Link } from 'react-router-dom';
import { useTheme } from '../../theme';

export default function TextLogo({ className = '' }) {
  const { isDarkMode } = useTheme();
  return (
    <Link
      to="/"
      aria-label="PrivyNote — home"
      className={`inline-flex items-center gap-2 no-underline ${className}`}
    >
      <img
        src={isDarkMode ? '/logodark.png' : '/logolight.png'}
        alt=""
        aria-hidden="true"
        className="w-8 h-8 object-contain shrink-0 sm:w-7 sm:h-7"
      />
      <span className="text-[1rem] font-bold tracking-tight text-fg font-heading leading-none">
        PrivyNote
      </span>
    </Link>
  );
}
