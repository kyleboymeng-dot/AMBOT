"use client"

import { useAuth } from '@/hooks/use-auth';
import { StudentDashboard } from '@/components/dashboard/roles/student-dashboard';
import { TeacherDashboard } from '@/components/dashboard/roles/teacher-dashboard';
import { AdminDashboard } from '@/components/dashboard/roles/admin-dashboard';
import { RegistrarDashboard } from '@/components/dashboard/roles/registrar-dashboard';

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case 'student':
      return <StudentDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    case 'admin':
      return <AdminDashboard />;
    case 'registrar':
      return <RegistrarDashboard />;
    default:
      return <div>Role not recognized.</div>;
  }
}