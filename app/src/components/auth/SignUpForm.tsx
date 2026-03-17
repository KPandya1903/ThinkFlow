'use client';

import { useState, useMemo } from 'react';
import { signIn } from 'next-auth/react';
import { User, Mail, Lock, Eye, EyeOff, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Weak', color: 'bg-error' };
  if (score <= 2) return { score, label: 'Fair', color: 'bg-gold' };
  if (score <= 3) return { score, label: 'Good', color: 'bg-accent' };
  return { score, label: 'Strong', color: 'bg-success' };
}

export default function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleGoogleSignUp = () => {
    signIn('google', { callbackUrl: '/dashboard' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch) return;

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      // Auto sign-in after registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Account created but sign-in failed. Try signing in manually.');
        setIsLoading(false);
      } else {
        window.location.href = '/dashboard';
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleGoogleSignUp}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-surface-elevated/80 border border-border-custom text-sm font-medium text-txt transition-all hover:border-primary/40 hover:bg-surface-elevated active:scale-[0.97]"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </button>

      <div className="relative flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-border-custom" />
        <span className="text-xs text-txt-secondary uppercase tracking-wider">or</span>
        <div className="flex-1 h-px bg-border-custom" />
      </div>

      {/* Username */}
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-txt-secondary mb-1.5">
          Username
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-secondary/50" />
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            className="auth-input w-full pl-10 pr-4 py-3 rounded-xl text-sm text-txt placeholder:text-txt-secondary/40"
            required
            minLength={3}
            maxLength={20}
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="signup-email" className="block text-sm font-medium text-txt-secondary mb-1.5">
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-secondary/50" />
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="auth-input w-full pl-10 pr-4 py-3 rounded-xl text-sm text-txt placeholder:text-txt-secondary/40"
            required
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label htmlFor="signup-password" className="block text-sm font-medium text-txt-secondary mb-1.5">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-secondary/50" />
          <input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a strong password"
            className="auth-input w-full pl-10 pr-12 py-3 rounded-xl text-sm text-txt placeholder:text-txt-secondary/40"
            required
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-txt-secondary/50 hover:text-txt transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Password strength */}
        {password.length > 0 && (
          <div className="mt-2">
            <div className="flex gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-all',
                    i < strength.score ? strength.color : 'bg-border-custom'
                  )}
                />
              ))}
            </div>
            <span className={cn(
              'text-xs mt-1 block',
              strength.score <= 1 ? 'text-error' :
              strength.score <= 2 ? 'text-gold' :
              strength.score <= 3 ? 'text-accent' : 'text-success'
            )}>
              {strength.label}
            </span>
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="confirm-password" className="block text-sm font-medium text-txt-secondary mb-1.5">
          Confirm Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-secondary/50" />
          <input
            id="confirm-password"
            type={showConfirm ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            className={cn(
              'auth-input w-full pl-10 pr-12 py-3 rounded-xl text-sm text-txt placeholder:text-txt-secondary/40',
              passwordsMatch && 'border-success shadow-[0_0_0_3px_rgba(0,184,148,0.15)]',
              passwordsMismatch && 'border-error shadow-[0_0_0_3px_rgba(255,107,107,0.15)]'
            )}
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-txt-secondary/50 hover:text-txt transition-colors"
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {passwordsMatch && (
          <div className="flex items-center gap-1 mt-1">
            <Check className="w-3 h-3 text-success" />
            <span className="text-xs text-success">Passwords match</span>
          </div>
        )}
        {passwordsMismatch && (
          <div className="flex items-center gap-1 mt-1">
            <X className="w-3 h-3 text-error" />
            <span className="text-xs text-error">Passwords do not match</span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-error text-center">{error}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading || passwordsMismatch}
        className="btn-gradient w-full py-3 rounded-xl text-white font-semibold text-sm mt-2 disabled:opacity-50"
      >
        <span className="flex items-center justify-center gap-2">
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isLoading ? 'Creating account...' : 'Create Account'}
        </span>
      </button>

      <p className="text-xs text-txt-secondary/60 text-center mt-4">
        By creating an account, you agree to our Terms of Service and Privacy Policy.
      </p>
    </form>
  );
}
