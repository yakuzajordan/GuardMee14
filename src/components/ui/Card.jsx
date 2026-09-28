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
      className={`
        bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/80
        shadow-sm shadow-gray-200/50
        ${padding ? 'p-5 sm:p-6' : ''}
        ${interactive ? 'card-hover cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
