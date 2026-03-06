
"use client"

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar as CalendarIcon, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileDown, 
  UserCheck, 
  Users, 
  ClipboardCheck, 
  Loader2,
  History,
  LayoutGrid,
  User,
  Download,
  AlertCircle
} from 'lucide-react';
import { format, isWithinInterval, startOfDay, parseISO, isValid } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { collection, serverTimestamp, query, where, doc, setDoc, getDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function AttendancePage() {
  const { user, loading: authLoading } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  // Mark Attendance State (Teacher)
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, 'present' | 'absent' | 'late' | null>>({});
  const [isSaving, setIsSaving] = useState(false);

  // History State (Teacher/Admin)
  const [viewBy, setViewBy] = useState<'class' | 'student'>('class');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [historySection, setHistorySection] = useState<string>('all');
  const [historySubject, setHistorySubject] = useState<string>('all');
  const [historyStatus, setHistoryStatus] = useState<string>('all');

  // Queries
  const schedulesQuery = useMemo(() => {
    if (!db || !user || user.role !== 'teacher') return null;
    return query(collection(db, 'schedules'), where('teacherId', '==', user.uid));
  }, [db, user]);

  const studentsQuery = useMemo(() => {
    if (!db) return null;
    return collection(db, 'students');
  }, [db]);

  const historyQuery = useMemo(() => {
    if (!db || !user) return null;
    const base = collection(db, 'attendance');
    // SECURE: Teachers only see the attendance THEY recorded
    if (user.role === 'teacher') {
      return query(base, where('teacherId', '==', user.uid));
    }
    return base;
  }, [db, user]);

  const { data: mySchedules, loading: schedulesLoading } = useCollection(schedulesQuery);
  const { data: firestoreStudents, loading: studentsLoading } = useCollection(studentsQuery);
  const { data: historyData, loading: historyLoading } = useCollection(historyQuery);

  // Derive assigned classes and subjects
  const teacherClasses = useMemo(() => {
    if (!mySchedules) return [];
    return Array.from(new Set(mySchedules.map(s => s.classId))).sort();
  }, [mySchedules]);

  const teacherSubjectsForClass = useMemo(() => {
    if (!mySchedules || !selectedClass) return [];
    return Array.from(new Set(
      mySchedules
        .filter(s => s.classId === selectedClass)
        .map(s => s.subjectId)
    )).sort();
  }, [mySchedules, selectedClass]);

  const teacherSubjectsForHistory = useMemo(() => {
    if (!mySchedules) return [];
    if (historySection === 'all') {
      return Array.from(new Set(mySchedules.map(s => s.subjectId))).sort();
    }
    return Array.from(new Set(
      mySchedules
        .filter(s => s.classId === historySection)
        .map(s => s.subjectId)
    )).sort();
  }, [mySchedules, historySection]);

  // Handle initial selection
  useEffect(() => {
    if (teacherClasses.length > 0 && !selectedClass) {
      setSelectedClass(teacherClasses[0]);
    }
  }, [teacherClasses, selectedClass]);

  useEffect(() => {
    if (teacherSubjectsForClass.length > 0 && !subject) {
      setSubject(teacherSubjectsForClass[0]);
    }
  }, [teacherSubjectsForClass, subject]);

  // LOAD EXISTING ATTENDANCE IF ANY (Prevents duplicates and allows editing)
  useEffect(() => {
    if (!db || !date || !selectedClass || !subject) return;

    const dateStr = format(date, 'yyyy-MM-dd');
    const classIdStr = selectedClass.toUpperCase();
    const sessionId = `${dateStr}_${classIdStr}_${subject.replace(/\s+/g, '_')}`;
    
    const fetchExisting = async () => {
      const docRef = doc(db, 'attendance', sessionId);
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.records) {
            setAttendanceRecords(data.records);
            toast({
              title: "Existing Record Found",
              description: `Loading previously saved attendance for ${subject}.`,
            });
          }
        } else {
          setAttendanceRecords({});
        }
      } catch (err) {
        console.error("Error checking existing attendance:", err);
      }
    };

    fetchExisting();
  }, [db, date, selectedClass, subject, toast]);

  // Helper for safe date formatting
  const safeFormatDate = (dateStr: any) => {
    if (!dateStr) return 'N/A';
    try {
      const parsed = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
      if (!isValid(parsed)) return 'Invalid Date';
      return format(parsed, "MMM d, yyyy");
    } catch (e) {
      return 'Invalid Date';
    }
  };

  // Student specific logic
  const studentAttendanceStats = useMemo(() => {
    if (!historyData || !user || user.role !== 'student') return [];
    
    const subjectStats: Record<string, { total: number; present: number }> = {};
    
    historyData.forEach((session: any) => {
      const status = session.records?.[user.uid];
      if (status) {
        const sub = session.subject || 'General';
        const subKey = sub.charAt(0).toUpperCase() + sub.slice(1);
        if (!subjectStats[subKey]) {
          subjectStats[subKey] = { total: 0, present: 0 };
        }
        subjectStats[subKey].total++;
        if (status === 'present') {
          subjectStats[subKey].present++;
        }
      }
    });

    return Object.entries(subjectStats).map(([subjectName, counts]) => {
      const percentage = counts.total > 0 ? (counts.present / counts.total) * 100 : 0;
      let statusLabel = 'Good';
      let statusColor = 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';

      if (percentage >= 95) {
        statusLabel = 'Excellent';
        statusColor = 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
      } else if (percentage >= 85) {
        statusLabel = 'Very Good';
        statusColor = 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400';
      } else if (percentage < 75) {
        statusLabel = 'Needs Improvement';
        statusColor = 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
      }

      return {
        subject: subjectName,
        total: counts.total,
        present: counts.present,
        percentage: percentage.toFixed(1) + '%',
        status: statusLabel,
        statusColor
      };
    });
  }, [historyData, user]);

  const studentSummary = useMemo(() => {
    return studentAttendanceStats.reduce((acc, curr) => ({
      total: acc.total + curr.total,
      present: acc.present + curr.present,
      absent: acc.absent + (curr.total - curr.present)
    }), { total: 0, present: 0, absent: 0 });
  }, [studentAttendanceStats]);

  // Filtered Students for Marking
  const filteredStudents = useMemo(() => {
    if (!firestoreStudents || !selectedClass) return [];
    return firestoreStudents.filter(s => {
      const matchesClass = s.classId === selectedClass.toUpperCase();
      const fullName = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
      const id = (s.studentId || '').toLowerCase();
      const queryStr = searchQuery.toLowerCase();
      return matchesClass && (fullName.includes(queryStr) || id.includes(queryStr));
    });
  }, [firestoreStudents, selectedClass, searchQuery]);

  const counts = useMemo(() => {
    const records = Object.values(attendanceRecords);
    return {
      present: records.filter(r => r === 'present').length,
      absent: records.filter(r => r === 'absent').length,
      late: records.filter(r => r === 'late').length,
      unmarked: filteredStudents.length - records.filter(r => r !== null).length,
    };
  }, [attendanceRecords, filteredStudents]);

  // Flattened History Records
  const processedHistory = useMemo(() => {
    if (!historyData || !firestoreStudents || !user) return [];

    const flattened: any[] = [];
    const assignedSubjects = new Set(mySchedules?.map(s => s.subjectId) || []);
    const assignedClasses = new Set(mySchedules?.map(s => s.classId) || []);

    historyData.forEach((session: any) => {
      const records = session.records || {};
      
      // Strict Security Layer: Ensure the current teacher is currently assigned to this subject/class
      if (user.role === 'teacher') {
        const isCurrentlyAssigned = assignedSubjects.has(session.subject) && assignedClasses.has(session.classId);
        if (!isCurrentlyAssigned) return;
      }

      Object.entries(records).forEach(([studentId, rawStatus]: [string, any]) => {
        const student = firestoreStudents.find(s => s.studentId === studentId);
        
        // Data Integrity: Only show if student exists
        if (!student && user?.role === 'teacher') return;

        const status = typeof rawStatus === 'string' 
          ? rawStatus 
          : (rawStatus && typeof rawStatus === 'object' && 'status' in rawStatus ? String(rawStatus.status) : 'unknown');

        const matchesSection = historySection === 'all' || session.classId === historySection;
        const matchesSubject = historySubject === 'all' || session.subject === historySubject;
        const matchesStatus = historyStatus === 'all' || status === historyStatus;
        
        let matchesDate = true;
        if (dateFrom && dateTo && session.date) {
          try {
            const sessionDate = typeof session.date === 'string' ? parseISO(session.date) : new Date(session.date);
            if (isValid(sessionDate)) {
              matchesDate = isWithinInterval(sessionDate, {
                start: startOfDay(dateFrom),
                end: startOfDay(dateTo)
              });
            }
          } catch (e) {
            matchesDate = false;
          }
        }

        if (matchesSection && matchesSubject && matchesStatus && matchesDate) {
          flattened.push({
            date: session.date,
            studentName: student ? `${student.firstName} ${student.lastName}` : (studentId || 'Unknown Student'),
            studentId: studentId,
            avatar: student?.avatar,
            section: session.classId,
            subject: session.subject,
            status: status
          });
        }
      });
    });

    return flattened.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      const dateA = typeof a.date === 'string' ? a.date : format(a.date, 'yyyy-MM-dd');
      const dateB = typeof b.date === 'string' ? b.date : format(b.date, 'yyyy-MM-dd');
      return dateB.localeCompare(dateA);
    });
  }, [historyData, firestoreStudents, historySection, historySubject, historyStatus, dateFrom, dateTo, user, mySchedules]);

  const updateStatus = (id: string, status: 'present' | 'absent' | 'late') => {
    setAttendanceRecords(prev => ({ ...prev, [id]: status }));
  };

  const markAllAs = (status: 'present' | 'absent' | 'late') => {
    const updated = { ...attendanceRecords };
    filteredStudents.forEach(s => {
      updated[s.studentId] = status;
    });
    setAttendanceRecords(updated);
  };

  const handleSave = async () => {
    if (!date || !user || !selectedClass || !subject) {
      toast({
        title: "Missing Information",
        description: "Please ensure class and subject are selected.",
        variant: "destructive"
      });
      return;
    }

    const unmarkedCount = filteredStudents.length - Object.keys(attendanceRecords).length;
    if (unmarkedCount > 0) {
      toast({
        title: "Incomplete Roster",
        description: `Please mark all ${unmarkedCount} pending students before saving.`,
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    const dateStr = format(date, 'yyyy-MM-dd');
    const classIdStr = selectedClass.toUpperCase();
    
    // DETERMINISTIC ID: date_classId_subject (prevents duplicates)
    const sessionId = `${dateStr}_${classIdStr}_${subject.replace(/\s+/g, '_')}`;
    const sessionRef = doc(db, 'attendance', sessionId);

    const sessionData = {
      classId: classIdStr,
      subject,
      date: dateStr,
      teacherId: user.uid,
      records: attendanceRecords,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(), // In a real app, merge strategy would handle original createdAt
    };

    setDoc(sessionRef, sessionData, { merge: true })
      .then(() => {
        toast({
          title: "Attendance Recorded",
          description: `Session for ${selectedClass.toUpperCase()} saved successfully.`,
        });
        setIsSaving(false);
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: `attendance/${sessionId}`,
          operation: 'update',
          requestResourceData: sessionData,
        });
        errorEmitter.emit('permission-error', permissionError);
        setIsSaving(false);
      });
  };

  if (authLoading || (user && schedulesLoading)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // STUDENT VIEW RENDERING
  if (user?.role === 'student') {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <section>
          <h1 className="text-3xl font-bold text-[#1a237e] dark:text-primary">Attendance</h1>
          <p className="text-muted-foreground text-sm mt-1">Track your class attendance records</p>
        </section>

        <Card className="bg-card border-none shadow-sm rounded-xl overflow-hidden">
          <CardContent className="p-8">
            <div className="space-y-3">
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Select Academic Session:</label>
              <Select defaultValue="2025-2026 Semester 1">
                <SelectTrigger className="w-full md:w-[350px] bg-background h-12 border-border">
                  <SelectValue placeholder="Select Session" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025-2026 Semester 1">2025-2026 Semester 1</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-none shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="p-6 border-b border-border flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold text-foreground">Academic Records</CardTitle>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-tighter">
              Overall Rate: {studentSummary.total > 0 ? ((studentSummary.present / studentSummary.total) * 100).toFixed(1) : 0}%
            </span>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-b border-border">
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4 px-6">Subject</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4 px-6 text-center">Total Classes</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4 px-6 text-center">Total Present</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4 px-6 text-center">Attendance %</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4 px-6 text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentAttendanceStats.length > 0 ? (
                  studentAttendanceStats.map((row, idx) => (
                    <TableRow key={idx} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <TableCell className="py-4 px-6 font-medium text-foreground">{row.subject}</TableCell>
                      <TableCell className="py-4 px-6 text-center font-medium text-foreground">{row.total}</TableCell>
                      <TableCell className="py-4 px-6 text-center font-medium text-foreground">{row.present}</TableCell>
                      <TableCell className="py-4 px-6 text-center font-bold text-foreground">{row.percentage}</TableCell>
                      <TableCell className="py-4 px-6 text-center">
                        <Badge className={cn("rounded-md border-none px-3 py-1 font-bold text-[10px] uppercase", row.statusColor)}>
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground italic">
                      {historyLoading ? "Loading records..." : "No attendance records found for this academic session."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card border-none shadow-sm rounded-xl p-6">
            <div className="text-center space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Classes</p>
              <h3 className="text-2xl font-bold text-foreground">{studentSummary.total}</h3>
            </div>
          </Card>
          <Card className="bg-card border-none shadow-sm rounded-xl p-6">
            <div className="text-center space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Present</p>
              <h3 className="text-2xl font-bold text-green-500">{studentSummary.present}</h3>
            </div>
          </Card>
          <Card className="bg-card border-none shadow-sm rounded-xl p-6">
            <div className="text-center space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Absent</p>
              <h3 className="text-2xl font-bold text-red-500">{studentSummary.absent}</h3>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // TEACHER/ADMIN VIEW RENDERING
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1a237e] dark:text-primary">Attendance Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">Management and historical tracking of student participation.</p>
        </div>
        <Badge variant="outline" className="px-4 py-1.5 bg-card border-primary/20 text-primary font-bold shadow-sm">
          SY 2025-2026 | SEM I
        </Badge>
      </div>

      <Tabs defaultValue="mark" className="w-full">
        <TabsList className="w-full justify-start bg-muted/50 p-1 mb-8">
          <TabsTrigger 
            value="mark" 
            className="flex-1 sm:flex-none gap-2 data-[state=active]:bg-card"
          >
            <CheckCircle2 className="w-4 h-4" />
            Mark Attendance
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="flex-1 sm:flex-none gap-2 data-[state=active]:bg-card"
          >
            <History className="w-4 h-4" />
            View Attendance History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mark" className="space-y-8">
          {/* Mark Attendance Configuration UI */}
          <Card className="bg-card border-none shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-muted/30 border-b py-4">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm font-bold uppercase tracking-tight">Session Configuration</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {teacherClasses.length === 0 && !schedulesLoading ? (
                <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
                   <AlertCircle className="w-10 h-10 text-muted-foreground/30" />
                   <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">No Classes Assigned</p>
                      <p className="text-xs text-muted-foreground">You are currently not assigned to any classes in the master schedule.</p>
                   </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-medium bg-background h-11 border-border",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                          {date ? format(date, "MMMM dd, yyyy") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select Class</label>
                    <Select value={selectedClass} onValueChange={(val) => { setSelectedClass(val); setSubject(''); setAttendanceRecords({}); }}>
                      <SelectTrigger className="w-full bg-background h-11 border-border font-medium">
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent>
                        {teacherClasses.map(cls => (
                          <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Subject</label>
                    <Select value={subject} onValueChange={setSubject} disabled={!selectedClass}>
                      <SelectTrigger className="w-full bg-background h-11 border-border font-medium">
                        <SelectValue placeholder="Select Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {teacherSubjectsForClass.map(sub => (
                          <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button variant="outline" className="flex-1 h-11 border-primary/20 text-primary font-bold">
                    <FileDown className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-green-500 shadow-sm bg-card">
              <CardContent className="py-4 px-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Present</p>
                  <h3 className="text-2xl font-bold text-green-600">{counts.present}</h3>
                </div>
                <UserCheck className="w-6 h-6 text-green-600 opacity-20" />
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500 shadow-sm bg-card">
              <CardContent className="py-4 px-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Absent</p>
                  <h3 className="text-2xl font-bold text-red-600">{counts.absent}</h3>
                </div>
                <XCircle className="w-6 h-6 text-red-600 opacity-20" />
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-400 shadow-sm bg-card">
              <CardContent className="py-4 px-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Late</p>
                  <h3 className="text-2xl font-bold text-orange-600">{counts.late}</h3>
                </div>
                <Clock className="w-6 h-6 text-orange-600 opacity-20" />
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-slate-300 shadow-sm bg-card">
              <CardContent className="py-4 px-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Unmarked</p>
                  <h3 className="text-2xl font-bold text-muted-foreground">{counts.unmarked}</h3>
                </div>
                <Users className="w-6 h-6 text-muted-foreground opacity-20" />
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card border-none shadow-sm rounded-xl overflow-hidden">
            <div className="p-4 bg-muted/30 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-[10px] font-bold h-8 border-green-200 text-green-600 dark:border-green-800 dark:text-green-500" onClick={() => markAllAs('present')}>
                  MARK ALL PRESENT
                </Button>
                <Button size="sm" variant="outline" className="text-[10px] font-bold h-8 border-red-200 text-red-600 dark:border-red-800 dark:text-red-500" onClick={() => markAllAs('absent')}>
                  MARK ALL ABSENT
                </Button>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search name or ID..." 
                  className="pl-9 h-10 text-sm bg-background border-border"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="min-h-[400px] relative">
              {studentsLoading && (
                <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px] font-bold uppercase py-5 px-6">Student ID</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase py-5 px-6">Student Name</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase py-5 px-6">Status</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase py-5 px-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => {
                      const status = attendanceRecords[student.studentId];
                      const studentName = `${student.firstName || ''} ${student.lastName || ''}`;
                      return (
                        <TableRow key={student.studentId} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="py-4 px-6 font-mono text-xs text-muted-foreground">{student.studentId}</TableCell>
                          <TableCell className="py-4 px-6 font-bold text-foreground">{studentName}</TableCell>
                          <TableCell className="py-4 px-6">
                            {status ? (
                              <Badge className={cn(
                                "rounded-md font-bold text-[10px] px-2 py-0.5 border-none uppercase",
                                status === 'present' ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" :
                                status === 'absent' ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                              )}>
                                {status}
                              </Badge>
                            ) : (
                              <span className="text-[10px] font-bold text-muted-foreground/30 uppercase italic">Pending</span>
                            )}
                          </TableCell>
                          <TableCell className="py-4 px-6 text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button 
                                size="sm" 
                                variant={status === 'present' ? 'default' : 'outline'}
                                className={cn("h-8 px-4 text-[10px] font-bold", status === 'present' && "bg-green-600")}
                                onClick={() => updateStatus(student.studentId, 'present')}
                              >
                                PRESENT
                              </Button>
                              <Button 
                                size="sm" 
                                variant={status === 'absent' ? 'default' : 'outline'}
                                className={cn("h-8 px-4 text-[10px] font-bold", status === 'absent' && "bg-red-600")}
                                onClick={() => updateStatus(student.studentId, 'absent')}
                              >
                                ABSENT
                              </Button>
                              <Button 
                                size="sm" 
                                variant={status === 'late' ? 'default' : 'outline'}
                                className={cn("h-8 px-4 text-[10px] font-bold", status === 'late' && "bg-orange-50")}
                                onClick={() => updateStatus(student.studentId, 'late')}
                              >
                                LATE
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : !studentsLoading && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">
                        {selectedClass ? `No students found for class ${selectedClass.toUpperCase()}.` : "Select a class to load students."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          <div className="flex justify-end pt-4">
            <Button 
              className="bg-[#1a237e] dark:bg-primary px-12 py-7 rounded-xl text-base font-bold shadow-lg"
              onClick={handleSave}
              disabled={studentsLoading || filteredStudents.length === 0 || isSaving || !subject}
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {isSaving ? "Saving..." : "Confirm & Save Session"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* View By Toggle */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground">View By</p>
            <div className="flex gap-3">
              <Button 
                variant={viewBy === 'class' ? 'default' : 'secondary'} 
                className="gap-2 px-6 h-11"
                onClick={() => setViewBy('class')}
              >
                <LayoutGrid className="w-4 h-4" />
                Per Class
              </Button>
              <Button 
                variant={viewBy === 'student' ? 'default' : 'secondary'} 
                className="gap-2 px-6 h-11"
                onClick={() => setViewBy('student')}
              >
                <User className="w-4 h-4" />
                Per Student
              </Button>
            </div>
          </div>

          {/* Filter Options */}
          <Card className="bg-muted/30 border-none shadow-none rounded-xl">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold uppercase tracking-tight text-muted-foreground">Filter Options</CardTitle>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date From</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-xs h-10 bg-background border-border">
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {dateFrom ? format(dateFrom, "MM/dd/yyyy") : "Select Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} /></PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date To</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-xs h-10 bg-background border-border">
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {dateTo ? format(dateTo, "MM/dd/yyyy") : "Select Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateTo} onSelect={setDateTo} /></PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Section</label>
                  <Select value={historySection} onValueChange={setHistorySection}>
                    <SelectTrigger className="text-xs h-10 bg-background border-border">
                      <SelectValue placeholder="All Sections" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Assigned Sections</SelectItem>
                      {teacherClasses.map(cls => (
                        <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Subject</label>
                  <Select value={historySubject} onValueChange={setHistorySubject}>
                    <SelectTrigger className="text-xs h-10 bg-background border-border">
                      <SelectValue placeholder="All Subjects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      {teacherSubjectsForHistory.map(sub => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</label>
                  <Select value={historyStatus} onValueChange={setHistoryStatus}>
                    <SelectTrigger className="text-xs h-10 bg-background border-border">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="bg-green-600 hover:bg-green-700 text-white gap-2 h-11 px-6 shadow-sm">
                <Download className="w-4 h-4" />
                Export History to CSV
              </Button>
            </CardContent>
          </Card>

          {/* History Table */}
          <Card className="bg-card border shadow-sm rounded-xl overflow-hidden">
            <div className="relative min-h-[400px]">
              {historyLoading && (
                <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="py-4 px-6 text-[11px] font-bold uppercase">Date</TableHead>
                    <TableHead className="py-4 px-6 text-[11px] font-bold uppercase">Student</TableHead>
                    <TableHead className="py-4 px-6 text-[11px] font-bold uppercase">ID</TableHead>
                    <TableHead className="py-4 px-6 text-[11px] font-bold uppercase">Section</TableHead>
                    <TableHead className="py-4 px-6 text-[11px] font-bold uppercase">Subject</TableHead>
                    <TableHead className="py-4 px-6 text-[11px] font-bold uppercase">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedHistory.length > 0 ? (
                    processedHistory.map((rec, idx) => (
                      <TableRow key={idx} className="hover:bg-muted/30 border-b border-border last:border-0 transition-colors">
                        <TableCell className="py-4 px-6 font-medium text-foreground">
                          {safeFormatDate(rec.date)}
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={rec.avatar} />
                              <AvatarFallback>{rec.studentName?.charAt(0) || '?'}</AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-foreground">{rec.studentName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6 text-muted-foreground font-mono text-xs">{rec.studentId}</TableCell>
                        <TableCell className="py-4 px-6 font-medium text-foreground">{rec.section}</TableCell>
                        <TableCell className="py-4 px-6 text-muted-foreground">
                          {rec.subject 
                            ? (rec.subject === 'math' ? 'Mathematics' : rec.subject.charAt(0).toUpperCase() + rec.subject.slice(1)) 
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <Badge variant="outline" className={cn(
                            "rounded-full gap-1 px-3 py-1 font-bold text-[10px] uppercase border",
                            rec.status === 'present' ? "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/30 dark:border-green-800" :
                            rec.status === 'absent' ? "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/30 dark:border-red-800" : "text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-900/30 dark:border-orange-800"
                          )}>
                            {rec.status === 'present' && <CheckCircle2 className="w-3 h-3" />}
                            {rec.status === 'absent' && <XCircle className="w-3 h-3" />}
                            {rec.status === 'late' && <Clock className="w-3 h-3" />}
                            {typeof rec.status === 'string' ? rec.status : 'Unknown'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : !historyLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center text-muted-foreground italic">
                        No attendance records found matching the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
