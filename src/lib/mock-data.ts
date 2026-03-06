export type Role = 'student' | 'teacher' | 'admin' | 'registrar';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  gradeLevel?: string;
  section?: string;
}

export const MOCK_USERS: User[] = [
  {
    id: 's1',
    name: 'Alex Johnson',
    email: 'student@campusconnect.edu',
    role: 'student',
    gradeLevel: 'Grade 12',
    section: 'STEM-A',
    avatar: 'https://picsum.photos/seed/s1/100/100'
  },
  {
    id: 't1',
    name: 'Dr. Sarah Smith',
    email: 'teacher@campusconnect.edu',
    role: 'teacher',
    avatar: 'https://picsum.photos/seed/t1/100/100'
  },
  {
    id: 'a1',
    name: 'Admin User',
    email: 'admin@campusconnect.edu',
    role: 'admin',
    avatar: 'https://picsum.photos/seed/a1/100/100'
  },
  {
    id: 'r1',
    name: 'Mr. Registrar',
    email: 'registrar@campusconnect.edu',
    role: 'registrar',
    avatar: 'https://picsum.photos/seed/r1/100/100'
  }
];

export const MOCK_GRADES = [
  { subject: 'Mathematics', score: 88, gradeLetter: 'B+', trend: 'up' },
  { subject: 'Advanced Physics', score: 72, gradeLetter: 'C', trend: 'down' },
  { subject: 'English Literature', score: 95, gradeLetter: 'A', trend: 'stable' },
  { subject: 'Computer Science', score: 92, gradeLetter: 'A-', trend: 'up' },
];

export const MOCK_SCHEDULE = [
  { time: '08:00 AM', subject: 'Mathematics', room: '302', teacher: 'Dr. Sarah Smith' },
  { time: '10:00 AM', subject: 'English', room: '101', teacher: 'Prof. Miller' },
  { time: '01:00 PM', subject: 'Computer Science', room: 'Lab 4', teacher: 'Engr. Davis' },
];

export const MOCK_CLASSES = [
  { id: 'c1', name: 'STEM 12-A', subject: 'Advanced Mathematics', students: 35, time: '08:00 AM - 10:00 AM' },
  { id: 'c2', name: 'STEM 12-B', subject: 'Physics', students: 32, time: '10:30 AM - 12:30 PM' },
];

export const MOCK_ADMIN_STATS = {
  totalStudents: 1240,
  activeClasses: 48,
  attendanceRate: 94.2,
  academicSession: '2024-2025'
};
