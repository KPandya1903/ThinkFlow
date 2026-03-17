import Link from 'next/link';
import { Brain } from 'lucide-react';
import SignUpForm from '@/components/auth/SignUpForm';

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      {/* Background effects */}
      <div className="gradient-mesh" aria-hidden="true" />
      <div
        className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/6 blur-[120px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight">
            <span className="text-txt">I</span>
            <span className="text-primary-light">THINK</span>
          </span>
        </Link>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8 hover:transform-none">
          <h1 className="text-2xl font-bold text-txt text-center mb-2">Create Account</h1>
          <p className="text-txt-secondary text-sm text-center mb-8">
            Start your cognitive training journey
          </p>

          <SignUpForm />

          <p className="text-center text-sm text-txt-secondary mt-6">
            Already have an account?{' '}
            <Link href="/sign-in" className="text-primary-light hover:text-primary font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
