// ==========================================
// ملف تعريفات الأنواع (TypeScript Definitions)
// مطابق 100% لهيكل البيانات في كود الـ HTML الأصلي + الميزات الجديدة
// ==========================================

// 1. الصلاحيات (Roles)
export type Role = 'chairman' | 'vp' | 'manager' | 'employee';

// 2. المستخدم (يعادل مصفوفة 'u' في كودك الأصلي)
export interface UserProfile {
  uid: string;                 // id
  name: string;                // name
  email: string;               // email
  phone: string;               // ph
  department: string;          // dp (الإدارة الأساسية)
  primaryRole: Role;           // rl (الدور التقني)
  additionalTitles: string[];  // الألقاب الإضافية (مثل: مستشار رئيس مجلس الإدارة)
  isActive: boolean;           // ok (هل الحساب مفعل أم قيد المراجعة)
  avatarUrl?: string | null;   // av (الصورة الشخصية)
  
  // -- الإضافات الجديدة الخاصة بالصلاحيات --
  hasCustomAdminAccess?: boolean;   // صلاحية استثنائية لفتح لوحة التحكم
  accessibleDepartments?: string[]; // إدارات متعددة يمكن للمستشار/المدير إدارتها
}

// 3. طلبات الانضمام (يعادل مصفوفة 'a' في كودك الأصلي)
export type ApprovalStatus = 'pm' | 'pc' | 'ap' | 'rj'; 
export interface JoinRequest {
  id: string;
  uid: string;
  department: string;
  status: ApprovalStatus;
  timestamp: number;
}

// 4. الإدارات (يعادل مصفوفة 'd' في كودك الأصلي)
export interface Department {
  id: string;
  name: string;              // nm
  managerUid: string | null; // mg
}

// 5. الفروع (يعادل مصفوفة 'b' في كودك الأصلي)
export interface BranchInfo {
  id: string;
  name: string;    // nm
  rooms: string[]; // rm
}

export interface Region {
  id: string;
  region: string;         // rg
  branches: BranchInfo[]; // br
}

// 6. المهام (يعادل مصفوفة 't' في كودك الأصلي)
export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'progress' | 'done';

export interface TaskFile {
  name: string; // nm
  type: string; // tp
  url: string;  // d (الرابط بعد الرفع)
}

export interface Task {
  id: string;
  title: string;           // ti
  date: string;            // dt
  time: string;            // tm
  description: string;     // ds
  priority: Priority;      // pr
  status: TaskStatus;      // st
  department: string;      // dp
  createdByUid: string;    // cr
  assigneesUids: string[]; // as (المسؤولون)
  mentionsUids: string[];  // mn (المنشنات @)
  files: TaskFile[];       // fl (المرفقات)
  createdAt: number;
  
  // -- الخصوصية --
  isPublic: boolean;       // هل المهمة عامة للإدارة أم خاصة بالمنشن والمسؤولين فقط؟
}

// 7. الاجتماعات (يعادل مصفوفة 'm' في كودك الأصلي)
export type MeetingType = 'online' | 'offline';

export interface Meeting {
  id: string;
  title: string;           // ti
  date: string;            // dt
  time: string;            // tm
  type: MeetingType;       // tp
  platform?: string;       // pl (المنصة: zoom, meet...)
  customLink?: string;     // cp (الرابط المخصص)
  region?: string;         // rg (المنطقة)
  branch?: string;         // br (الفرع)
  room?: string;           // rm (القاعة)
  attendeesUids: string[]; // at (المدعوون)
  mentionsUids: string[];  // mn (المنشنات @)
  notes?: string;          // nt (الأجندة/الملاحظات)
  createdByUid: string;    // cr (المنشئ)
  createdAt: number;
  
  // -- الخصوصية --
  isPublic: boolean;       // هل الاجتماع عام للإدارة أم خاص بالمدعوين فقط؟
}

// 8. المحادثات والرسائل (يعادل مصفوفة 'g' في كودك الأصلي)
export interface ChatMessage {
  id: string;
  groupId: string;         // gi (معرف الإدارة أو الـ dm)
  fromUid: string;         // fi (المرسل)
  text: string;            // tx (نص الرسالة)
  timestamp: number;       // ts (الوقت)
  isEdited: boolean;       // ed (معدلة؟)
}

// 9. الإشعارات (يعادل مصفوفة 'n' في كودك الأصلي)
export interface Notification {
  id: string;
  targetUid: string;       // u (المستهدف)
  text: string;            // t (نص الإشعار)
  isRead: boolean;         // r (مقروءة؟)
  timestamp: number;       // ts (الوقت)
}