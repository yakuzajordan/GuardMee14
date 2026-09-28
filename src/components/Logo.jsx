import { Link } from 'react-router-dom';

export default function Logo({ size = 'md', showText = true }) {
  const sizes = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-14 h-14' };
  return (
    <Link
      to="/"
      className="flex items-center gap-2.5 group transition-transform duration-200 active:scale-95"
    >
      <div className={`${sizes[size]} relative transition-transform duration-300 group-hover:scale-105`}>
        <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-sm">
          <path d="M32 4L8 14v16c0 14 10.4 27.2 24 30 13.6-2.8 24-16 24-30V14L32 4z" fill="#E53E3E"/>
          <circle cx="32" cy="28" r="8" fill="white"/>
          <circle cx="32" cy="28" r="4" fill="#2B6CB0"/>
        </svg>
      </div>
      {showText && (
        <span className="font-bold text-lg tracking-tight">
          <span className="text-urgence">Guard</span>
          <span className="text-securite">Mee</span>
        </span>
      )}
    </Link>
  );
}
