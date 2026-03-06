
"use client"

import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  BookOpen, 
  CalendarDays, 
  CheckCircle2,
  FileBarChart,
  Loader2,
  Clock,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';

export function StudentDashboard() {
  const { user, loading: authLoading } = useAuth();
  const db = useFirestore();

  // Fetch student's grades for dynamic stats
  const gradesQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'grades'), 
      where('studentId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
  }, [db, user]);

  // Fetch student's schedule
  const scheduleQuery = useMemo(() => {
    if (!db || !user?.section) return null;
    return query(
      collection(db, 'schedules'),
      where('classId', '==', user.section.toUpperCase())
    );
  }, [db, user]);

  const { data: grades, loading: gradesLoading } = useCollection(gradesQuery);
  const { data: schedule, loading: scheduleLoading } = useCollection(scheduleQuery);

  const stats = useMemo(() => {
    const overallGWA = grades.length > 0 
      ? (grades.reduce((acc, g) => acc + (g.overall || 0), 0) / grades.length).toFixed(2)
      : '0.00';

    const subjectCount = new Set(grades.map(g => g.subject)).size || schedule.length;

    return [
      {
        label: "CURRENT GWA",
        value: overallGWA,
        subtext: parseFloat(overallGWA) >= 90 ? "Excellent Performance" : "Good Standing",
        subColor: parseFloat(overallGWA) >= 75 ? "text-green-500" : "text-orange-500",
        icon: <FileBarChart className="w-6 h-6 text-primary" />,
      },
      {
        label: "ENROLLED SUBJECTS",
        value: subjectCount.toString(),
        subtext: "Current Semester",
        subColor: "text-blue-500",
        icon: <BookOpen className="w-6 h-6 text-primary" />,
      },
      {
        label: "WEEKLY SESSIONS",
        value: schedule.length.toString(),
        subtext: "Live Timetable",
        subColor: "text-purple-500",
        icon: <CalendarDays className="w-6 h-6 text-primary opacity-40" />,
      },
      {
        label: "ACADEMIC STATUS",
        value: "Active",
        subtext: "Clearance: Passed",
        subColor: "text-green-500",
        icon: <CheckCircle2 className="w-6 h-6 text-green-500 opacity-40" />,
      }
    ];
  }, [grades, schedule]);

  if (authLoading || gradesLoading || scheduleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const recentGrades = grades.slice(0, 4);
  const todaySchedule = schedule.slice(0, 3); // Showing a few for the dashboard view

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {/* Welcome Section */}
      <section className="text-left pt-6">
        <h2 className="text-3xl font-bold text-foreground mb-1 tracking-tight">
          Welcome Back, {user?.name?.split(' ')[0]}!
        </h2>
        <p className="text-muted-foreground text-sm">
          {user?.gradeLevel || 'Student'} • {user?.section || 'Academic Portal'} • SY 2025-2026
        </p>
      </section>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <Card key={idx} className="border-none shadow-sm rounded-2xl overflow-hidden group hover:shadow-md transition-shadow bg-card">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</span>
                <div className="p-1.5 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                  {stat.icon}
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl font-bold text-foreground">{stat.value}</h3>
                <p className={cn("text-[11px] font-medium flex items-center gap-1", stat.subColor)}>
                  {idx === 0 && <TrendingUp className="w-3 h-3" />}
                  {stat.subtext}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Today's Schedule */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Class Schedule
          </h3>
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-card">
            <CardContent className="p-0">
              <div className="flex flex-col">
                {todaySchedule.length > 0 ? (
                  todaySchedule.map((item: any, idx) => (
                    <div key={idx} className={cn(
                      "p-6 flex flex-col gap-1 transition-colors hover:bg-muted/30",
                      idx !== todaySchedule.length - 1 && "border-b border-border"
                    )}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-primary uppercase tracking-tighter">
                          {item.startTime} - {item.endTime}
                        </span>
                        <Badge variant="outline" className="text-[9px] font-bold uppercase">{item.dayOfWeek}</Badge>
                      </div>
                      <h4 className="font-bold text-foreground text-base">{item.subjectId}</h4>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 opacity-50" />
                          {item.room}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                    <CalendarDays className="w-10 h-10 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground italic">No classes found for your section.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Grades */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-primary" />
            Recent Grade Postings
          </h3>
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-card">
            <CardContent className="p-0">
              <div className="flex flex-col">
                {recentGrades.length > 0 ? (
                  recentGrades.map((item: any, idx) => (
                    <div key={idx} className={cn(
                      "p-6 flex items-center justify-between transition-colors hover:bg-muted/30",
                      idx !== recentGrades.length - 1 && "border-b border-border"
                    )}>
                      <div className="space-y-1">
                        <h4 className="font-bold text-foreground text-sm">{item.subject}</h4>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{item.semester}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <span className="font-bold text-primary text-xl block leading-none">{item.overall}</span>
                        </div>
                        <Badge className={cn(
                          "rounded-md font-bold text-[10px] px-3 py-1 border-none shadow-none uppercase tracking-wider",
                          item.overall >= 90 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        )}>
                          {item.overall >= 90 ? "Excellent" : "Passed"}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                    <BookOpen className="w-10 h-10 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground italic">No academic records found.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
