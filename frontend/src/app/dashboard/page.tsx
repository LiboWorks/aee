'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/command-center');
  }, [router]);

  return <div className="text-sm text-slate-500">Loading command center...</div>;
}
