"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  Calendar, 
  Users, 
  History,
  Briefcase,
  Layers,
  FileText,
  ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Role } from '@/lib/mock-data';

interface SidebarNavProps {
  role: Role;
}

const navItems = {
  student: [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Enrolled Subjects', icon: Layers, href: '/dashboard/subjects' },
    { name: 'Academic Records', icon: BookOpen, href: '/dashboard/grades' },
    { name: 'My Attendance', icon: History, href: '/dashboard/attendance' },
    { name: 'Class Schedule', icon: Calendar, href: '/dashboard/schedule' },
  ],
  teacher: [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Attendance Logger', icon: History, href: '/dashboard/attendance' },
    { name: 'Grade Submissions', icon: BookOpen, href: '/dashboard/grades' },
    { name: 'Class Schedule', icon: Calendar, href: '/dashboard/schedule' },
  ],
  admin: [
    { name: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Academic Structure', icon: Briefcase, href: '/dashboard/structure' },
    { name: 'Users Management', icon: Users, href: '/dashboard/users' },
  ],
  registrar: [
    { name: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Schedule Management', icon: Calendar, href: '/dashboard/schedule' },
    { name: 'Student Records', icon: FileText, href: '/dashboard/students' },
    { name: 'Enrollment Tracking', icon: ClipboardList, href: '/dashboard/enrollment' },
  ],
};

export function SidebarNav({ role }: SidebarNavProps) {
  const pathname = usePathname();
  const items = navItems[role] || [];

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight text-sidebar-primary">CampusConnect</h1>
        <p className="text-xs opacity-60 mt-1 uppercase tracking-widest">School Portal</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {items.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors group",
              pathname === item.href 
                ? "bg-sidebar-accent text-sidebar-primary font-medium" 
                : "hover:bg-sidebar-accent/50 opacity-80 hover:opacity-100"
            )}
          >
            <item.icon className={cn("w-5 h-5", pathname === item.href ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground")} />
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}