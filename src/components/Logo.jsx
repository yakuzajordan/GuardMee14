import { Link } from 'react-router-dom';

export default function Logo({ size = 'md', showText = true }) {
  const sizes = { sm: 'w-7 h-7', md: 'w-9 h-9', lg: 'w-12 h-12' };
  const textSizes = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' };

  return (
    <Link
      to="/"
      className="flex items-center gap-2 group transition-transform duration-200 active:scale-95 select-none"
    >
      <div className={`${sizes[size]} relative flex-shrink-0 transition-transform duration-300 group-hover:scale-110`}>
        <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-md">
          <defs>
            <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E53E3E" />
              <stop offset="100%" stopColor="#C53030" />
            </linearGradient>
            <linearGradient id="dotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2B6CB0" />
              <stop offset="100%" stopColor="#2C5282" />
            </linearGradient>
          </defs>
          <path
            d="M32 4L8 14v16c0 14 10.4 27.2 24 30 13.6-2.8 24-16 24-30V14L32 4z"
            fill="url(#shieldGrad)"
          />
          <circle cx="32" cy="28" r="9" fill="white" opacity="0.95" />
          <circle cx="32" cy="28" r="5" fill="url(#dotGrad)" />
        </svg>
      </div>

      {showText && (
        <span className={`font-extrabold tracking-tight ${textSizes[size]} leading-none`}>
          <span className="text-urgence">Guard</span>
          <span className="text-securite">Mee</span>
        </span>
      )}
    </Link>
  );
}
