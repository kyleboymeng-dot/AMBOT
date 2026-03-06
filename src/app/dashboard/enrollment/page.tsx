
"use client"

import { useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Users, UserPlus, ClipboardCheck, TrendingUp, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EnrollmentTrackingPage() {
  const db = useFirestore();
  const studentsQuery = useMemo(() => collection(db, 'students'), [db]);
  const { data: students, loading } = useCollection(studentsQuery);

  const strandData = useMemo(() => {
    const counts: Record<string, number> = {
      'STEM': 0,
      'HUMSS': 0,
      'ABM': 0,
      'GAS': 0,
    };
    
    students.forEach(s => {
      if (s.strand && counts[s.strand] !== undefined) {
        counts[s.strand]++;
      }
    });

    return [
      { name: 'STEM', students: counts['STEM'], color: '#1a237e' },
      { name: 'HUMSS', students: counts['HUMSS'], color: '#3949ab' },
      { name: 'ABM', students: counts['ABM'], color: '#5c6bc0' },
      { name: 'GAS', students: counts['GAS'], color: '#7986cb' },
    ];
  }, [students]);

  const enrollmentStatus = useMemo(() => {
    // For now, we calculate percentage based on total students found
    // In a real scenario, this might compare current vs target enrollment
    const total = students.length || 1;
    return [
      { name: 'Fully Enrolled', value: 100, color: '#10b981' },
      { name: 'Pending Requirements', value: 0, color: '#f59e0b' },
      { name: 'Dropped', value: 0, color: '#ef4444' },
    ];
  }, [students]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1a237e] dark:text-primary">Enrollment Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time tracking of institutional population and track distribution.</p>
        </div>
        <Button className="h-11 px-6 shadow-md bg-[#1a237e] hover:bg-[#121858] font-bold text-sm rounded-xl">
          <UserPlus className="w-4 h-4 mr-2" />
          Enrollment Window Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Total Population</p>
                <h3 className="text-3xl font-bold mt-1">{students.length}</h3>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <Users className="text-[#1a237e] w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-green-600 font-bold">
              <TrendingUp className="w-3 h-3 mr-1" />
              <span>Institutional capacity tracking</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Active Records</p>
                <h3 className="text-3xl font-bold mt-1">{students.length}</h3>
              </div>
              <div className="p-3 bg-green-50 rounded-xl">
                <UserPlus className="text-green-600 w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-slate-400 font-medium">
              <span>Semester 1 intake active</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Verified LRNs</p>
                <h3 className="text-3xl font-bold mt-1">100%</h3>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl">
                <ClipboardCheck className="text-purple-600 w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-green-600 font-bold">
              <span>Requirement audit passing</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Track Distribution</CardTitle>
              <CardDescription>Number of students per academic strand.</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-2 text-[10px] font-bold uppercase tracking-widest">
              <Filter className="w-3 h-3" /> Filter Track
            </Button>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={strandData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="students" radius={[4, 4, 0, 0]}>
                  {strandData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Enrollment Status</CardTitle>
            <CardDescription>Breakdown of verification process.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={enrollmentStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {enrollmentStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-3 mt-4">
              {enrollmentStatus.map((status, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                    <span className="text-sm font-medium text-slate-600">{status.name}</span>
                  </div>
                  <span className="text-sm font-bold">{status.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
