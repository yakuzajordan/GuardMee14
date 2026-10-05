export default function Card({
  children,
  className = '',
  hover = false,
  padding = true,
  onClick,
  ...props
}) {
  const interactive = hover || onClick;
  return (
    <div
      onClick={onClick}
      className={[
        'bg-white/85 backdrop-blur-sm rounded-2xl border border-gray-200/80',
        'shadow-sm shadow-gray-100/80',
        padding ? 'p-5 sm:p-6' : '',
        interactive ? 'card-hover cursor-pointer' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
