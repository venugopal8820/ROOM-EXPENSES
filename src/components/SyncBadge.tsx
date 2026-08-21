import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface Props {
  online: boolean;
  syncing: boolean;
  pending: number;
  failed: number;
  onRetry: () => void;
}

export default function SyncBadge({ online, syncing, pending, failed, onRetry }: Props) {
  let label = 'Synced';
  let Icon = CheckCircle2;
  let color = 'text-green-600 bg-green-50';

  if (!online) {
    label = 'Offline';
    Icon = WifiOff;
    color = 'text-gray-500 bg-gray-100';
  } else if (failed > 0) {
    label = 'Sync Failed';
    Icon = AlertCircle;
    color = 'text-red-600 bg-red-50';
  } else if (pending > 0 || syncing) {
    label = syncing ? 'Syncing...' : 'Pending Sync';
    Icon = syncing ? RefreshCw : Clock;
    color = 'text-orange-600 bg-orange-50';
  }

  return (
    <button
      onClick={onRetry}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color} ${
        syncing ? 'pointer-events-none' : 'hover:opacity-80'
      } transition`}
      title={failed > 0 ? 'Tap to retry sync' : 'Sync status'}
    >
      <Icon className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
      <span className="hidden xs:inline">{label}</span>
    </button>
  );
}

export function ExpenseSyncDot({ status }: { status: 'synced' | 'pending' | 'failed' }) {
  const map = {
    synced: { color: 'bg-green-500', label: 'Synced' },
    pending: { color: 'bg-orange-500', label: 'Waiting to sync' },
    failed: { color: 'bg-red-500', label: 'Sync failed' },
  };
  const s = map[status];
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${s.color}`}
      title={s.label}
      aria-label={s.label}
    />
  );
}

export { Wifi, WifiOff };
