"use client"

import { useState, useEffect } from 'react';
import { useAuth, AppUser } from '@/hooks/use-auth';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/components/theme-provider';
import { 
  User, 
  Lock, 
  Bell, 
  Palette, 
  ShieldCheck, 
  Camera, 
  Loader2, 
  Mail,
  Smartphone,
  Info
} from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useAuth as useFirebaseAuth } from '@/firebase';

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    avatar: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        avatar: user.avatar || '',
      });
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsUpdating(true);
    const userRef = doc(db, 'users', user.uid);

    updateDoc(userRef, {
      name: formData.name,
      avatar: formData.avatar,
    })
      .then(() => {
        toast({
          title: "Profile Updated",
          description: "Your personal information has been saved successfully.",
        });
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: { name: formData.name, avatar: formData.avatar },
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsUpdating(false);
      });
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast({
        title: "Reset Link Sent",
        description: `A password reset email has been sent to ${user.email}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email.",
        variant: "destructive"
      });
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <section>
        <h1 className="text-3xl font-bold text-[#1a237e] dark:text-primary tracking-tight">Portal Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account preferences and institutional identity.</p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Navigation / Sidebar Tabs Sidebar */}
        <div className="space-y-2">
          <Button variant="ghost" className="w-full justify-start gap-3 h-11 bg-primary/5 text-primary font-bold">
            <User className="w-4 h-4" />
            Profile Information
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 h-11 text-muted-foreground">
            <Lock className="w-4 h-4" />
            Account Security
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 h-11 text-muted-foreground">
            <Palette className="w-4 h-4" />
            Appearance
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 h-11 text-muted-foreground">
            <Bell className="w-4 h-4" />
            Notifications
          </Button>
        </div>

        {/* Settings Content */}
        <div className="md:col-span-2 space-y-8">
          {/* Profile Card */}
          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border">
              <CardTitle className="text-sm font-bold uppercase tracking-tight">Public Profile</CardTitle>
              <CardDescription>This information is visible to your instructors and peers.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative group">
                  <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                    <AvatarImage src={formData.avatar} />
                    <AvatarFallback className="bg-primary/5 text-primary text-2xl font-bold">
                      {user?.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="space-y-1 text-center sm:text-left">
                  <h3 className="text-xl font-bold">{user?.name}</h3>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 uppercase text-[10px] font-bold">
                      {user?.role}
                    </Badge>
                    <Badge variant="outline" className="uppercase text-[10px] font-bold">
                      ID: {user?.uid?.substring(0, 8)}...
                    </Badge>
                  </div>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4 pt-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs font-bold uppercase text-muted-foreground">Display Name</Label>
                    <Input 
                      id="name" 
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-background border-border h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="avatar" className="text-xs font-bold uppercase text-muted-foreground">Avatar URL</Label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="avatar" 
                        value={formData.avatar}
                        onChange={(e) => setFormData(prev => ({ ...prev, avatar: e.target.value }))}
                        placeholder="https://example.com/photo.jpg"
                        className="bg-background border-border h-11 pl-10"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" className="bg-[#1a237e] dark:bg-primary px-8 h-11 font-bold" disabled={isUpdating}>
                    {isUpdating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Institutional Details */}
          <Card className="border-none shadow-sm rounded-2xl bg-muted/20">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Institutional Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Email Address</p>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  {user?.email}
                </div>
              </div>
              {user?.role === 'student' && (
                <>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Section / Strand</p>
                    <p className="text-sm font-bold">{user.section || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Grade Level</p>
                    <p className="text-sm font-bold">{user.gradeLevel || 'N/A'}</p>
                  </div>
                </>
              )}
              {user?.role === 'teacher' && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Faculty Status</p>
                  <p className="text-sm font-bold text-green-600">Active Duty</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security & Preferences */}
          <div className="space-y-6">
            <Card className="border-none shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-tight">Security & Privacy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold">Password Reset</p>
                    <p className="text-xs text-muted-foreground">Receive a secure link to update your portal password.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handlePasswordReset}>
                    Reset Password
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold">Two-Factor Authentication</p>
                    <p className="text-xs text-muted-foreground">Add an extra layer of security to your account.</p>
                  </div>
                  <Switch disabled />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-tight">Interface Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold">Dark Mode</p>
                    <p className="text-xs text-muted-foreground">Toggle between light and dark portal themes.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant={theme === 'light' ? 'default' : 'outline'} 
                      size="sm" 
                      onClick={() => setTheme('light')}
                      className="text-[10px] font-bold h-8"
                    >
                      LIGHT
                    </Button>
                    <Button 
                      variant={theme === 'dark' ? 'default' : 'outline'} 
                      size="sm" 
                      onClick={() => setTheme('dark')}
                      className="text-[10px] font-bold h-8"
                    >
                      DARK
                    </Button>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive updates about grade postings and attendance alerts.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
