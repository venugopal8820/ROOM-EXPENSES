import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { MEMBERS, MemberName } from '@/types';
import { Home, Lock, User, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';

export default function LoginScreen() {
  const { signIn, setLocalPassword, hasLocalPassword } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'login' | 'setup'>('login');
  const [statusByMember, setStatusByMember] = useState<Record<string, boolean>>({});
  const [setupConfirm, setSetupConfirm] = useState('');

  useEffect(() => {
    (async () => {
      const s: Record<string, boolean> = {};
      for (const m of MEMBERS) {
        const u = m.toLowerCase();
        s[u] = await hasLocalPassword(u);
      }
      setStatusByMember(s);
    })();
  }, [hasLocalPassword]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signIn(username, password);
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  const setupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    if (password !== setupConfirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await setLocalPassword(username, password);
      const u = username.toLowerCase();
      setStatusByMember((s) => ({ ...s, [u]: true }));
      setPassword('');
      setSetupConfirm('');
      setMode('login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-700 flex flex-col items-center justify-center p-5">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 text-white">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-3">
            <Home className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Room Expenses</h1>
          <p className="text-blue-100 text-sm mt-1">Shared expense tracker for 4 members</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex gap-2 mb-5 p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                mode === 'login' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('setup')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                mode === 'setup' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'
              }`}
            >
              Set Password
            </button>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Member</label>
                <div className="relative mt-1">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-800 bg-white appearance-none"
                  >
                    <option value="">Select member...</option>
                    {MEMBERS.map((m) => (
                      <option key={m} value={m.toLowerCase()}>
                        {m} {statusByMember[m.toLowerCase()] ? '' : '(set password first)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Password</label>
                <div className="relative mt-1">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-800"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={busy || !username}
                className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 active:scale-[0.99] transition disabled:opacity-50"
              >
                {busy ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={setupPassword} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Member</label>
                <div className="relative mt-1">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-800 bg-white appearance-none"
                  >
                    <option value="">Select member...</option>
                    {MEMBERS.map((m) => (
                      <option key={m} value={m.toLowerCase()}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">New Password</label>
                <div className="relative mt-1">
                  <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 4 characters"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-800"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Confirm Password</label>
                <div className="relative mt-1">
                  <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={setupConfirm}
                    onChange={(e) => setSetupConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-800"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={busy || !username}
                className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 active:scale-[0.99] transition disabled:opacity-50"
              >
                {busy ? 'Saving...' : 'Set Password'}
              </button>
              {username && statusByMember[username.toLowerCase()] && (
                <p className="text-xs text-green-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Password already set for {username}
                </p>
              )}
            </form>
          )}
        </div>

        <p className="text-center text-blue-100 text-xs mt-5">
          Offline-ready. Your session stays active across restarts.
        </p>
      </div>
    </div>
  );
}
