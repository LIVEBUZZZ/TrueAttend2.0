import { Badge, type BadgeTone } from './ui';
import type { AttendanceStatus, VerificationMode } from '../types';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Fingerprint,
  KeyRound,
  QrCode,
  ShieldQuestion,
  UserRoundPen,
} from 'lucide-react';

const STATUS_TONE: Record<AttendanceStatus, BadgeTone> = {
  present: 'verified',
  absent: 'rejected',
  pending: 'pending',
  rejected: 'rejected',
};

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  pending: 'Pending',
  rejected: 'Rejected',
};

const STATUS_ICON: Record<AttendanceStatus, typeof CheckCircle2> = {
  present: CheckCircle2,
  absent: AlertTriangle,
  pending: Clock3,
  rejected: ShieldQuestion,
};

export function StatusBadge({ status }: { status: AttendanceStatus }) {
  const Icon = STATUS_ICON[status];
  return (
    <Badge tone={STATUS_TONE[status]}>
      <Icon size={12} strokeWidth={2.6} />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export const MODE_LABEL: Record<VerificationMode, string> = {
  qr_token: 'Dynamic QR / Token',
  credentials: 'Credentials',
  biometric_check: 'Webcam Face Check',
};

export const MODE_SHORT: Record<VerificationMode, string> = {
  qr_token: 'QR / Token',
  credentials: 'ID + PIN',
  biometric_check: 'Face Check',
};

export function ModeIcon({
  mode,
  size = 14,
  className,
}: {
  mode: VerificationMode | 'manual';
  size?: number;
  className?: string;
}) {
  const Icon =
    mode === 'qr_token'
      ? QrCode
      : mode === 'credentials'
        ? KeyRound
        : mode === 'biometric_check'
          ? Fingerprint
          : UserRoundPen;
  return <Icon size={size} className={className} />;
}

export function MethodBadge({ method }: { method: VerificationMode | 'manual' }) {
  const label = method === 'manual' ? 'Manual override' : MODE_LABEL[method];
  return (
    <Badge tone={method === 'manual' ? 'pending' : 'info'}>
      <ModeIcon mode={method} size={12} />
      {label}
    </Badge>
  );
}
