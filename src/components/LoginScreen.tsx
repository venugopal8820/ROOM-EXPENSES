import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { MEMBERS, MemberName } from '@/types';
import { Home, Mail, Lock, User, AlertCircle, CheckCircle2, UserPlus, LogIn, Eye, EyeOff } from 'lucide-react';

export default function LoginScreen() {
  const { signIn, signUp, isConfigured } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberName | ''>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setSelectedMember('');
    setError('');
    setSuccess('');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedMember) {
      setError('Please select your member name.');
      return;
    }
    if (!email.endsWith('@gmail.com') && !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await signUp(email, password, selectedMember);
      setSuccess('Account created! Check your email for a verification link, then sign in.');
      setMode('signin');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
    } finally {
      setBusy(false);
    }
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-700 flex flex-col items-center justify-center p-5">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8 text-white">
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-3">
              <Home className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Room Expenses</h1>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">Setup Required</h2>
            <p className="text-sm text-gray-600">
              Supabase authentication is not configured. Please add your Supabase credentials to the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">.env</code> file.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-700 flex flex-col items-center justify-center p-5">
      <div className="w-full max-w-sm">
        {/* Logo & Title */}
        <div className="flex flex-col items-center mb-8 text-white">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-3">
            <Home className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Room Expenses</h1>
          <p className="text-blue-100 text-sm mt-1">Shared expense tracker for 4 members</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {/* Mode Tabs */}
          <div className="flex gap-2 mb-5 p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => { setMode('signin'); resetForm(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition ${
                mode === 'signin' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); resetForm(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition ${
                mode === 'signup' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Sign Up
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mb-4 flex items-start gap-2 text-sm text-green-600 bg-green-50 rounded-xl p-3">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Sign In Form */}
          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                <div className="relative mt-1.5">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-800 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Password</label>
                <div className="relative mt-1.5">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-800 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={busy || !email || !password}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-50 disabled:active:scale-100"
              >
                {busy ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          ) : (
            /* Sign Up Form */
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your Name</label>
                <div className="relative mt-1.5">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={selectedMember}
                    onChange={(e) => {
                      const name = e.target.value as MemberName;
                      setSelectedMember(name);
                      // Auto-fill email with member prefix
                      if (name) {
                        setEmail(`${name.toLowerCase()}@gmail.com`);
                      }
                    }}
                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-800 bg-white appearance-none text-sm"
                  >
                    <option value="">Select your name...</option>
                    {MEMBERS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                <div className="relative mt-1.5">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-800 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Password</label>
                <div className="relative mt-1.5">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-800 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Confirm Password</label>
                <div className="relative mt-1.5">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-800 text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={busy || !selectedMember || !email || !password || !confirmPassword}
                className="w-full py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 active:scale-[0.98] transition disabled:opacity-50 disabled:active:scale-100"
              >
                {busy ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-blue-100 text-xs mt-5 leading-relaxed">
          Sign up with your room member name and email.<br />
          All 4 members can track shared expenses together.
        </p>
      </div>
    </div>
  );
}
