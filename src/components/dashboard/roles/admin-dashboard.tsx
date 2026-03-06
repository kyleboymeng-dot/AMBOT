"use client"

import { useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy, updateDoc, doc, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Users, 
  BookOpen, 
  CalendarCheck, 
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  Activity,
  UserPlus,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function AdminDashboard() {
  const db = useFirestore();
  const { toast } = useToast();

  // Core Data Queries
  const usersQuery = useMemo(() => collection(db, 'users'), [db]);
  const studentsQuery = useMemo(() => collection(db, 'students'), [db]);
  const requestsQuery = useMemo(() => 
    query(collection(db, 'requests'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'), limit(10)), 
  [db]);

  const { data: users, loading: usersLoading } = useCollection(usersQuery);
  const { data: students, loading: studentsLoading } = useCollection(studentsQuery);
  const { data: requests, loading: requestsLoading } = useCollection(requestsQuery);

  const stats = useMemo(() => {
    const facultyCount = users.filter(u => u.role === 'teacher').length;
    return {
      totalUsers: users.length,
      totalStudents: students.length,
      facultyCount: facultyCount,
      pendingRequests: requests.length
    };
  }, [users, students, requests]);

  const handleRequestAction = async (requestId: string, userId: string, type: string, requestedValue: string, action: 'approved' | 'declined') => {
    const requestRef = doc(db, 'requests', requestId);
    
    // Optimistic UI could be here, but we'll use simple feedback
    updateDoc(requestRef, { status: action })
      .then(async () => {
        if (action === 'approved') {
          // If it was a role change, update the user role
          if (type === 'role_change') {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, { role: requestedValue });
          }
          toast({
            title: "Request Approved",
            description: "The administrative action has been applied.",
          });
        } else {
          toast({
            title: "Request Declined",
            description: "The request has been rejected.",
            variant: "destructive"
          });
        }
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: requestRef.path,
          operation: 'update',
          requestResourceData: { status: action },
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  if (usersLoading || studentsLoading || requestsLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground font-headline">System Control</h2>
          <div className="text-muted-foreground text-sm mt-1">
            Academic Session: <span className="font-semibold text-primary">SY 2025-2026</span> | <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 ml-1">Live Database</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="px-4 py-2 font-bold uppercase tracking-widest text-[10px]">Verified LRNs: {stats.totalStudents}</Badge>
          <Badge variant="secondary" className="px-4 py-2 font-bold uppercase tracking-widest text-[10px]">Faculty Strength: {stats.facultyCount}</Badge>
        </div>
      </section>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Portal Accounts</p>
                <h3 className="text-3xl font-bold mt-1">{stats.totalUsers}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl">
                <Users className="text-primary w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-green-600 font-bold">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              <span>Live tracking</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Faculty Members</p>
                <h3 className="text-3xl font-bold mt-1">{stats.facultyCount}</h3>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <ShieldCheck className="text-blue-600 w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-slate-400 font-medium">
              <span>Active faculty base</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Pending Tasks</p>
                <h3 className="text-3xl font-bold mt-1 text-orange-600">{stats.pendingRequests}</h3>
              </div>
              <div className="p-3 bg-orange-100 rounded-xl">
                <Clock className="text-orange-600 w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-orange-600 font-bold">
              <span>Awaiting review</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Security Health</p>
                <h3 className="text-3xl font-bold mt-1">Stable</h3>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <ShieldAlert className="text-green-600 w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-green-600 font-bold">
              <span>Encryption Active</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pending Requests Table */}
        <Card className="lg:col-span-2 border-none shadow-sm bg-card overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Administrative Requests</CardTitle>
                <CardDescription>Approval queue for role changes and verification.</CardDescription>
              </div>
              <Badge variant="outline" className="border-primary/20 text-primary">AUDIT LOG</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {requests.length > 0 ? requests.map((req: any, i: number) => (
                <div key={i} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10 transition-colors group">
                  <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-primary font-bold text-sm uppercase">
                      {req.userName?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{req.userName}</p>
                      <p className="text-xs text-muted-foreground">
                        Request: <span className="text-primary font-semibold uppercase">{req.type.replace('_', ' ')}</span> to <span className="font-bold">{req.requestedValue}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 gap-1 text-[10px] font-bold border-green-200 text-green-600 hover:bg-green-50"
                      onClick={() => handleRequestAction(req.id, req.userId, req.type, req.requestedValue, 'approved')}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> APPROVE
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 gap-1 text-[10px] font-bold border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => handleRequestAction(req.id, req.userId, req.type, req.requestedValue, 'declined')}
                    >
                      <XCircle className="w-3.5 h-3.5" /> DECLINE
                    </Button>
                  </div>
                </div>
              )) : (
                <div className="p-20 text-center flex flex-col items-center justify-center space-y-3 opacity-40">
                  <Activity className="w-10 h-10" />
                  <p className="text-sm italic">No pending administrative requests at this time.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Health & Identity */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="text-sm font-bold uppercase tracking-tight">System Identity Audit</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Encryption Standard</span>
                  <Badge variant="secondary" className="text-[10px] font-bold">AES-256</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Auth Provider</span>
                  <Badge variant="secondary" className="text-[10px] font-bold">FIREBASE AUTH</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Database Status</span>
                  <Badge className="bg-green-500 hover:bg-green-500 text-white text-[10px] font-bold">OPTIMIZED</Badge>
                </div>
              </div>
              <div className="pt-4 border-t border-border">
                <Button className="w-full justify-start text-xs font-bold gap-2 h-10" variant="outline">
                  <ShieldAlert className="w-4 h-4 text-red-500" /> Security Audit Report
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary text-primary-foreground border-none shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <CardHeader className="relative z-10">
              <CardTitle className="text-base font-bold">Admin Privileges</CardTitle>
              <CardDescription className="text-primary-foreground/70 text-xs">Access Level: Full Authority</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 space-y-4">
              <div className="space-y-2">
                 <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Identity Confirmation</p>
                 <div className="p-3 bg-white/10 rounded-lg flex items-center justify-between border border-white/10">
                    <span className="text-xs font-mono truncate max-w-[150px]">sis-with-mobile-integration</span>
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                 </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}