"use client"

import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Sun, Moon, Settings, LogOut, BookOpen, Calendar, Users, History, LayoutDashboard, FileText, ClipboardList, Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import Image from 'next/image';
import LogoImage from '@/assets/supreme1.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DashboardHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const isStudent = user?.role === 'student';

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchableItems = useMemo(() => {
    const items = [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['student', 'teacher', 'admin', 'registrar'] },
      { name: 'Grades', href: '/dashboard/grades', icon: BookOpen, roles: ['student', 'teacher'] },
      { name: 'Attendance', href: '/dashboard/attendance', icon: History, roles: ['student', 'teacher'] },
      { name: 'Schedule', href: '/dashboard/schedule', icon: Calendar, roles: ['student', 'teacher', 'registrar'] },
      { name: 'Subjects', href: '/dashboard/subjects', icon: Layers, roles: ['student'] },
      { name: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['student', 'teacher', 'admin', 'registrar'] },
      { name: 'Users Management', href: '/dashboard/users', icon: Users, roles: ['admin'] },
      { name: 'Student Records', href: '/dashboard/students', icon: FileText, roles: ['registrar'] },
      { name: 'Enrollment Tracking', href: '/dashboard/enrollment', icon: ClipboardList, roles: ['registrar'] },
    ];

    return items.filter(item => user && item.roles.includes(user.role));
  }, [user]);

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchableItems.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, searchableItems]);

  const ProfileDropdown = ({ size = "h-8 w-8" }: { size?: string }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className={cn(size, "border cursor-pointer hover:opacity-80 transition-opacity")}>
          <AvatarImage src={user?.avatar} />
          <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex items-center w-full cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="mr-2 h-4 w-4" />
          ) : (
            <Moon className="mr-2 h-4 w-4" />
          )}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings" className="flex items-center w-full cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const SearchEngine = () => (
    <div className="relative w-64 max-w-full" ref={searchRef}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input 
        placeholder="Quick search..." 
        className="pl-9 h-9 bg-muted/50 border-none text-sm focus-visible:ring-1 focus-visible:ring-primary/20"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setShowResults(true);
        }}
        onFocus={() => setShowResults(true)}
      />
      {showResults && filteredResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="p-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 py-2">Quick Results</p>
            <div className="space-y-1">
              {filteredResults.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    router.push(result.href);
                    setShowResults(false);
                    setSearchQuery('');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 rounded-lg transition-colors text-left group"
                >
                  <div className="p-1.5 bg-primary/5 rounded-md group-hover:bg-primary/10 transition-colors">
                    <result.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{result.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {showResults && searchQuery.trim() && filteredResults.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl z-[100] p-4 text-center animate-in fade-in duration-200">
          <p className="text-xs text-muted-foreground italic">No matches found for &quot;{searchQuery}&quot;</p>
        </div>
      )}
    </div>
  );

  if (isStudent) {
    return (
      <header className="h-16 border-b bg-card flex items-center justify-between px-8 shrink-0 shadow-sm relative z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 relative rounded-full overflow-hidden border border-primary/20 bg-white">
            <Image 
              src={LogoImage} 
              alt="Logo" 
              fill 
              className="object-contain"
            />
          </div>
          <span className="font-bold text-[#1a237e] dark:text-primary text-lg hidden sm:block">CampusConnect</span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <Link 
            href="/dashboard" 
            className={cn(
              "text-sm font-medium transition-colors relative py-5",
              pathname === '/dashboard' ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Home
          </Link>
          <Link 
            href="/dashboard/grades" 
            className={cn(
              "text-sm font-medium transition-colors relative py-5",
              pathname === '/dashboard/grades' ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Grades
          </Link>
          <Link 
            href="/dashboard/attendance" 
            className={cn(
              "text-sm font-medium transition-colors relative py-5",
              pathname === '/dashboard/attendance' ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Attendance
          </Link>
          <Link 
            href="/dashboard/schedule" 
            className={cn(
              "text-sm font-medium transition-colors relative py-5",
              pathname === '/dashboard/schedule' ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Schedule
          </Link>
          <Link 
            href="/dashboard/subjects" 
            className={cn(
              "text-sm font-medium transition-colors relative py-5",
              pathname === '/dashboard/subjects' ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Subjects
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <SearchEngine />
          <ProfileDropdown />
        </div>
      </header>
    );
  }

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-8 shrink-0 relative z-50">
      <div className="flex items-center gap-4 flex-1">
        <SearchEngine />
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
          <ProfileDropdown size="h-9 w-9" />
        </div>
      </div>
    </header>
  );
}
