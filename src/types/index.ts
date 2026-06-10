// ==========================================
// ملف تعريفات الأنواع (TypeScript Definitions)
// هذا الملف هو الأساس الذي يمنع الأخطاء البرمجية
// ==========================================

// 1. أنواع الصلاحيات (الأدوار) المطابقة لنظامك
export type Role = 'chairman' | 'vp' | 'manager' | 'employee';

// 2. نوع هيكل المستخدم (UserProfile)
export interface UserProfile {
  uid: string;                 // معرف فايربيز الفريد
  name: string;                // الاسم الكامل
  email: string;               // البريد الإلكتروني
  phone: string;               // رقم الجوال
  department: string;          // الإدارة (التسويق، المالية، إلخ)
  primaryRole: Role;           // الصلاحية الأساسية (رئيس، مدير، موظف)
  additionalTitles: string[];  // الألقاب الإضافية (مستشار، سكرتير، إلخ)
  isActive: boolean;           // هل الحساب مفعل أم قيد المراجعة؟
  avatarUrl?: string | null;   // رابط الصورة الشخصية (إن وجدت)
}

// 3. نوع طلبات الانضمام (Approvals)
export type ApprovalStatus = 'pm' | 'pc' | 'ap' | 'rj'; // pm: بانتظار المدير, pc: بانتظار الرئيس, ap: موافقة, rj: رفض
export interface JoinRequest {
  id: string;
  uid: string;
  department: string;
  status: ApprovalStatus;
  timestamp: number;
}

// 4. هيكل الإدارات والفروع (Departments & Branches)
export interface Department {
  id: string;
  name: string;
  managerUid: string | null;
}

export interface Room {
  name: string;
}

export interface BranchInfo {
  id: string;
  name: string;
  rooms: string[];
}

export interface Region {
  id: string;
  region: string;
  branches: BranchInfo[];
}

// 5. أنواع المهام (Tasks) المطابقة لتفاصيل كودك الأصلي
export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'progress' | 'done';

export interface TaskFile {
  name: string;
  type: string;
  url: string; // رابط الملف بعد رفعه لـ Firebase Storage
}

export interface Task {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  department: string;
  createdByUid: string;
  assigneesUids: string[]; // مصفوفة بمعرفات المسؤولين عن المهمة
  mentionsUids: string[];  // مصفوفة بمعرفات الأشخاص الذين تم عمل منشن (@) لهم
  files: TaskFile[];       // المرفقات
  createdAt: number;
}

// 6. أنواع الاجتماعات (Meetings)
export type MeetingType = 'online' | 'offline';

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  type: MeetingType;
  // بيانات الأونلاين
  platform?: string;       // Zoom, Meet, Teams, إلخ
  customLink?: string;
  // بيانات الحضوري
  region?: string;
  branch?: string;
  room?: string;
  // بيانات عامة للاجتماع
  attendeesUids: string[]; // المشاركون
  mentionsUids: string[];  // المنشن
  notes?: string;          // الملاحظات
  createdByUid: string;
  createdAt: number;
}

// 7. المحادثات والرسائل (Chat)
export interface ChatMessage {
  id: string;
  groupId: string;         // معرف الإدارة أو معرف الغرفة الخاصة (dm_...)
  fromUid: string;         // من أرسل الرسالة
  text: string;            // نص الرسالة
  timestamp: number;       // وقت الإرسال
  isEdited: boolean;       // هل تم تعديلها؟
}

// 8. الإشعارات (Notifications)
export interface Notification {
  id: string;
  targetUid: string;       // لمن موجه الإشعار
  text: string;            // نص الإشعار (مثال: تم تعيينك في مهمة كذا)
  isRead: boolean;         // هل تمت قراءته؟
  timestamp: number;
}