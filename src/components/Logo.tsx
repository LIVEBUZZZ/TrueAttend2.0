import { cx } from '../lib/utils';

/** TrueAttend shield-checkmark logo mark. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  const id = `ta-grad-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="TrueAttend"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill={`url(#${id})`} />
      <path
        d="M32 12 L48 18 V31 C48 40.5 41.2 48.2 32 52 C22.8 48.2 16 40.5 16 31 V18 Z"
        fill="#ffffff"
        opacity="0.16"
      />
      <path
        d="M22.5 32.5 L29 39 L42 25"
        fill="none"
        stroke="#ffffff"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  size = 32,
  withTagline = false,
  className,
}: {
  size?: number;
  withTagline?: boolean;
  className?: string;
}) {
  return (
    <span className={cx('flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      <span className="leading-tight">
        <span className="block text-[17px] font-extrabold tracking-tight text-slate-900">
          True<span className="text-primary-600">Attend</span>
        </span>
        {withTagline ? (
          <span className="block text-[10.5px] font-medium uppercase tracking-[0.14em] text-slate-400">
            Clear &amp; Authentic Attendance
          </span>
        ) : null}
      </span>
    </span>
  );
}
