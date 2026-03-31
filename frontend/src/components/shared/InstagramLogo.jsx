import { useId } from 'react';
import { Link } from 'react-router-dom';

const InstagramLogo = ({ className = '' }) => {
  const gradientId = useId();

  return (
    <Link
      to="/feed"
      className={`inline-flex items-center gap-3 ${className}`}
      aria-label="Instagram Home"
    >
      <svg viewBox="0 0 48 48" className="h-8 w-8 shrink-0" role="img" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#feda75" />
            <stop offset="24%" stopColor="#fa7e1e" />
            <stop offset="58%" stopColor="#d62976" />
            <stop offset="80%" stopColor="#962fbf" />
            <stop offset="100%" stopColor="#4f5bd5" />
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="36" height="36" rx="11" fill={`url(#${gradientId})`} />
        <rect x="13.5" y="13.5" width="21" height="21" rx="7" fill="none" stroke="white" strokeWidth="2.8" />
        <circle cx="24" cy="24" r="5.8" fill="none" stroke="white" strokeWidth="2.8" />
        <circle cx="31.2" cy="16.8" r="1.9" fill="white" />
      </svg>
      <span className="font-instagram ig-logo-gradient text-[2.35rem] leading-none">Instagram</span>
    </Link>
  );
};

export default InstagramLogo;
