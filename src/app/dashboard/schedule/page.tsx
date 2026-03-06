"use client"

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  Clock, 
  MapPin, 
  User, 
  Download, 
  Filter, 
  Loader2, 
  Calendar, 
  Plus,
  BookOpen,
  Users as UsersIcon,
  Check,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface ScheduleItem {
  subject: string;
  teacher: string;
  room: string;
  classId: string;
}

interface ScheduleSlot {
  time: string;
  days: {
    [key: string]: ScheduleItem;
  };
}

const DAYS = [
  { label: 'Mon', key: 'Monday' },
  { label: 'Tue', key: 'Tuesday' },
  { label: 'Wed', key: 'Wednesday' },
  { label: 'Thu', key: 'Thursday' },
  { label: 'Fri', key: 'Friday' },
  { label: 'Sat', key: 'Saturday' },
] as const;

export default function SchedulePage() {
  const { user, loading: authLoading } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    classId: '',
    subjectId: '',
    teacherId: '',
    dayOfWeek: '',
    startTime: '',
    endTime: '',
    room: ''
  });

  const isRegistrar = user?.role === 'registrar';
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  const canManageSchedules = isRegistrar || isAdmin;

  // Queries
  const schedulesQuery = useMemo(() => {
    if (!db || !user) return null;
    const baseRef = collection(db, 'schedules');
    
    // Admin and Registrar see everything
    if (isAdmin || isRegistrar) {
      return baseRef;
    }

    // Teachers see only their assigned classes
    if (isTeacher) {
      return query(baseRef, where('teacherId', '==', user.uid));
    }

    // Students see only their section's classes
    if (isStudent) {
      if (!user.section) {
        // Return a dummy query that yields no results if the student has no section
        return query(baseRef, where('classId', '==', '___UNASSIGNED___'));
      }
      return query(baseRef, where('classId', '==', user.section.toUpperCase()));
    }

    // Default for any other role: see nothing
    return query(baseRef, where('classId', '==', '___NONE___'));
  }, [db, user, isTeacher, isStudent, isAdmin, isRegistrar]);

  const teachersQuery = useMemo(() => {
    if (!db || !canManageSchedules) return null;
    return query(collection(db, 'users'), where('role', '==', 'teacher'));
  }, [db, canManageSchedules]);

  const studentsQuery = useMemo(() => {
    if (!db || !canManageSchedules) return null;
    return collection(db, 'students');
  }, [db, canManageSchedules]);

  const { data: rawSchedules, loading: schedulesLoading } = useCollection(schedulesQuery);
  const { data: teachers, loading: teachersLoading } = useCollection(teachersQuery);
  const { data: students, loading: studentsLoading } = useCollection(studentsQuery);

  // Derive unique sections from student records
  const availableSections = useMemo(() => {
    if (!students) return [];
    return Array.from(new Set(students.map(s => s.classId))).sort();
  }, [students]);

  // Transform Firestore data into grid slots
  const scheduleGrid = useMemo(() => {
    if (!rawSchedules) return [];

    const slotsMap: Record<string, ScheduleSlot> = {};

    rawSchedules.forEach((rec: any) => {
      const timeKey = `${rec.startTime} - ${rec.endTime}`;
      if (!slotsMap[timeKey]) {
        slotsMap[timeKey] = {
          time: timeKey,
          days: {}
        };
      }

      const teacherDoc = teachers.find(t => t.uid === rec.teacherId);
      const teacherName = teacherDoc ? teacherDoc.name : (rec.teacherId === user?.uid ? "Me" : "Staff");

      slotsMap[timeKey].days[rec.dayOfWeek] = {
        subject: rec.subjectId,
        teacher: teacherName,
        room: rec.room || "TBA",
        classId: rec.classId
      };
    });

    return Object.values(slotsMap).sort((a, b) => a.time.localeCompare(b.time));
  }, [rawSchedules, teachers, user]);

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageSchedules || !db) return;

    setIsSaving(true);
    const scheduleData = {
      ...formData,
      classId: formData.classId.toUpperCase(),
      createdAt: serverTimestamp()
    };

    addDoc(collection(db, 'schedules'), scheduleData)
      .then(() => {
        toast({
          title: "Schedule Assigned",
          description: `Successfully assigned ${formData.subjectId} to ${formData.classId}.`,
        });
        setIsAddModalOpen(false);
        setFormData({
          classId: '',
          subjectId: '',
          teacherId: '',
          dayOfWeek: '',
          startTime: '',
          endTime: '',
          room: ''
        });
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: 'schedules',
          operation: 'create',
          requestResourceData: scheduleData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  if (authLoading || schedulesLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <section>
          <h1 className="text-3xl font-bold text-[#1a237e] dark:text-primary">
            {canManageSchedules ? "Institutional Timetable" : "Class Schedule"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {canManageSchedules 
              ? "Oversee and coordinate all institutional time slots and room assignments." 
              : `View your weekly assigned classes for ${user?.section || 'the current semester'}.`}
          </p>
        </section>
        <div className="flex gap-2">
          {canManageSchedules && (
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#1a237e] dark:bg-primary gap-2 h-11 px-6 font-bold shadow-md rounded-xl">
                  <Plus className="w-4 h-4" /> Add Schedule Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">New Schedule Assignment</DialogTitle>
                  <DialogDescription>
                    Assign a subject, teacher, and room to a specific section.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddSchedule} className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Target Section</Label>
                      <Select value={formData.classId} onValueChange={(val) => setFormData({...formData, classId: val})} required>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select Section" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSections.length > 0 ? (
                            availableSections.map(sec => (
                              <SelectItem key={sec} value={sec}>{sec}</SelectItem>
                            ))
                          ) : (
                            <div className="p-2 text-center text-xs text-muted-foreground">No sections available</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Subject Name</Label>
                      <Input 
                        placeholder="e.g. Physics 101" 
                        value={formData.subjectId}
                        onChange={(e) => setFormData({...formData, subjectId: e.target.value})}
                        required 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Assign Instructor</Label>
                    <Select value={formData.teacherId} onValueChange={(val) => setFormData({...formData, teacherId: val})} required>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder={teachersLoading ? "Loading Teachers..." : "Select Teacher"} />
                      </SelectTrigger>
                      <SelectContent>
                        {teachersLoading ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          </div>
                        ) : teachers.length > 0 ? (
                          teachers.map(teacher => (
                            <SelectItem key={teacher.uid} value={teacher.uid}>
                              {teacher.name || teacher.email}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            <span>No teachers found in registry.</span>
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Day of Week</Label>
                      <Select value={formData.dayOfWeek} onValueChange={(val) => setFormData({...formData, dayOfWeek: val})} required>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select Day" />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS.map(day => (
                            <SelectItem key={day.key} value={day.key}>{day.key}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Room Number</Label>
                      <Input 
                        placeholder="e.g. 402-B" 
                        value={formData.room}
                        onChange={(e) => setFormData({...formData, room: e.target.value})}
                        required 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Start Time</Label>
                      <Input 
                        type="time" 
                        value={formData.startTime}
                        onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">End Time</Label>
                      <Input 
                        type="time" 
                        value={formData.endTime}
                        onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                        required 
                      />
                    </div>
                  </div>

                  <DialogFooter className="pt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSaving || !formData.teacherId} className="bg-[#1a237e] dark:bg-primary px-8">
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Finalize Entry
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
          <Button variant="outline" className="gap-2 h-11 px-4 font-bold text-xs border-primary/20 text-primary">
            <Download className="w-4 h-4" /> Export PDF
          </Button>
        </div>
      </div>

      <Card className="bg-white dark:bg-card border-none shadow-sm rounded-xl overflow-x-auto">
        <CardContent className="p-0">
          <table className="w-full border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-muted/10">
                <th className="py-6 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-40">
                  <div className="flex flex-col items-center gap-1">
                    <Clock className="w-4 h-4 opacity-30" />
                    <span>Time Slot</span>
                  </div>
                </th>
                {DAYS.map((day) => (
                  <th key={day.key} className="py-6 px-4 text-center">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{day.label}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scheduleGrid.length > 0 ? scheduleGrid.map((slot, rowIndex) => (
                <tr key={rowIndex} className="border-b border-slate-50 dark:border-slate-800 last:border-0">
                  <td className="py-8 px-4 text-center">
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{slot.time.split(' - ')[0]}</p>
                      <div className="w-4 h-[1px] bg-slate-200 mx-auto" />
                      <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{slot.time.split(' - ')[1]}</p>
                    </div>
                  </td>
                  {DAYS.map((day) => {
                    const item = slot.days[day.key];
                    return (
                      <td key={day.key} className="p-2 align-top">
                        {item ? (
                          <div className="bg-[#f0f7ff] dark:bg-primary/5 border-l-4 border-l-[#1a237e] dark:border-l-primary rounded-lg p-3 space-y-2 transition-all hover:shadow-md cursor-default group h-full">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="text-[13px] font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight">
                                {item.subject}
                              </h4>
                              {canManageSchedules && (
                                <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded">
                                   <Check className="w-3 h-3 text-green-600" />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                <User className="w-3 h-3 opacity-60" />
                                <span className="line-clamp-1">{item.teacher}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                <MapPin className="w-3 h-3 opacity-60" />
                                <span>{item.room}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-bold text-primary/70 uppercase">
                                <BookOpen className="w-3 h-3 opacity-60" />
                                <span>{item.classId}</span>
                              </div>
                            </div>
                            
                            {canManageSchedules && (
                              <div className="pt-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                <Button size="sm" variant="ghost" className="h-6 w-full text-[9px] font-bold uppercase tracking-wider text-primary p-0 border border-primary/10 bg-white dark:bg-background">
                                  Edit Assignment
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center text-slate-200 dark:text-slate-800 py-12">
                            <span className="text-2xl">•</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4 text-muted-foreground">
                       <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                         <Calendar className="w-8 h-8 opacity-20" />
                       </div>
                       <div className="space-y-1">
                        <p className="text-base font-bold text-foreground">No Schedule Data Available</p>
                        <p className="text-sm italic">Institutional records are empty or matching criteria failed.</p>
                       </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
      
      {!canManageSchedules && (
        <Card className="bg-muted/10 border-dashed rounded-xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/5 rounded-full">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Dynamic Sync Active</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your timetable is synchronized with the master database. Any changes made by the Registrar's office will be reflected here instantly.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
