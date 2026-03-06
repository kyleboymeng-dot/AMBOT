
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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  UserPlus, 
  MoreVertical, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Loader2,
  Mail,
  User as UserIcon,
  Filter,
  ArrowRightLeft,
  RefreshCw,
  Download,
  Copy,
  Hash,
  Lock,
  UserCircle
} from 'lucide-react';
import { collection, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function UsersManagementPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // Create User State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    gradeLevel: '',
    section: ''
  });

  // State for role update confirmation
  const [roleChangeTarget, setRoleChangeTarget] = useState<{ id: string, name: string, newRole: string } | null>(null);

  const usersQuery = useMemo(() => {
    if (!db) return null;
    return collection(db, 'users');
  }, [db]);

  const { data: users, loading } = useCollection(usersQuery);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.uid?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.email || !newUserData.password || !newUserData.name) {
      toast({ title: "Missing Fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setIsCreating(true);

    try {
      // Initialize a secondary Firebase app to create the user without logging out the admin
      const secondaryAppName = 'secondary-registration-' + Date.now();
      const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);
      
      // 1. Create the Auth User
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        newUserData.email, 
        newUserData.password
      );
      
      const newUid = userCredential.user.uid;
      
      // 2. Create the Firestore Profile
      const userRef = doc(db, 'users', newUid);
      const profileData = {
        uid: newUid,
        name: newUserData.name,
        email: newUserData.email,
        role: newUserData.role,
        gradeLevel: newUserData.role === 'student' ? newUserData.gradeLevel : null,
        section: newUserData.role === 'student' ? newUserData.section : null,
        createdAt: serverTimestamp(),
      };
      
      // Use setDoc to match Document ID with UID
      await setDoc(userRef, profileData);

      // Clean up secondary app
      await signOut(secondaryAuth);
      
      toast({
        title: "User Created Successfully",
        description: `Account for ${newUserData.name} is now active in the portal.`,
      });
      
      setIsCreateDialogOpen(false);
      setNewUserData({
        name: '',
        email: '',
        password: '',
        role: 'student',
        gradeLevel: '',
        section: ''
      });
    } catch (error: any) {
      console.error("Creation Error:", error);
      toast({
        title: "Creation Failed",
        description: error.message || "An error occurred during user registration.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!roleChangeTarget) return;

    const { id, newRole } = roleChangeTarget;
    const userRef = doc(db, 'users', id);
    
    updateDoc(userRef, { role: newRole })
      .then(() => {
        toast({
          title: "Access Level Updated",
          description: `User role has been changed to ${newRole}.`,
        });
        setRoleChangeTarget(null);
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: { role: newRole },
        });
        errorEmitter.emit('permission-error', permissionError);
        setRoleChangeTarget(null);
      });
  };

  const copyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    toast({
      description: "UID copied to clipboard",
      duration: 2000,
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-500/10 text-red-600 border-red-200 dark:border-red-900 uppercase text-[10px] font-bold"><ShieldAlert className="w-3 h-3 mr-1" /> Admin</Badge>;
      case 'teacher':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900 uppercase text-[10px] font-bold"><ShieldCheck className="w-3 h-3 mr-1" /> Teacher</Badge>;
      case 'registrar':
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-900 uppercase text-[10px] font-bold"><Shield className="w-3 h-3 mr-1" /> Registrar</Badge>;
      default:
        return <Badge className="bg-slate-500/10 text-slate-600 border-slate-200 dark:border-slate-800 uppercase text-[10px] font-bold"><UserIcon className="w-3 h-3 mr-1" /> Student</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1a237e] dark:text-primary tracking-tight">Institutional User Base</h1>
          <p className="text-muted-foreground text-sm mt-1 max-w-xl">
            Audit and manage system access levels. Ensure document UIDs match authentication records for seamless portal entry.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-11 px-4 border-slate-200 dark:border-slate-800">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#1a237e] hover:bg-[#121858] dark:bg-primary shadow-lg h-11 px-6 rounded-xl font-bold">
                <UserPlus className="w-4 h-4 mr-2" />
                New Portal Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Provision New Account</DialogTitle>
                <DialogDescription>
                  This creates both a secure authentication login and a Firestore profile for the user.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4 py-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Full Name</Label>
                    <div className="relative">
                      <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="e.g. Juan Dela Cruz" 
                        className="pl-10"
                        value={newUserData.name}
                        onChange={(e) => setNewUserData({...newUserData, name: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Institutional Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        type="email" 
                        placeholder="user@campusconnect.edu" 
                        className="pl-10"
                        value={newUserData.email}
                        onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Temporary Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        type="password" 
                        placeholder="Min. 6 characters" 
                        className="pl-10"
                        value={newUserData.password}
                        onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Role</Label>
                      <Select 
                        value={newUserData.role} 
                        onValueChange={(val) => setNewUserData({...newUserData, role: val})}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="teacher">Teacher</SelectItem>
                          <SelectItem value="registrar">Registrar</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {newUserData.role === 'student' && (
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Grade Level</Label>
                        <Select 
                          value={newUserData.gradeLevel} 
                          onValueChange={(val) => setNewUserData({...newUserData, gradeLevel: val})}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Grade" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Grade 11">Grade 11</SelectItem>
                            <SelectItem value="Grade 12">Grade 12</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {newUserData.role === 'student' && (
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Assigned Section</Label>
                      <Input 
                        placeholder="e.g. STEM-12A" 
                        value={newUserData.section}
                        onChange={(e) => setNewUserData({...newUserData, section: e.target.value})}
                        required={newUserData.role === 'student'}
                      />
                    </div>
                  )}
                </div>
                <DialogFooter className="pt-6">
                  <Button type="button" variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isCreating} className="bg-[#1a237e] dark:bg-primary px-8">
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                    Finalize Profile
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-card border-none shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Users</p>
              <h3 className="text-2xl font-bold">{users.length}</h3>
            </div>
            <UserIcon className="w-8 h-8 text-muted-foreground/20" />
          </CardContent>
        </Card>
        <Card className="bg-card border-none shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Administrators</p>
              <h3 className="text-2xl font-bold text-red-600">{users.filter(u => u.role === 'admin').length}</h3>
            </div>
            <ShieldAlert className="w-8 h-8 text-red-600/20" />
          </CardContent>
        </Card>
        <Card className="bg-card border-none shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Faculty</p>
              <h3 className="text-2xl font-bold text-blue-600">{users.filter(u => u.role === 'teacher').length}</h3>
            </div>
            <ShieldCheck className="w-8 h-8 text-blue-600/20" />
          </CardContent>
        </Card>
        <Card className="bg-card border-none shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Registrars</p>
              <h3 className="text-2xl font-bold text-purple-600">{users.filter(u => u.role === 'registrar').length}</h3>
            </div>
            <Shield className="w-8 h-8 text-purple-600/20" />
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-card">
        <CardHeader className="bg-muted/30 border-b border-border py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="relative w-full lg:w-[400px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, email, or UID..." 
                className="pl-9 h-11 bg-background border-border shadow-none focus-visible:ring-1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-background px-3 h-11 rounded-lg border border-border">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[140px] border-none shadow-none h-8 text-sm focus:ring-0 p-0">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="student">Students</SelectItem>
                    <SelectItem value="teacher">Teachers</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                    <SelectItem value="registrar">Registrars</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="icon" className="h-11 w-11 rounded-lg border border-border bg-background" onClick={() => window.location.reload()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <div className="relative min-h-[500px]">
          {loading && (
            <div className="absolute inset-0 bg-background/50 z-20 flex items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          )}
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="py-6 px-6 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Profile & Identification</TableHead>
                <TableHead className="py-6 px-6 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Institutional Role</TableHead>
                <TableHead className="py-6 px-6 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Classification Details</TableHead>
                <TableHead className="py-6 px-6 text-[11px] font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user.uid} className="hover:bg-muted/30 border-border transition-all duration-200">
                    <TableCell className="py-5 px-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12 border border-border shadow-sm">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="bg-[#1a237e]/5 text-[#1a237e] font-bold text-lg">
                            {user.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col space-y-1">
                          <span className="font-bold text-foreground text-base leading-none">{user.name}</span>
                          <div className="flex items-center text-xs text-muted-foreground gap-1.5">
                            <Mail className="w-3.5 h-3.5" />
                            {user.email}
                          </div>
                          <button 
                            onClick={() => copyUid(user.uid)}
                            className="flex items-center text-[10px] font-mono text-muted-foreground/60 hover:text-primary transition-colors group w-fit"
                          >
                            <Hash className="w-2.5 h-2.5 mr-1" />
                            {user.uid}
                            <Copy className="w-2.5 h-2.5 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-5 px-6">
                      {getRoleBadge(user.role)}
                    </TableCell>
                    <TableCell className="py-5 px-6">
                      <div className="flex flex-col text-sm space-y-1">
                        {user.role === 'student' ? (
                          <>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] bg-slate-50 dark:bg-slate-900">{user.gradeLevel || 'No Grade'}</Badge>
                              <span className="text-xs text-muted-foreground">Sec: <span className="text-foreground font-medium">{user.section || 'N/A'}</span></span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
                            <Shield className="w-3 h-3" />
                            Staff Account
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-5 px-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full hover:bg-muted">
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 p-2 rounded-xl shadow-xl">
                          <DropdownMenuLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2 py-3">Manage Permissions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setRoleChangeTarget({ id: user.uid, name: user.name, newRole: 'student' })} className="gap-3 py-2.5 rounded-lg cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                              <UserIcon className="w-4 h-4 text-slate-600" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">Assign Student Role</span>
                              <span className="text-[10px] text-muted-foreground">Standard portal access</span>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setRoleChangeTarget({ id: user.uid, name: user.name, newRole: 'teacher' })} className="gap-3 py-2.5 rounded-lg cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                              <ShieldCheck className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">Elevate to Teacher</span>
                              <span className="text-[10px] text-muted-foreground">Grade & attendance control</span>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setRoleChangeTarget({ id: user.uid, name: user.name, newRole: 'registrar' })} className="gap-3 py-2.5 rounded-lg cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                              <Shield className="w-4 h-4 text-purple-600" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">Elevate to Registrar</span>
                              <span className="text-[10px] text-muted-foreground">Institutional data control</span>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setRoleChangeTarget({ id: user.uid, name: user.name, newRole: 'admin' })} className="gap-3 py-2.5 rounded-lg cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                              <ShieldAlert className="w-4 h-4 text-red-600" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">Elevate to Admin</span>
                              <span className="text-[10px] text-muted-foreground">Full system control</span>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive gap-3 py-2.5 rounded-lg cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                              <ArrowRightLeft className="w-4 h-4 text-red-600" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">Revoke Access</span>
                              <span className="text-[10px] text-red-500/70">Disable portal sign-in</span>
                            </div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : !loading && (
                <TableRow>
                  <TableCell colSpan={4} className="h-96 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground space-y-4">
                      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                        <Search className="w-10 h-10 opacity-20" />
                      </div>
                      <div className="max-w-xs mx-auto">
                        <p className="font-bold text-foreground">No Records Matching Filter</p>
                        <p className="text-xs mt-2 italic">Try adjusting your search query or role filter. Ensure all user profiles are correctly provisioned in Firestore.</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setRoleFilter('all'); }}>
                        Clear Filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!roleChangeTarget} onOpenChange={() => setRoleChangeTarget(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Confirm Role Change</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              You are about to change <span className="font-bold text-foreground"> {roleChangeTarget?.name}'s</span> role to <span className="font-bold text-primary uppercase">{roleChangeTarget?.newRole}</span>. 
              This will immediately modify their portal access and visible dashboards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdateRole} className="rounded-xl bg-primary hover:bg-primary/90">
              Confirm Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
