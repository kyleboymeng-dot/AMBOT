
"use client"

import { useAuth } from '@/hooks/use-auth';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { DashboardHeader } from '@/components/dashboard/header';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isStudent = user.role === 'student';

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {!isStudent && (
        <aside className="w-64 hidden md:flex flex-col flex-shrink-0">
          <SidebarNav role={user.role} />
        </aside>
      )}
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardHeader />
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className={cn("max-w-7xl mx-auto", isStudent ? "pt-4" : "space-y-8")}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
