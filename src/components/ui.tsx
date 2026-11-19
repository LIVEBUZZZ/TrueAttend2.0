import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cx } from '../lib/utils';

// --- Button -----------------------------------------------------------------
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm',
  secondary: 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-rejected-600 text-white hover:bg-rejected-700 shadow-sm',
  success: 'bg-verified-600 text-white hover:bg-verified-700 shadow-sm',
};
const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button className={cx('ta-btn', VARIANTS[variant], SIZES[size], className)} {...rest}>
      {children}
    </button>
  );
}

// --- Card -------------------------------------------------------------------
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('ta-card', className)}>{children}</div>;
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3.5 sm:px-5">
      <div className="flex items-start gap-3">
        {icon ? (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            {icon}
          </span>
        ) : null}
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

// --- Badge ------------------------------------------------------------------
export type BadgeTone = 'neutral' | 'primary' | 'verified' | 'pending' | 'rejected' | 'info';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-600',
  primary: 'bg-primary-50 text-primary-700',
  verified: 'bg-verified-50 text-verified-700',
  pending: 'bg-pending-50 text-pending-700',
  rejected: 'bg-rejected-50 text-rejected-700',
  info: 'bg-sky-50 text-sky-700',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return <span className={cx('ta-chip', TONES[tone], className)}>{children}</span>;
}

// --- Stat card --------------------------------------------------------------
export function StatCard({
  label,
  value,
  hint,
  tone = 'neutral',
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: BadgeTone;
  icon?: ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        {icon ? (
          <span className={cx('flex h-7 w-7 items-center justify-center rounded-lg', TONES[tone])}>
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-2 text-2xl font-bold tabular text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </Card>
  );
}

// --- Progress ---------------------------------------------------------------
export function Progress({
  value,
  tone = 'primary',
  className,
}: {
  value: number;
  tone?: 'primary' | 'verified' | 'pending' | 'rejected';
  className?: string;
}) {
  const colors = {
    primary: 'bg-primary-600',
    verified: 'bg-verified-500',
    pending: 'bg-pending-500',
    rejected: 'bg-rejected-500',
  } as const;
  return (
    <div className={cx('h-2 w-full overflow-hidden rounded-full bg-slate-100', className)}>
      <div
        className={cx('h-full rounded-full transition-all duration-500', colors[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// --- Modal ------------------------------------------------------------------
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  const width = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }[size];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          'relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-pop animate-fade-in sm:rounded-2xl',
          width,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// --- Field ------------------------------------------------------------------
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="ta-label">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

// --- Empty state ------------------------------------------------------------
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
      {icon ? <div className="text-slate-400">{icon}</div> : null}
      <div>
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

// --- Avatar -----------------------------------------------------------------
export function Avatar({
  name,
  color,
  size = 36,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  const parts = name.trim().split(' ').filter(Boolean);
  const label = `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.36 }}
    >
      {label}
    </span>
  );
}
