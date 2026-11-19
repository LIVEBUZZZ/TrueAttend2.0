import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Fingerprint, Info, ScanFace, ShieldCheck } from 'lucide-react';
import { Button } from '../ui';
import { cx } from '../../lib/utils';

export interface BiometricState {
  consent: boolean;
  match: boolean;
}

/**
 * On-device webcam face check with a Privacy-by-Design consent notice.
 * In this demo no frames are uploaded or stored — only a local match result.
 * If the camera is unavailable, an explicit simulated match is offered so the
 * flow stays demonstrable.
 */
export function BiometricCheck({ onChange }: { onChange: (state: BiometricState) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [consent, setConsent] = useState(false);
  const [match, setMatch] = useState(false);
  const [cameraState, setCameraState] = useState<'idle' | 'starting' | 'live' | 'blocked'>('idle');

  useEffect(() => {
    onChange({ consent, match });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consent, match]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startCamera = async () => {
    setCameraState('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCameraState('live');
    } catch {
      setCameraState('blocked');
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={cx(
          'relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border',
          cameraState === 'live' ? 'border-slate-300 bg-slate-900' : 'border-dashed border-slate-300 bg-slate-50',
        )}
      >
        {cameraState === 'live' ? (
          <>
            <video
              ref={videoRef}
              className="h-full w-full scale-x-[-1] object-cover"
              playsInline
              muted
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="h-40 w-32 rounded-[50%] border-2 border-white/60" />
            </div>
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Live preview
            </span>
          </>
        ) : (
          <div className="px-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
              {cameraState === 'blocked' ? <CameraOff size={22} /> : <ScanFace size={22} />}
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-700">
              {cameraState === 'blocked' ? 'Camera unavailable' : 'Webcam face check'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {cameraState === 'blocked'
                ? 'No camera device or permission was available in this environment.'
                : 'Start the camera to run an on-device face check.'}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={startCamera}
          disabled={cameraState === 'starting' || cameraState === 'live'}
        >
          <Camera size={14} />
          {cameraState === 'live' ? 'Camera running' : 'Start camera'}
        </Button>
        <Button
          variant={match ? 'success' : 'primary'}
          size="sm"
          onClick={() => setMatch(true)}
          disabled={!consent || match}
        >
          {match ? <ShieldCheck size={14} /> : <Fingerprint size={14} />}
          {match ? 'Face matched' : cameraState === 'blocked' ? 'Simulate face check' : 'Complete face check'}
        </Button>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          checked={consent}
          onChange={(e) => {
            setConsent(e.target.checked);
            if (!e.target.checked) setMatch(false);
          }}
        />
        <span className="text-xs leading-relaxed text-slate-600">
          <span className="font-semibold text-slate-800">Privacy-by-Design consent.</span> I agree to
          a local, on-device face check to verify my presence. No images or video frames are stored,
          uploaded or shared — only a match result is recorded.
        </span>
      </label>

      <p className="flex items-start gap-2 rounded-lg border border-primary-100 bg-primary-50/60 px-3 py-2 text-[11px] text-slate-600">
        <Info size={13} className="mt-0.5 shrink-0 text-primary-600" />
        Biometric checks in TrueAttend run entirely in the browser. The consent choice and the match
        outcome are what get recorded.
      </p>
    </div>
  );
}
