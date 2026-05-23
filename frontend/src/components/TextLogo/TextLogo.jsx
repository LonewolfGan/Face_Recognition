import { Link } from 'react-router-dom';
import { useTheme } from '../../theme';
import './TextLogo.css';

export default function TextLogo({ className = '' }) {
  const { isDarkMode } = useTheme();
  return (
    <Link to="/" className={`text-logo ${className}`} aria-label="PrivyNote — accueil">
      <img
        src={isDarkMode ? '/logodark.png' : '/logolight.png'}
        alt=""
        aria-hidden="true"
        className="text-logo__img"
      />
      <span className="text-logo__name">PrivyNote</span>
    </Link>
  );
}
