
"use client"

import { useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Calendar, 
  Users, 
  CheckCircle2, 
  Clock, 
  ClipboardList,
  Search,
  LayoutDashboard,
  Loader2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export function RegistrarDashboard() {
  const db = useFirestore();

  // Queries to fetch institutional data
  const studentsQuery = useMemo(() => collection(db, 'students'), [db]);
  const recentSchedulesQuery = useMemo(() => 
    query(collection(db, 'schedules'), orderBy('createdAt', 'desc'), limit(5)), 
  [db]);
  
  const { data: students, loading: studentsLoading } = useCollection(studentsQuery);
  const { data: recentSchedules, loading: schedulesLoading } = useCollection(recentSchedulesQuery);

  const stats = useMemo(() => [
    { 
      label: "Total Students", 
      value: students.length.toLocaleString(), 
      icon: Users, 
      color: "text-blue-600", 
      bg: "bg-blue-50 dark:bg-blue-900/20" 
    },
    { 
      label: "Schedules Set", 
      value: recentSchedules.length.toString(), 
      icon: Calendar, 
      color: "text-green-600", 
      bg: "bg-green-50 dark:bg-green-900/20" 
    },
    { 
      label: "Institutional Load", 
      value: recentSchedules.length > 0 ? "Active" : "Pending", 
      icon: Clock, 
      color: "text-orange-600", 
      bg: "bg-orange-50 dark:bg-orange-900/20" 
    },
    { 
      label: "Verified Records", 
      value: students.length.toString(), 
      icon: CheckCircle2, 
      color: "text-purple-600", 
      bg: "bg-purple-50 dark:bg-purple-900/20" 
    },
  ], [students, recentSchedules]);

  if (studentsLoading || schedulesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground font-headline">Registrar Overview</h2>
          <p className="text-muted-foreground text-sm mt-1">Real-time management of institutional schedules and student distribution.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild className="bg-primary hover:bg-primary/90 h-11 px-6 shadow-md font-bold text-sm rounded-xl">
            <Link href="/dashboard/students">
              <ClipboardList className="w-4 h-4 mr-2" />
              Enrollment Portal
            </Link>
          </Button>
        </div>
      </section>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <Card key={idx} className="border-none shadow-sm hover:shadow-md transition-shadow bg-card">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{stat.label}</p>
                  <h3 className="text-2xl font-bold mt-1 text-foreground">{stat.value}</h3>
                </div>
                <div className={`p-3 ${stat.bg} rounded-xl`}>
                  <stat.icon className={`${stat.color} w-5 h-5`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Schedule Changes */}
        <Card className="lg:col-span-2 border-none shadow-sm bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Recent Schedule Assignments</CardTitle>
                <CardDescription>Latest updates to the master institutional timetable.</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="h-8 text-xs font-bold border-border">
                <Link href="/dashboard/schedule">Manage Master Grid</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {recentSchedules.length > 0 ? recentSchedules.map((log: any, i: number) => (
                <div key={i} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-primary font-bold text-xs uppercase">
                      {log.classId?.substring(0, 2) || 'CL'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{log.classId} • {log.subjectId}</p>
                      <p className="text-xs text-muted-foreground">Room {log.room} | {log.startTime} - {log.endTime}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-bold uppercase border-primary/20 text-primary">
                    {log.dayOfWeek}
                  </Badge>
                </div>
              )) : (
                <div className="p-12 text-center text-muted-foreground italic">
                  No recent schedule assignments found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Tools & Session Info */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="text-sm font-bold uppercase tracking-tight">System Navigation</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Quick record lookup..." className="pl-9 h-10 text-sm bg-background border-border" />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Button asChild variant="secondary" className="justify-start text-xs font-bold gap-2 bg-muted hover:bg-muted/80 h-10">
                  <Link href="/dashboard/enrollment">
                    <LayoutDashboard className="w-4 h-4" /> Track Analytics
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="justify-start text-xs font-bold gap-2 bg-muted hover:bg-muted/80 h-10">
                  <Link href="/dashboard/schedule">
                    <Calendar className="w-4 h-4" /> Institutional Timetable
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="justify-start text-xs font-bold gap-2 bg-muted hover:bg-muted/80 h-10">
                  <Link href="/dashboard/students">
                    <Users className="w-4 h-4" /> Master Student Roster
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary text-primary-foreground border-none shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <CardHeader className="relative z-10">
              <CardTitle className="text-base font-bold">Academic Session</CardTitle>
              <CardDescription className="text-primary-foreground/70 text-xs">SY 2025-2026 Semester 1</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Data Synchronization</span>
                <Badge className="bg-green-500 hover:bg-green-500 border-none text-white text-[10px] font-bold">LIVE</Badge>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-xs opacity-70">Last Audit</span>
                <span className="text-xs font-mono">Just Now</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
