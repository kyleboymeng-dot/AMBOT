
"use client"

import { useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  ClipboardList, 
  Loader2, 
  Calendar, 
  Clock,
  MapPin,
  History,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function TeacherDashboard() {
  const { user, loading: authLoading } = useAuth();
  const db = useFirestore();

  // Fetch teacher's assigned classes from schedules
  const schedulesQuery = useMemo(() => {
    if (!db || !user || user.role !== 'teacher') return null;
    return query(collection(db, 'schedules'), where('teacherId', '==', user.uid));
  }, [db, user]);

  const { data: mySchedules, loading: schedulesLoading } = useCollection(schedulesQuery);

  // Fetch institutional student count for context
  const studentsQuery = useMemo(() => collection(db, 'students'), [db]);
  const { data: allStudents, loading: studentsLoading } = useCollection(studentsQuery);

  const teacherStats = useMemo(() => {
    const assignedClasses = new Set(mySchedules.map(s => s.classId));
    const assignedSubjects = new Set(mySchedules.map(s => s.subjectId)).size;
    
    // SECURE: Filter institutional student list to only those in the teacher's assigned classes
    const assignedStudentCount = allStudents.filter(s => assignedClasses.has(s.classId)).length;
    
    return [
      { label: "Assigned Classes", value: assignedClasses.size.toString(), icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
      { label: "Active Subjects", value: assignedSubjects.toString(), icon: Calendar, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
      { label: "Weekly Slots", value: mySchedules.length.toString(), icon: Clock, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20" },
      { label: "Total Students", value: assignedStudentCount.toString(), icon: ClipboardList, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
    ];
  }, [mySchedules, allStudents]);

  if (authLoading || schedulesLoading || studentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Welcome Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground font-headline tracking-tight">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Faculty Dashboard • SY 2025-2026 Semester I
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="h-10 rounded-xl border-primary/20 text-primary font-bold">
            <Link href="/dashboard/schedule">View Weekly Schedule</Link>
          </Button>
          <Button asChild className="h-10 rounded-xl bg-primary hover:bg-primary/90 shadow-md font-bold">
            <Link href="/dashboard/grades">
              <ClipboardList className="w-4 h-4 mr-2" />
              Post New Grades
            </Link>
          </Button>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {teacherStats.map((stat, idx) => (
          <Card key={idx} className="border-none shadow-sm hover:shadow-md transition-all duration-300 bg-card group">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{stat.label}</p>
                  <h3 className="text-2xl font-bold mt-1 text-foreground">{stat.value}</h3>
                </div>
                <div className={`p-3 ${stat.bg} rounded-xl group-hover:scale-110 transition-transform`}>
                  <stat.icon className={`${stat.color} w-5 h-5`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="max-w-full space-y-8">
        {/* Active Classes List */}
        <Card className="border-none shadow-sm bg-card overflow-hidden">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Assigned Academic Sessions</CardTitle>
                <CardDescription>Direct access to your assigned subjects and classrooms.</CardDescription>
              </div>
              <Badge variant="outline" className="bg-background text-primary border-primary/20 uppercase font-bold text-[10px]">
                {mySchedules.length} TOTAL SLOTS
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {mySchedules.length > 0 ? (
                mySchedules.map((cls: any, i: number) => (
                  <div key={i} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-muted/30 transition-colors group">
                    <div className="flex gap-5 items-center">
                      <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 shadow-sm group-hover:bg-primary/10 transition-colors">
                        <Users className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-lg text-foreground">{cls.classId}</h4>
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-none text-[10px] font-bold uppercase">
                            {cls.subjectId}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1.5">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            {cls.dayOfWeek} • {cls.startTime} - {cls.endTime}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5" />
                            {cls.room}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                      <Button asChild size="sm" variant="outline" className="flex-1 md:flex-none h-9 font-bold text-xs rounded-lg border-border">
                        <Link href="/dashboard/attendance">Attendance</Link>
                      </Button>
                      <Button asChild size="sm" className="flex-1 md:flex-none h-9 font-bold text-xs rounded-lg shadow-sm">
                        <Link href="/dashboard/grades">Post Grades</Link>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
                  <Calendar className="w-12 h-12 text-muted-foreground opacity-20" />
                  <div className="space-y-1">
                    <p className="text-base font-bold text-foreground">No Assignments Found</p>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                      You are currently not assigned to any subjects in the master institutional schedule.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Institutional Mission */}
        <div className="p-10 bg-muted/20 border border-dashed rounded-2xl flex items-center justify-center text-center">
          <p className="text-sm text-muted-foreground italic leading-relaxed max-w-xl">
            "Our mission is to foster academic excellence and institutional integrity through transparent, real-time data tracking. Faculty contributions are the cornerstone of student success and institutional growth."
          </p>
        </div>
      </div>
    </div>
  );
}
