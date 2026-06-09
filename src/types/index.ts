export type Role = 'chairman' | 'vp' | 'manager' | 'employee';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  primaryRole: Role;
  additionalTitles: string[];
  isActive: boolean;
}

export interface Task {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'progress' | 'done';
  department: string;
  createdBy: string;
  assignedTo: string[];
}