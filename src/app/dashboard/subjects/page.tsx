
"use client"

import { useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Loader2, BookOpen } from 'lucide-react';

export default function SubjectsPage() {
  const { user, loading: authLoading } = useAuth();
  const db = useFirestore();

  // Fetch student document from 'students' collection based on user uid
  const studentDocRef = useMemo(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'students', user.uid);
  }, [db, user]);

  const { data: studentData, loading: studentLoading } = useDoc(studentDocRef);

  // Determine subjects to display. Handle both array and object formats.
  const enrolledSubjectsRaw = studentData?.enrolledSubjects;
  const subjectsList = useMemo(() => {
    if (!enrolledSubjectsRaw) return [];
    if (Array.isArray(enrolledSubjectsRaw)) return enrolledSubjectsRaw;
    return [enrolledSubjectsRaw]; // Wrap single object in array
  }, [enrolledSubjectsRaw]);

  if (authLoading || studentLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading enrollment data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section>
        <h1 className="text-3xl font-bold text-[#1a237e] dark:text-primary">Enrolled Subjects</h1>
        <p className="text-muted-foreground text-sm mt-1">View all your enrolled subjects and instructors</p>
      </section>

      <Card className="bg-white dark:bg-card border-none shadow-sm rounded-xl overflow-hidden">
        <div className="p-6 flex justify-between items-center border-b border-slate-50 dark:border-slate-800">
          <h3 className="font-bold text-slate-800 dark:text-slate-200">Current Semester Subjects</h3>
          <span className="text-xs font-semibold text-slate-400">{subjectsList.length} Subjects</span>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/30 dark:bg-muted/10">
              <TableRow className="border-b border-slate-100 dark:border-slate-800">
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-4 px-6 w-16">#</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-4 px-6">Subject Name</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-4 px-6">Strand</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-4 px-6">Section</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-400 py-4 px-6">Grade Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjectsList.length > 0 ? (
                subjectsList.map((row: any, index: number) => (
                  <TableRow key={index} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-muted/5 transition-colors">
                    <TableCell className="py-5 px-6 text-slate-400 font-medium">
                      {index + 1}
                    </TableCell>
                    <TableCell className="py-5 px-6 font-bold text-slate-800 dark:text-slate-100">
                      {row.name || 'N/A'}
                    </TableCell>
                    <TableCell className="py-5 px-6 text-slate-600 dark:text-slate-300 font-medium">
                      {row.strand || studentData?.strand || 'N/A'}
                    </TableCell>
                    <TableCell className="py-5 px-6 text-slate-600 dark:text-slate-300 font-medium">
                      {studentData?.classId || 'N/A'}
                    </TableCell>
                    <TableCell className="py-5 px-6 text-slate-600 dark:text-slate-300 font-medium">
                      {row.gradeLevel || studentData?.gradeLevel || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-muted flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-400 italic">No enrolled subjects found in your record.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="p-6 border-t border-slate-50 dark:border-slate-800 flex flex-wrap gap-8">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Total Enrolled Subjects: <span className="text-slate-600 dark:text-slate-300 ml-1">{subjectsList.length}</span>
          </p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Section: <span className="text-slate-800 dark:text-slate-100 font-bold ml-1">{studentData?.classId || user?.section || 'N/A'}</span>
          </p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Academic Year: <span className="text-slate-800 dark:text-slate-100 font-bold ml-1">2025-2026</span>
          </p>
        </div>
      </Card>
    </div>
  );
}
