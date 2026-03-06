"use client"

import { useState, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  UserPlus, 
  Loader2,
  Filter,
  GraduationCap,
  Download,
  FileText
} from 'lucide-react';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function RegistrarStudentsPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [strandFilter, setStrandFilter] = useState<string>('all');

  const studentsQuery = useMemo(() => {
    if (!db) return null;
    return collection(db, 'students');
  }, [db]);

  const { data: students, loading } = useCollection(studentsQuery);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
      const studentId = (student.studentId || '').toLowerCase();
      const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || studentId.includes(searchQuery.toLowerCase());
      const matchesStrand = strandFilter === 'all' || student.strand === strandFilter;
      return matchesSearch && matchesStrand;
    });
  }, [students, searchQuery, strandFilter]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1a237e] dark:text-primary">Master Student Records</h1>
          <p className="text-muted-foreground text-sm mt-1">Institutional database of all enrolled students and academic tracks.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-11 px-4 border-slate-200">
            <Download className="w-4 h-4 mr-2" /> Export Roster
          </Button>
          <Button className="bg-[#1a237e] hover:bg-[#121858] dark:bg-primary shadow-lg h-11 px-6 rounded-xl font-bold">
            <UserPlus className="w-4 h-4 mr-2" />
            Add New Record
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-muted/10 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by student name or LRN..." 
                className="pl-9 h-10 bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={strandFilter} onValueChange={setStrandFilter}>
                <SelectTrigger className="w-[200px] bg-white h-10">
                  <SelectValue placeholder="Filter by Strand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Academic Strands</SelectItem>
                  <SelectItem value="STEM">STEM</SelectItem>
                  <SelectItem value="HUMSS">HUMSS</SelectItem>
                  <SelectItem value="ABM">ABM</SelectItem>
                  <SelectItem value="GAS">GAS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <div className="relative min-h-[400px]">
          {loading && (
            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow>
                <TableHead className="py-5 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">Student Profile</TableHead>
                <TableHead className="py-5 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">ID / LRN</TableHead>
                <TableHead className="py-5 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">Classification</TableHead>
                <TableHead className="py-5 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</TableHead>
                <TableHead className="py-5 px-6 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <TableRow key={student.studentId} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                          <GraduationCap className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{student.firstName} {student.lastName}</span>
                          <span className="text-xs text-slate-400">Adviser ID: {student.adviserId || 'None'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6 text-slate-500 font-mono text-xs font-bold">
                      {student.studentId}
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <div className="flex flex-col">
                        <Badge variant="secondary" className="w-fit text-[10px] font-bold uppercase mb-1">{student.strand}</Badge>
                        <span className="text-xs text-slate-400">Grade {student.gradeLevel} • {student.classId}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <Badge className="bg-green-100 text-green-700 border-none uppercase text-[10px] font-bold">Enrolled</Badge>
                    </TableCell>
                    <TableCell className="py-4 px-6 text-right">
                      <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs font-bold text-primary">
                        <FileText className="w-3 h-3" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : !loading && (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 space-y-3">
                      <Search className="w-10 h-10 opacity-20" />
                      <p className="italic">No student records found matching your filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
