import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, User, UserCircle } from 'lucide-react';

// @ts-ignore
import heroImage from '../utils/Images/krishna-embrace.jpg';

type Mode = 'signin' | 'signup';

const friendlyError = (err: any): string => {
  switch (err?.code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in cancelled.';
    case 'auth/operation-not-allowed':
      return 'Email sign-in is not enabled yet.';
    case 'auth/unauthorized-domain':
      return `Add "${window.location.hostname}" to Firebase authorized domains.`;
    default:
      return err?.message || 'Something went wrong.';
  }
};

/** Warm, softly-bordered input used only on this page */
const inputCls =
  'block w-full rounded-2xl border border-sandal-300/80 bg-white/80 py-3.5 pl-11 pr-4 text-[15px] text-maroon-900 placeholder:text-maroon-900/35 shadow-[0_1px_2px_rgba(67,27,17,0.04)] transition duration-200 focus:border-marigold-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-marigold-400/20';
const iconCls = 'pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-maroon-900/35';

/** Staggered entrance helper */
const rise = (i: number): React.CSSProperties => ({ animationDelay: `${120 + i * 70}ms` });

const Login: React.FC = () => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, loginAsGuest } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<'email' | 'google' | 'guest' | 'reset' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setNotice(null);
  };

  const run = async (kind: NonNullable<typeof busy>, fn: () => Promise<void>) => {
    setError(null);
    setNotice(null);
    setBusy(kind);
    try {
      await fn();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup' && !name.trim()) return setError('Please enter your name.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    run('email', () => (mode === 'signin' ? signInWithEmail(email, password) : signUpWithEmail(name, email, password)));
  };

  const handleReset = () => {
    if (!email.trim()) return setError('Enter your email first.');
    run('reset', async () => {
      await resetPassword(email);
      setNotice('Reset link sent! Check your inbox — and your spam or promotions folder, too.');
    });
  };

  const handleGuest = async () => {
    setBusy('guest');
    await loginAsGuest();
  };

  const disabled = busy !== null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-sandal-100 lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Soft ambient glow */}
      <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-marigold-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 right-1/4 h-[420px] w-[420px] rounded-full bg-rose-300/15 blur-3xl" />

      {/* ---------------------------------------------------------- */}
      {/* Image                                                       */}
      {/* ---------------------------------------------------------- */}
      <section className="relative lg:h-screen lg:p-4">
        <div className="relative h-72 overflow-hidden sm:h-96 lg:h-full lg:rounded-[2rem] lg:shadow-[0_30px_60px_-20px_rgba(67,27,17,0.45)]">
          <img
            src={heroImage}
            alt="Sri Krishna with His friends"
            className="motion-safe-only absolute inset-0 h-full w-full animate-slow-zoom object-cover object-[50%_22%]"
          />
          {/* warm tint + readable bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-maroon-900/80 via-maroon-900/10 to-transparent" />
          <div className="absolute inset-0 bg-marigold-400/10 mix-blend-soft-light" />

          <div className="absolute inset-x-0 bottom-0 px-6 pb-14 sm:px-10 lg:px-12 lg:pb-12">
            <p className="motion-safe-only animate-rise-in font-elegant text-4xl font-semibold text-sandal-50 sm:text-5xl" style={rise(0)}>
              Sadhana Sang
            </p>
            <p
              className="motion-safe-only mt-2 max-w-sm text-balance animate-rise-in font-elegant text-base italic leading-snug text-sandal-200/90 sm:text-xl"
              style={rise(1)}
            >
              A sacred space to practise, learn, reflect, and grow together on the path of devotion.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Form                                                        */}
      {/* ---------------------------------------------------------- */}
      <section className="relative z-10 -mt-8 flex justify-center px-4 pb-12 lg:mt-0 lg:items-center lg:px-14 lg:py-12">
        <div className="w-full max-w-[400px] rounded-[1.75rem] bg-sandal-50/95 p-6 shadow-[0_20px_50px_-20px_rgba(67,27,17,0.35)] ring-1 ring-sandal-300/60 backdrop-blur sm:p-8 lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0 lg:backdrop-blur-0">
          {/* Heading */}
          <div className="motion-safe-only animate-rise-in" style={rise(1)}>
            <div className="mb-4 flex items-center gap-2">
              <span className="h-px w-8 bg-gradient-to-r from-marigold-500 to-transparent" />
              <span className="font-elegant text-xl italic text-maroon-500">Hare Krishna</span>
            </div>
            <h1 className="font-elegant text-4xl font-semibold tracking-normal text-maroon-900 sm:text-[2.6rem]">
              {mode === 'signin' ? 'Welcome back' : 'Begin your journey'}
            </h1>
          </div>

          {/* Mode switch */}
          <div
            className="motion-safe-only relative mt-7 grid animate-rise-in grid-cols-2 rounded-2xl bg-sandal-200/70 p-1"
            style={rise(2)}
          >
            <span
              className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-xl bg-white shadow-[0_1px_3px_rgba(67,27,17,0.12)] transition-transform duration-300 ease-out ${
                mode === 'signup' ? 'translate-x-full' : ''
              }`}
            />
            {(['signin', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`relative z-10 rounded-xl py-2 text-sm font-semibold transition-colors duration-300 ${
                  mode === m ? 'text-maroon-800' : 'text-maroon-900/45 hover:text-maroon-900/70'
                }`}
              >
                {m === 'signin' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3.5" noValidate>
            {/* Name — expands smoothly in sign-up mode */}
            <div
              className={`grid transition-all duration-300 ease-out ${
                mode === 'signup' ? 'grid-rows-[1fr] opacity-100' : '-mb-3.5 grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className="relative">
                  <User size={18} className={iconCls} />
                  <input
                    type="text"
                    autoComplete="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputCls}
                    tabIndex={mode === 'signup' ? 0 : -1}
                  />
                </div>
              </div>
            </div>

            <div className="motion-safe-only relative animate-rise-in" style={rise(3)}>
              <Mail size={18} className={iconCls} />
              <input
                type="email"
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                required
              />
            </div>

            <div className="motion-safe-only relative animate-rise-in" style={rise(4)}>
              <Lock size={18} className={iconCls} />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputCls} pr-12`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-maroon-900/40 transition hover:bg-sandal-100 hover:text-maroon-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{ minHeight: 0 }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div
              className={`flex justify-end overflow-hidden transition-all duration-300 ${
                mode === 'signin' ? 'max-h-8 opacity-100' : 'pointer-events-none -mt-3.5 max-h-0 opacity-0'
              }`}
            >
              <button
                type="button"
                onClick={handleReset}
                disabled={disabled || mode !== 'signin'}
                className="text-sm font-medium text-maroon-500 transition hover:text-maroon-700"
                style={{ minHeight: 0 }}
              >
                {busy === 'reset' ? 'Sending…' : 'Forgot password?'}
              </button>
            </div>

            {error && (
              <div className="flex animate-fadeIn items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
                <AlertCircle size={16} className="shrink-0" /> {error}
              </div>
            )}
            {notice && (
              <div className="flex animate-fadeIn items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
                <CheckCircle2 size={16} className="shrink-0" /> {notice}
              </div>
            )}

            <button
              type="submit"
              disabled={disabled}
              className="motion-safe-only group relative flex w-full animate-rise-in items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 via-brand-500 to-marigold-500 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_24px_-8px_rgba(234,88,12,0.6)] transition duration-300 hover:shadow-[0_14px_30px_-8px_rgba(234,88,12,0.7)] active:scale-[0.99] disabled:opacity-60"
              style={rise(5)}
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              {busy === 'email' && <Loader2 size={18} className="animate-spin" />}
              <span className="relative">{mode === 'signin' ? 'Sign in' : 'Create account'}</span>
            </button>
          </form>

          <div className="motion-safe-only my-6 flex animate-rise-in items-center gap-3 text-xs text-maroon-900/40" style={rise(6)}>
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-sandal-300" />
            or continue with
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-sandal-300" />
          </div>

          <div className="motion-safe-only grid animate-rise-in grid-cols-2 gap-3" style={rise(7)}>
            <button
              onClick={() => run('google', signInWithGoogle)}
              disabled={disabled}
              className="flex items-center justify-center gap-2 rounded-2xl border border-sandal-300/80 bg-white/80 py-3 text-sm font-semibold text-maroon-800 transition duration-200 hover:border-sandal-300 hover:bg-white hover:shadow-[0_6px_16px_-8px_rgba(67,27,17,0.3)] disabled:opacity-60"
            >
              {busy === 'google' ? (
                <Loader2 size={18} className="animate-spin text-brand-600" />
              ) : (
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="h-[18px] w-[18px]" />
              )}
              Google
            </button>
            <button
              onClick={handleGuest}
              disabled={disabled}
              className="flex items-center justify-center gap-2 rounded-2xl border border-sandal-300/80 bg-white/80 py-3 text-sm font-semibold text-maroon-800 transition duration-200 hover:border-sandal-300 hover:bg-white hover:shadow-[0_6px_16px_-8px_rgba(67,27,17,0.3)] disabled:opacity-60"
            >
              {busy === 'guest' ? <Loader2 size={18} className="animate-spin text-brand-600" /> : <UserCircle size={18} className="text-maroon-500" />}
              Guest
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Login;
