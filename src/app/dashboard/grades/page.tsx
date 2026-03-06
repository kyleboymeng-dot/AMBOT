
"use client"

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SquarePen, User, Loader2, Search, TrendingUp, Calculator, History, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';

export default function GradesPage() {
  const { user, loading: authLoading } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState<string>('all');

  // New Grade Form State
  const [formStudentId, setFormStudentId] = useState<string>('');
  const [formSubject, setFormSubject] = useState<string>('');

  // Live Calculation State for Modal
  const [liveScores, setLiveScores] = useState({ written: 0, performance: 0, exam: 0 });
  const liveOverall = useMemo(() => {
    return (liveScores.written * 0.3 + liveScores.performance * 0.4 + liveScores.exam * 0.3).toFixed(2);
  }, [liveScores]);

  // Queries
  const schedulesQuery = useMemo(() => {
    if (!db || !user || user.role !== 'teacher') return null;
    return query(collection(db, 'schedules'), where('teacherId', '==', user.uid));
  }, [db, user]);

  const { data: mySchedules, loading: schedulesLoading } = useCollection(schedulesQuery);

  const teacherClasses = useMemo(() => {
    if (!mySchedules) return [];
    return Array.from(new Set(mySchedules.map(s => s.classId))).sort();
  }, [mySchedules]);

  // For Student view: Fetch their own grades
  const studentGradesQuery = useMemo(() => {
    if (!db || !user || user.role !== 'student') return null;
    return query(collection(db, 'grades'), where('studentId', '==', user.uid), orderBy('createdAt', 'desc'));
  }, [db, user]);
  const { data: myGrades, loading: gradesLoading } = useCollection(studentGradesQuery);

  // For Teacher view: Fetch students
  const studentsQuery = useMemo(() => {
    if (!db || !user || user.role === 'student') return null;
    return collection(db, 'students');
  }, [db, user]);
  const { data: students, loading: studentsLoading } = useCollection(studentsQuery);

  // Filtered Students for Teacher List
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    return students.filter(s => {
      // Security: Teachers only see students in their assigned sections
      const isAssigned = teacherClasses.includes(s.classId);
      if (!isAssigned && user?.role === 'teacher') return false;

      const fullName = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
      const id = (s.studentId || '').toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchesSearch = fullName.includes(q) || id.includes(q);
      const matchesSection = sectionFilter === 'all' || s.classId === sectionFilter;
      return matchesSearch && matchesSection;
    });
  }, [students, searchQuery, sectionFilter, teacherClasses, user]);

  // Derive allowed subjects for the form based on selected student
  const formAllowedSubjects = useMemo(() => {
    if (!mySchedules || !formStudentId || !students) return [];
    const student = students.find(s => s.studentId === formStudentId);
    if (!student) return [];
    
    return Array.from(new Set(
      mySchedules
        .filter(s => s.classId === student.classId)
        .map(s => s.subjectId)
    )).sort();
  }, [mySchedules, formStudentId, students]);

  // Fetch Existing Grades for the Selected Student (Teacher Side-view)
  // SECURE: Teachers only see the grades THEY posted for this student
  const selectedStudentGradesQuery = useMemo(() => {
    if (!db || !selectedStudent || !user) return null;
    const base = collection(db, 'grades');
    const studentFilter = where('studentId', '==', selectedStudent.studentId);
    
    if (user.role === 'teacher') {
      return query(
        base, 
        studentFilter, 
        where('teacherId', '==', user.uid), 
        orderBy('createdAt', 'desc')
      );
    }
    
    return query(base, studentFilter, orderBy('createdAt', 'desc'));
  }, [db, selectedStudent, user]);
  
  const { data: selectedGrades, loading: selectedGradesLoading } = useCollection(selectedStudentGradesQuery);

  if (authLoading || gradesLoading || studentsLoading || schedulesLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isStudent = user?.role === 'student';

  const handleAddGrade = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formStudentId || !formSubject) {
      toast({ title: "Missing Fields", description: "Select a student and subject.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const gradeData = {
      studentId: formStudentId,
      subject: formSubject,
      written: liveScores.written,
      performance: liveScores.performance,
      exam: liveScores.exam,
      overall: parseFloat(liveOverall),
      teacherId: user?.uid,
      semester: 'SY 2025-2026 SEM I',
      createdAt: serverTimestamp(),
    };

    addDoc(collection(db, 'grades'), gradeData)
      .then(() => {
        setIsAddModalOpen(false);
        setIsSaving(false);
        setFormStudentId('');
        setFormSubject('');
        setLiveScores({ written: 0, performance: 0, exam: 0 });
        toast({
          title: "Grade Recorded",
          description: `Successfully added grade for ${formSubject}.`,
        });
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: 'grades',
          operation: 'create',
          requestResourceData: gradeData,
        });
        errorEmitter.emit('permission-error', permissionError);
        setIsSaving(false);
      });
  };

  if (isStudent) {
    const overallGWA = myGrades.length > 0 
      ? (myGrades.reduce((acc, g) => acc + (g.overall || 0), 0) / myGrades.length).toFixed(2)
      : '0.00';

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <section>
          <h1 className="text-3xl font-bold text-[#1a237e] dark:text-primary">Grades</h1>
          <p className="text-muted-foreground text-sm mt-1">View your academic performance and grades</p>
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
                  <SelectItem value="2025-2026 Semester 2">2025-2026 Semester 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-none shadow-sm rounded-xl overflow-hidden">
          <div className="p-6 flex justify-between items-center border-b border-border">
            <h3 className="font-bold text-foreground">Personal Academic Records</h3>
            <div className="text-right">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-tighter block">Overall GWA</span>
              <span className="text-lg font-bold text-primary">{overallGWA}</span>
            </div>
          </div>
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="border-b border-border">
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4 px-6">Subject</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4 px-6 text-center">Written Works</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4 px-6 text-center">Performance Tasks</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4 px-6 text-center">Exam</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4 px-6 text-center">Overall Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myGrades.length > 0 ? (
                myGrades.map((row, idx) => (
                  <TableRow key={idx} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <TableCell className="py-5 px-6 font-medium text-foreground">
                      {row.subject}
                    </TableCell>
                    <TableCell className="py-5 px-6 text-center text-foreground font-medium">{row.written}</TableCell>
                    <TableCell className="py-5 px-6 text-center text-foreground font-medium">{row.performance}</TableCell>
                    <TableCell className="py-5 px-6 text-center text-foreground font-medium">{row.exam}</TableCell>
                    <TableCell className="py-5 px-6 text-center font-bold text-foreground">{row.overall}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground italic">No grades recorded yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Card className="bg-card border-none shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Grade Submissions</h1>
                  <p className="text-sm text-muted-foreground mt-1">Institutional record management for current semester.</p>
                </div>
                <div className="flex gap-2">
                  <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#1a237e] hover:bg-[#121858] dark:bg-primary px-6 h-11 shadow-md font-bold text-sm rounded-xl">
                        Add New Grade
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Record New Grade</DialogTitle>
                        <DialogDescription>
                          Enter standard scores. Overall score is auto-calculated using weighted distribution.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleAddGrade} className="space-y-6 py-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Select Student</Label>
                            <Select value={formStudentId} onValueChange={(val) => { setFormStudentId(val); setFormSubject(''); }} required>
                              <SelectTrigger className="bg-background border-border">
                                <SelectValue placeholder="Select student" />
                              </SelectTrigger>
                              <SelectContent>
                                {filteredStudents.map(s => (
                                  <SelectItem key={s.studentId} value={s.studentId}>{s.firstName} {s.lastName} ({s.studentId})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Subject</Label>
                            <Select value={formSubject} onValueChange={setFormSubject} disabled={!formStudentId} required>
                              <SelectTrigger className="bg-background border-border">
                                <SelectValue placeholder={formStudentId ? "Select target subject" : "Select student first"} />
                              </SelectTrigger>
                              <SelectContent>
                                {formAllowedSubjects.map(sub => (
                                  <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="p-4 bg-muted/30 rounded-lg border border-dashed border-border space-y-4">
                             <div className="flex items-center justify-between">
                               <Label className="text-xs font-bold uppercase flex items-center gap-2">
                                 <Calculator className="w-3 h-3" /> 
                                 Live Calculation (Weighted)
                               </Label>
                               <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                                 Overall: {liveOverall}
                               </Badge>
                             </div>
                             <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Written (30%)</Label>
                                  <Input 
                                    name="written" 
                                    type="number" 
                                    step="0.01" 
                                    placeholder="0" 
                                    className="bg-background border-border"
                                    required 
                                    onChange={(e) => setLiveScores(prev => ({ ...prev, written: parseFloat(e.target.value) || 0 }))}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Perf (40%)</Label>
                                  <Input 
                                    name="performance" 
                                    type="number" 
                                    step="0.01" 
                                    placeholder="0" 
                                    className="bg-background border-border"
                                    required 
                                    onChange={(e) => setLiveScores(prev => ({ ...prev, performance: parseFloat(e.target.value) || 0 }))}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Exam (30%)</Label>
                                  <Input 
                                    name="exam" 
                                    type="number" 
                                    step="0.01" 
                                    placeholder="0" 
                                    className="bg-background border-border"
                                    required 
                                    onChange={(e) => setLiveScores(prev => ({ ...prev, exam: parseFloat(e.target.value) || 0 }))}
                                  />
                                </div>
                             </div>
                          </div>
                        </div>
                        <DialogFooter className="pt-4">
                          <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                          <Button type="submit" className="bg-[#1a237e] dark:bg-primary px-8" disabled={isSaving || !formSubject}>
                            {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Commit Grade
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="flex items-center gap-4 py-2 border-y border-border">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search student name or ID..." 
                    className="pl-9 h-11 border-border bg-background"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={sectionFilter} onValueChange={setSectionFilter}>
                  <SelectTrigger className="w-[180px] h-11 bg-background border-border">
                    <SelectValue placeholder="Filter Section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assigned Sections</SelectItem>
                    {teacherClasses.map(cls => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border shadow-sm overflow-hidden rounded-xl">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="font-bold text-foreground py-5 px-6">Student Information</TableHead>
                  <TableHead className="font-bold text-foreground py-5 px-6">ID Number</TableHead>
                  <TableHead className="font-bold text-foreground py-5 px-6">Class Assignment</TableHead>
                  <TableHead className="font-bold text-foreground py-5 px-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <TableRow 
                      key={student.studentId} 
                      className={cn(
                        "border-b border-border transition-colors cursor-pointer group",
                        selectedStudent?.studentId === student.studentId ? "bg-primary/5" : "hover:bg-muted/30"
                      )}
                      onClick={() => setSelectedStudent(student)}
                    >
                      <TableCell className="py-5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-primary">
                            {student.firstName?.charAt(0)}{student.lastName?.charAt(0)}
                          </div>
                          <span className="capitalize text-foreground font-bold">
                            {student.firstName} {student.lastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-5 px-6 text-muted-foreground font-mono text-xs">
                        {student.studentId}
                      </TableCell>
                      <TableCell className="py-5 px-6">
                        <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider">
                          {student.classId}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-5 px-6 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-9 h-9 text-muted-foreground hover:text-primary rounded-full transition-all"
                        >
                          <SquarePen className="w-5 h-5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center text-muted-foreground italic">
                      No matches found matching your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="bg-card border-none shadow-sm sticky top-8 rounded-xl overflow-hidden min-h-[400px]">
             <CardHeader className="bg-muted/30 border-b py-4">
                <CardTitle className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Student Detail
                </CardTitle>
             </CardHeader>
             <CardContent className="p-0">
              {selectedStudent ? (
                <div className="animate-in fade-in zoom-in-95 duration-200 flex flex-col h-full">
                  <div className="p-6 text-center space-y-3 bg-card">
                    <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto border-2 border-background shadow-sm">
                      <User className="w-10 h-10 text-primary/40" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl capitalize text-foreground">
                        {selectedStudent.firstName} {selectedStudent.lastName}
                      </h3>
                      <p className="text-xs font-mono text-muted-foreground mt-1 uppercase tracking-widest">{selectedStudent.studentId}</p>
                    </div>
                    <div className="flex justify-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-bold uppercase">{selectedStudent.strand || 'N/A'}</Badge>
                      <Badge variant="outline" className="text-[10px] font-bold uppercase">{selectedStudent.classId}</Badge>
                    </div>
                  </div>

                  <div className="flex-1 bg-muted/5 p-6 space-y-6">
                    <div>
                      <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-4 flex items-center gap-2">
                        <History className="w-3 h-3" />
                        Your Grade Postings
                      </h4>
                      
                      {selectedGradesLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : selectedGrades.length > 0 ? (
                        <div className="space-y-3">
                          {selectedGrades.map((g, idx) => (
                            <div key={idx} className="bg-card p-3 rounded-lg border border-border shadow-sm flex items-center justify-between group">
                              <div>
                                <p className="text-xs font-bold text-foreground">{g.subject}</p>
                                <p className="text-[9px] text-muted-foreground uppercase">{safeFormatDate(g.createdAt?.seconds ? g.createdAt.seconds * 1000 : g.createdAt)}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-bold text-primary">{g.overall}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-12 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-center px-4">
                          <AlertCircle className="w-8 h-8 text-muted-foreground/30 mb-2" />
                          <p className="text-xs text-muted-foreground italic">You haven't recorded any grades for this student.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 border-t border-border bg-card">
                    <Button variant="ghost" className="w-full text-xs h-9 text-muted-foreground hover:bg-muted/30" onClick={() => setSelectedStudent(null)}>
                      Deselect Student
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-24 px-8 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-bold uppercase tracking-tight">No Selection</p>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">Select a student from the roster to view your recorded grade history and calculated performance metrics.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  function safeFormatDate(dateVal: any) {
    if (!dateVal) return 'N/A';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString();
    } catch (e) {
      return 'N/A';
    }
  }
}
