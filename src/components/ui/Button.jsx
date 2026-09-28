import { Link } from 'react-router-dom';

const variants = {
  primary:
    'bg-securite text-white shadow-md shadow-securite/25 hover:bg-securite-dark hover:shadow-lg hover:shadow-securite/30',
  danger:
    'bg-urgence text-white shadow-md shadow-urgence/25 hover:bg-urgence-dark hover:shadow-lg hover:shadow-urgence/30',
  success:
    'bg-success text-white shadow-md shadow-success/25 hover:brightness-110 hover:shadow-lg',
  outline:
    'border-2 border-securite/30 text-securite bg-white hover:bg-securite/5 hover:border-securite/50',
  ghost:
    'text-gray-600 hover:bg-gray-100 hover:text-securite',
  glass:
    'bg-white/20 text-white backdrop-blur-md border border-white/30 hover:bg-white/30',
  white:
    'bg-white text-securite shadow-md hover:shadow-lg hover:bg-gray-50',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3.5 text-base rounded-xl gap-2',
  icon: 'p-2.5 rounded-xl',
};

const base =
  'inline-flex items-center justify-center font-semibold transition-all duration-200 ease-out select-none touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-securite/50 focus-visible:ring-offset-2 active:scale-[0.96] active:duration-75 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

export default function Button({
  variant = 'primary',
  size = 'md',
  to,
  href,
  loading = false,
  className = '',
  children,
  type = 'button',
  ...props
}) {
  const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

  const content = loading ? (
    <>
      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      <span>{children}</span>
    </>
  ) : (
    children
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer" {...props}>
        {content}
      </a>
    );
  }

  return (
    <button type={type} className={classes} disabled={loading || props.disabled} {...props}>
      {content}
    </button>
  );
}
