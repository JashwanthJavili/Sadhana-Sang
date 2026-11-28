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

const inputCls =
  'block h-12 w-full rounded-xl border border-sandal-300 bg-white pl-11 pr-4 text-[15px] text-maroon-900 placeholder:text-maroon-900/35 transition duration-200 focus:border-marigold-400 focus:outline-none focus:ring-4 focus:ring-marigold-400/20';
const iconCls = 'pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-maroon-900/35';
const secondaryBtn =
  'flex h-12 items-center justify-center gap-2 rounded-xl border border-sandal-300 bg-white text-sm font-semibold text-maroon-900 transition duration-200 hover:bg-sandal-50 active:scale-[0.99] disabled:opacity-60';

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
    <div className="min-h-screen bg-sandal-100 lg:grid lg:grid-cols-[1fr_1.1fr]">
      <section className="relative hidden lg:block lg:h-screen lg:p-4">
        <div className="relative h-full overflow-hidden rounded-[2rem]">
          <img src={heroImage} alt="Sri Krishna with His friends" className="absolute inset-0 h-full w-full object-cover object-[50%_22%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-maroon-900/75 via-maroon-900/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-12 pb-12">
            <p className="font-elegant text-5xl font-semibold text-sandal-50">Sadhana Sang</p>
            <p className="mt-2 max-w-sm font-elegant text-xl italic leading-snug text-sandal-200/90">
              A sacred space to practise, learn, reflect, and grow together on the path of devotion.
            </p>
          </div>
        </div>
      </section>

      <section className="flex justify-center px-4 py-8 lg:items-center lg:px-14">
        <div className="w-full max-w-[420px] animate-rise-in overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-sandal-200">
          <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50 px-6 pb-5 pt-7 text-center sm:px-8">
            <p className="font-elegant text-3xl font-semibold text-maroon-900">Sadhana Sang</p>
            <p className="mt-1 text-sm text-maroon-900/60">Practise, learn and grow together in devotion.</p>
          </div>

          <div className="px-6 pb-7 pt-5 sm:px-8">
            <div className="relative grid grid-cols-2 rounded-xl bg-sandal-100 p-1">
              <span
                className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-sm ring-1 ring-sandal-200 transition-transform duration-300 ease-out ${
                  mode === 'signup' ? 'translate-x-full' : ''
                }`}
              />
              {(['signin', 'signup'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`relative z-10 h-10 rounded-lg text-sm font-semibold transition-colors duration-300 ${
                    mode === m ? 'text-brand-700' : 'text-maroon-900/55 hover:text-maroon-900/80'
                  }`}
                >
                  {m === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>

            <h1 className="mt-5 text-xl font-bold text-maroon-900">{mode === 'signin' ? 'Welcome back' : 'Begin your journey'}</h1>
            <p className="mt-0.5 text-sm text-maroon-900/60">
              {mode === 'signin' ? 'Hare Krishna! Sign in to continue.' : 'Create your account in a few seconds.'}
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-3" noValidate>
              <div className={`grid transition-all duration-300 ease-out ${mode === 'signup' ? 'grid-rows-[1fr] opacity-100' : '-mb-3 grid-rows-[0fr] opacity-0'}`}>
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

              <div className="relative">
                <Mail size={18} className={iconCls} />
                <input type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} required />
              </div>

              <div className="relative">
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
                  className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-maroon-900/40 transition hover:bg-sandal-100 hover:text-maroon-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{ minHeight: 0 }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className={`flex justify-end overflow-hidden transition-all duration-300 ${mode === 'signin' ? 'max-h-8 opacity-100' : 'pointer-events-none -mt-3 max-h-0 opacity-0'}`}>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={disabled || mode !== 'signin'}
                  className="text-sm font-medium text-brand-700 transition hover:text-brand-600"
                  style={{ minHeight: 0 }}
                >
                  {busy === 'reset' ? 'Sending…' : 'Forgot password?'}
                </button>
              </div>

              {error && (
                <div className="flex animate-fadeIn items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" /> <span>{error}</span>
                </div>
              )}
              {notice && (
                <div className="flex animate-fadeIn items-start gap-2 rounded-xl bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> <span>{notice}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={disabled}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-[15px] font-semibold text-white shadow-soft transition duration-200 hover:bg-brand-700 active:scale-[0.99] disabled:opacity-60"
              >
                {busy === 'email' && <Loader2 size={18} className="animate-spin" />}
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-maroon-900/55">
              <span className="h-px flex-1 bg-sandal-200" />
              or
              <span className="h-px flex-1 bg-sandal-200" />
            </div>

            <div className="grid gap-2.5">
              <button onClick={() => run('google', signInWithGoogle)} disabled={disabled} className={secondaryBtn}>
                {busy === 'google' ? (
                  <Loader2 size={18} className="animate-spin text-brand-600" />
                ) : (
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="h-[18px] w-[18px]" />
                )}
                Continue with Google
              </button>
              <button onClick={handleGuest} disabled={disabled} className={`${secondaryBtn} text-maroon-900/70`}>
                {busy === 'guest' ? <Loader2 size={18} className="animate-spin text-brand-600" /> : <UserCircle size={18} className="text-maroon-900/50" />}
                Continue as guest
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Login;
