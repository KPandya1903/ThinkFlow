'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Brain, LayoutDashboard, Compass, Trophy, User, Menu, X, Flame, Zap, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/puzzles', label: 'Puzzles', icon: Compass },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session, status } = useSession();

  const isLoggedIn = status === 'authenticated' && !!session?.user;
  const user = session?.user;
  const initials = user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?';

  return (
    <>
      <nav
        className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border-custom"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center transition-transform group-hover:scale-105">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                <span className="text-txt">I</span>
                <span className="text-primary-light">THINK</span>
              </span>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'nav-link text-sm font-medium transition-colors',
                      isActive ? 'active text-txt' : 'text-txt-secondary hover:text-primary-light'
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {isLoggedIn ? (
                <>
                  {/* XP badge */}
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-elevated border border-border-custom">
                    <Zap className="w-4 h-4 text-primary-light" />
                    <span className="font-mono text-sm font-semibold text-primary-light">
                      {((user as any)?.xp ?? 0).toLocaleString()}
                    </span>
                  </div>
                  {/* Avatar */}
                  <Link href="/profile" className="relative group">
                    {user?.image ? (
                      <img
                        src={user.image}
                        alt="Profile"
                        className="w-9 h-9 rounded-full border-2 border-primary/30 group-hover:border-primary transition-colors"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold text-white">
                        {initials}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gold flex items-center justify-center">
                      <span className="text-[9px] font-bold text-background font-mono">
                        {(user as any)?.level ?? 1}
                      </span>
                    </div>
                  </Link>
                  {/* Sign out */}
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="hidden sm:flex p-2 rounded-lg hover:bg-surface-elevated transition-colors text-txt-secondary hover:text-error"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <Link
                  href="/sign-in"
                  className="hidden sm:inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold transition-all hover:bg-primary-light hover:shadow-lg hover:shadow-primary/25"
                >
                  Sign In
                </Link>
              )}

              {/* Mobile menu button */}
              <button
                className="md:hidden p-2 rounded-lg hover:bg-surface-elevated transition-colors"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? (
                  <X className="w-5 h-5 text-txt-secondary" />
                ) : (
                  <Menu className="w-5 h-5 text-txt-secondary" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile menu panel */}
      <aside
        className={cn(
          'fixed top-0 right-0 w-72 h-full bg-surface border-l border-border-custom z-50 md:hidden transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                <span className="text-txt">I</span>
                <span className="text-primary-light">THINK</span>
              </span>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-lg hover:bg-surface-elevated transition-colors"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5 text-txt-secondary" />
            </button>
          </div>

          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 text-sm font-medium px-3 py-3 rounded-xl transition-colors',
                    isActive
                      ? 'text-txt bg-surface-elevated'
                      : 'text-txt-secondary hover:text-primary-light hover:bg-surface-elevated'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}

            {isLoggedIn ? (
              <button
                onClick={() => { setMobileOpen(false); signOut({ callbackUrl: '/' }); }}
                className="mt-4 flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-error/30 text-error text-sm font-semibold transition-all hover:bg-error/10"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            ) : (
              <Link
                href="/sign-in"
                onClick={() => setMobileOpen(false)}
                className="mt-4 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white text-sm font-semibold transition-all hover:bg-primary-light"
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      </aside>
    </>
  );
}
