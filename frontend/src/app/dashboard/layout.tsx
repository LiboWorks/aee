'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useEffect } from 'react';
import { motion } from 'framer-motion';

const navGroups = [
  {
    label: 'Intelligence Core',
    items: [
      { href: '/dashboard/command-center', label: 'AI Command Center' },
      { href: '/dashboard/opportunity-workspace', label: 'Opportunity Investigation Workspace' },
      { href: '/dashboard/product-intelligence', label: 'Product Intelligence Report' },
      { href: '/dashboard/competition-survival', label: 'Competition & Survival Analysis' },
      { href: '/dashboard/small-team-opportunities', label: 'Small-Team Opportunity Center' },
      { href: '/dashboard/trend-intelligence', label: 'Trend Intelligence Center' },
      { href: '/dashboard/live-monitoring', label: 'Live Monitoring & Alerts' },
      { href: '/dashboard/competitor-intelligence', label: 'Competitor Intelligence' },
      { href: '/dashboard/ai-research', label: 'AI Research Workspace' },
      { href: '/dashboard/evidence-explorer', label: 'Evidence & Source Explorer' },
      { href: '/dashboard/workspace-settings', label: 'Workspace / Team Settings' },
    ],
  },
  {
    label: 'Legacy Workflow',
    items: [
      { href: '/dashboard/new', label: 'Legacy Product Intake' },
      { href: '/dashboard/history', label: 'Legacy History' },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, email, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_0_0,rgba(153,246,228,0.35),transparent_38%),radial-gradient(circle_at_100%_0,rgba(191,219,254,0.45),transparent_44%),linear-gradient(180deg,#f8fafc,#eef2ff_65%,#f8fafc)]">
      <div className="mx-auto flex max-w-[1600px] gap-4 px-4 py-4 lg:px-6">
        <aside className="hidden w-[320px] shrink-0 lg:block">
          <div className="sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h1 className="text-lg font-semibold tracking-tight text-slate-900">AEE Intelligence OS</h1>
              <p className="mt-1 text-xs text-slate-500">Autonomous Amazon seller intelligence for Shenzhen SMB teams</p>
            </div>

            <nav className="flex-1 space-y-5 overflow-y-auto p-4">
              {navGroups.map((group) => (
                <div key={group.label}>
                  <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{group.label}</p>
                  <div className="mt-2 space-y-1">
                    {group.items.map((item) => {
                      const active = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`block rounded-xl px-3 py-2 text-sm transition-colors ${
                            active
                              ? 'bg-cyan-50 text-cyan-800'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="border-t border-slate-100 p-4">
              <p className="truncate text-xs text-slate-500">{email}</p>
              <button onClick={logout} className="mt-2 text-xs font-medium text-slate-600 hover:text-slate-900">
                Sign out
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-3 space-y-2 rounded-2xl border border-slate-200 bg-white/90 p-2 lg:hidden">
            {navGroups.map((group) => (
              <div key={group.label} className="rounded-xl bg-white/70">
                <p className="sticky left-0 z-10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {group.label}
                </p>
                <div className="mt-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {group.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
                          active
                            ? 'bg-cyan-50 text-cyan-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur-sm md:p-6"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
