// src/types/index.ts

// ==========================================
// الأنواع الأساسية (Enums & Base Types)
// ==========================================

export type UserRole = 'chairman' | 'vp' | 'manager' | 'employee';
export type ApprovalStatus = 'pending_manager' | 'pending_chairman' | 'approved' | 'rejected';
export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'progress' | 'done';
export type MeetingType = 'online' | 'offline';
export type NotificationType = 'task' | 'meeting' | 'mention' | 'approval' | 'system' | 'chat';
export type ChatType = 'private' | 'department' | 'company';

// ==========================================
// واجهة المستخدم (UserProfile)
// تحتوي على جميع بيانات الموظف وصلاحياته
// ==========================================

export interface UserProfile {
  uid: string;                          // المعرف الفريد من Firebase Auth
  name: string;                         // الاسم الكامل
  email: string;                        // البريد الإلكتروني
  phone: string;                        // رقم الجوال
  department: string;                   // الإدارة الأساسية
  primaryRole: UserRole;                // الدور الأساسي (رئيس, نائب, مدير, موظف)
  additionalTitles: string[];           // الألقاب الإضافية (مستشار, سكرتير, إلخ)
  isActive: boolean;                    // هل الحساب مفعل؟
  avatarUrl?: string | null;            // رابط الصورة الشخصية
  hasCustomAdminAccess?: boolean;       // صلاحية استثنائية لدخول لوحة التحكم
  accessibleDepartments?: string[];     // الإدارات الإضافية التي يمكن للمستخدم الوصول إليها
  createdAt: number;                    // تاريخ إنشاء الحساب
  updatedAt: number;                    // تاريخ آخر تحديث
  lastLoginAt?: number;                 // تاريخ آخر تسجيل دخول
}

// ==========================================
// واجهة طلب الانضمام (JoinRequest)
// تستخدم لطلبات الموظفين الجدد
// ==========================================

export interface JoinRequest {
  id: string;                           // المعرف الفريد
  uid: string;                          // معرف المستخدم
  name: string;                         // الاسم الكامل
  email: string;                        // البريد الإلكتروني
  phone: string;                        // رقم الجوال
  department: string;                   // الإدارة المطلوبة
  status: ApprovalStatus;               // حالة الطلب
  createdAt: number;                    // تاريخ التقديم
  approvedBy?: string;                  // من قام بالموافقة
  approvedAt?: number;                  // تاريخ الموافقة
  rejectedBy?: string;                  // من قام بالرفض
  rejectedAt?: number;                  // تاريخ الرفض
  rejectionReason?: string;             // سبب الرفض
}

// ==========================================
// واجهة الإدارة (Department)
// ==========================================

export interface Department {
  id: string;                           // المعرف الفريد
  name: string;                         // اسم الإدارة
  managerUid: string | null;            // معرف مدير الإدارة
  parentDepartment?: string;            // الإدارة الأعلى (إن وجد)
  createdAt: number;                    // تاريخ الإنشاء
  updatedAt: number;                    // تاريخ آخر تحديث
}

// ==========================================
// واجهات الفروع والمناطق الجغرافية
// ==========================================

export interface Branch {
  id: string;                           // المعرف الفريد
  name: string;                         // اسم الفرع
  rooms: string[];                      // قائمة القاعات المتاحة
  address?: string;                     // العنوان
  phone?: string;                       // رقم هاتف الفرع
  managerUid?: string;                  // مدير الفرع
}

export interface Region {
  id: string;                           // المعرف الفريد
  region: string;                       // اسم المنطقة
  branches: Branch[];                   // قائمة الفروع في المنطقة
  createdAt: number;                    // تاريخ الإنشاء
  updatedAt: number;                    // تاريخ آخر تحديث
}

// ==========================================
// واجهة المرفق (Attachment)
// تستخدم للملفات المرفقة في المهام والاجتماعات
// ==========================================

export interface Attachment {
  name: string;                         // اسم الملف
  type: string;                         // نوع الملف (image, pdf, etc)
  url: string;                          // رابط الملف (Base64 أو URL من Firebase Storage)
  size?: number;                        // حجم الملف بالبايت
  createdAt: number;                    // تاريخ الرفع
  uploadedBy?: string;                  // من قام بالرفع
}

// ==========================================
// واجهة المهمة (Task)
// ==========================================

export interface Task {
  id: string;                           // المعرف الفريد
  title: string;                        // عنوان المهمة
  date: string;                         // التاريخ (YYYY-MM-DD)
  time: string;                         // الوقت (HH:MM)
  description: string;                  // وصف المهمة
  priority: Priority;                   // الأولوية
  status: TaskStatus;                   // الحالة
  department: string;                   // الإدارة المعنية
  createdByUid: string;                 // من قام بإنشاء المهمة
  assigneesUids: string[];              // قائمة المعرفات للمسؤولين عن التنفيذ
  mentionsUids: string[];               // قائمة المعرفات للأشخاص الممنشنين
  attachments: Attachment[];            // المرفقات
  isPublic: boolean;                    // هل المهمة عامة أم خاصة
  createdAt: number;                    // تاريخ الإنشاء
  updatedAt: number;                    // تاريخ آخر تحديث
  completedAt?: number;                 // تاريخ الإكمال
  deadline?: string;                    // موعد التسليم النهائي (اختياري)
  estimatedHours?: number;              // عدد الساعات المقدرة
  actualHours?: number;                 // عدد الساعات الفعلية
}

// ==========================================
// واجهة الاجتماع (Meeting)
// ==========================================

export interface Meeting {
  id: string;                           // المعرف الفريد
  title: string;                        // عنوان الاجتماع
  date: string;                         // التاريخ (YYYY-MM-DD)
  time: string;                         // الوقت (HH:MM)
  type: MeetingType;                    // نوع الاجتماع (عن بُعد / حضوري)
  platform?: string;                    // المنصة (Zoom, Meet, Teams, custom)
  customLink?: string;                  // رابط مخصص (للمنصات الأخرى)
  region?: string;                      // المنطقة (للاجتماعات الحضورية)
  branch?: string;                      // الفرع (للاجتماعات الحضورية)
  room?: string;                        // القاعة (للاجتماعات الحضورية)
  attendeesUids: string[];              // قائمة المعرفات للمدعوين
  mentionsUids: string[];               // قائمة المعرفات للأشخاص الممنشنين
  notes?: string;                       // ملاحظات أو أجندة الاجتماع
  createdByUid: string;                 // من قام بإنشاء الاجتماع
  isPublic: boolean;                    // هل الاجتماع عام أم خاص
  createdAt: number;                    // تاريخ الإنشاء
  updatedAt: number;                    // تاريخ آخر تحديث
  duration?: number;                    // مدة الاجتماع بالدقائق
  location?: string;                    // الموقع (نص حر للاجتماعات الحضورية)
  meetingLink?: string;                 // رابط الاجتماع (للاجتماعات عن بُعد)
}

// ==========================================
// واجهة الرسالة (Chat Message)
// ==========================================

export interface ChatMessage {
  id: string;                           // المعرف الفريد
  groupId: string;                      // معرف المجموعة (g_all, g_department, dm_xxx)
  fromUid: string;                      // معرف المرسل
  text: string;                         // نص الرسالة
  timestamp: number;                    // وقت الإرسال
  isEdited: boolean;                    // هل تم تعديلها؟
  isDeleted: boolean;                   // هل تم حذفها؟
  readBy: string[];                     // قائمة المعرفات لمن قرأ الرسالة
  attachments?: Attachment[];           // المرفقات
  replyToId?: string;                   // معرف الرسالة المراد الرد عليها
}

// ==========================================
// واجهة المجموعة (Chat Group)
// ==========================================

export interface ChatGroup {
  id: string;                           // المعرف الفريد
  name: string;                         // اسم المجموعة
  type: ChatType;                       // نوع المجموعة
  membersUids: string[];                // قائمة الأعضاء
  createdByUid: string;                 // من قام بإنشاء المجموعة
  createdAt: number;                    // تاريخ الإنشاء
  updatedAt: number;                    // تاريخ آخر تحديث
  lastMessage?: string;                 // آخر رسالة
  lastMessageTime?: number;             // وقت آخر رسالة
  avatarUrl?: string;                   // رابط صورة المجموعة
}

// ==========================================
// واجهة الإشعار (Notification)
// ==========================================

export interface Notification {
  id: string;                           // المعرف الفريد
  targetUid: string;                    // المستهدف بالإشعار
  title: string;                        // عنوان الإشعار
  message: string;                      // نص الإشعار
  type: NotificationType;               // نوع الإشعار
  relatedId?: string;                   // المعرف المرتبط (مهمة, اجتماع, إلخ)
  isRead: boolean;                      // هل تم قراءته؟
  createdAt: number;                    // تاريخ الإنشاء
  readAt?: number;                      // تاريخ القراءة
}

// ==========================================
// واجهة إعدادات المستخدم (User Settings)
// ==========================================

export interface UserSettings {
  uid: string;                          // معرف المستخدم
  theme: 'light' | 'dark';              // المظهر
  language: 'ar' | 'en';                // اللغة
  emailNotifications: boolean;          // إشعارات البريد الإلكتروني
  smsNotifications: boolean;             // إشعارات SMS
  pushNotifications: boolean;           // الإشعارات الفورية
  taskReminderMinutes: number;          // تذكير المهام قبل كم دقيقة
  meetingReminderMinutes: number;       // تذكير الاجتماعات قبل كم دقيقة
  workingHoursStart: string;            // بداية ساعات العمل
  workingHoursEnd: string;              // نهاية ساعات العمل
  weekendDays: number[];                // أيام العطلة (0=الأحد, 1=الإثنين...)
}

// ==========================================
// واجهة الإعدادات العامة للنظام (System Settings)
// ==========================================

export interface SystemSettings {
  id: string;                           // المعرف الثابت 'system'
  companyName: string;                  // اسم الشركة
  companyLogo: string;                  // شعار الشركة
  primaryColor: string;                 // اللون الأساسي
  secondaryColor: string;               // اللون الثانوي
  allowSelfRegistration: boolean;       // هل يسمح بالتسجيل الذاتي؟
  requireApproval: boolean;             // هل يتطلب طلب الانضمام موافقة؟
  maxFileSizeMB: number;                // الحد الأقصى لحجم الملفات بالميجابايت
  allowedFileTypes: string[];           // أنواع الملفات المسموحة
  defaultLanguage: 'ar' | 'en';         // اللغة الافتراضية
  timezone: string;                     // المنطقة الزمنية
  updatedAt: number;                    // تاريخ آخر تحديث
  updatedBy: string;                    // من قام بالتحديث
}

// ==========================================
// دوال مساعدة للتحقق من الصلاحيات
// ==========================================

/**
 * التحقق مما إذا كان المستخدم رئيس مجلس الإدارة
 */
export const isChairman = (user: UserProfile | null): boolean => {
  return user?.primaryRole === 'chairman';
};

/**
 * التحقق مما إذا كان المستخدم نائب رئيس
 */
export const isVP = (user: UserProfile | null): boolean => {
  return user?.primaryRole === 'vp';
};

/**
 * التحقق مما إذا كان المستخدم مدير إدارة
 */
export const isManager = (user: UserProfile | null): boolean => {
  return user?.primaryRole === 'manager';
};

/**
 * التحقق مما إذا كان المستخدم موظف عادي
 */
export const isEmployee = (user: UserProfile | null): boolean => {
  return user?.primaryRole === 'employee';
};

/**
 * التحقق مما إذا كان المستخدم من الإدارة العليا (رئيس أو نائب)
 */
export const isTopManagement = (user: UserProfile | null): boolean => {
  if (!user) return false;
  return user.primaryRole === 'chairman' || user.primaryRole === 'vp';
};

/**
 * التحقق من صلاحية الوصول إلى لوحة التحكم
 */
export const canAccessAdminPanel = (user: UserProfile | null): boolean => {
  if (!user) return false;
  if (user.primaryRole === 'chairman') return true;
  if (user.primaryRole === 'vp') return true;
  if (user.primaryRole === 'manager') return true;
  if (user.hasCustomAdminAccess === true) return true;
  return false;
};

/**
 * التحقق مما إذا كان المستخدم يمكنه إدارة إدارة معينة
 */
export const canManageDepartment = (user: UserProfile | null, departmentName: string): boolean => {
  if (!user) return false;
  if (isTopManagement(user)) return true;
  if (user.primaryRole === 'manager' && user.department === departmentName) return true;
  if (user.accessibleDepartments?.includes(departmentName)) return true;
  return false;
};

/**
 * التحقق مما إذا كان المستخدم يمكنه رؤية مهمة معينة
 */
export const canViewTask = (user: UserProfile | null, task: Task): boolean => {
  if (!user) return false;
  if (isTopManagement(user)) return true;
  if (task.isPublic && task.department === user.department) return true;
  if (task.assigneesUids?.includes(user.uid)) return true;
  if (task.mentionsUids?.includes(user.uid)) return true;
  if (task.createdByUid === user.uid) return true;
  return false;
};

/**
 * التحقق مما إذا كان المستخدم يمكنه تعديل مهمة معينة
 */
export const canEditTask = (user: UserProfile | null, task: Task): boolean => {
  if (!user) return false;
  if (isTopManagement(user)) return true;
  if (task.createdByUid === user.uid) return true;
  if (task.assigneesUids?.includes(user.uid) && task.status !== 'done') return true;
  return false;
};

/**
 * التحقق مما إذا كان المستخدم يمكنه رؤية اجتماع معين
 */
export const canViewMeeting = (user: UserProfile | null, meeting: Meeting): boolean => {
  if (!user) return false;
  if (isTopManagement(user)) return true;
  if (meeting.isPublic) return true;
  if (meeting.attendeesUids?.includes(user.uid)) return true;
  if (meeting.mentionsUids?.includes(user.uid)) return true;
  if (meeting.createdByUid === user.uid) return true;
  return false;
};

/**
 * التحقق مما إذا كان المستخدم يمكنه تعديل اجتماع معين
 */
export const canEditMeeting = (user: UserProfile | null, meeting: Meeting): boolean => {
  if (!user) return false;
  if (isTopManagement(user)) return true;
  if (meeting.createdByUid === user.uid) return true;
  return false;
};

// ==========================================
// الثوابت العالمية
// ==========================================

/**
 * قائمة الإدارات في الشركة
 */
export const DEPARTMENTS_LIST = [
  'التسويق',
  'المالية والتدقيق',
  'الموارد البشرية',
  'التكنولوجيا',
  'العلاقات العامة',
  'الإدارة العليا'
] as const;

/**
 * الأولويات مع ألوانها وتسمياتها
 */
export const PRIORITIES: Record<Priority, { label: string; color: string }> = {
  high: { label: 'عالية', color: '#EF4444' },
  medium: { label: 'متوسطة', color: '#F59E0B' },
  low: { label: 'منخفضة', color: '#22C55E' }
};

/**
 * حالات المهام مع ألوانها وتسمياتها
 */
export const TASK_STATUSES: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: 'لم تبدأ', color: '#6B7280' },
  progress: { label: 'جارية', color: '#3B82F6' },
  done: { label: 'مكتملة', color: '#22C55E' }
};

/**
 * منصات الاجتماعات الافتراضية
 */
export const MEETING_PLATFORMS: Record<string, { name: string; link: string }> = {
  zoom: { name: 'Zoom', link: 'https://zoom.us/join' },
  meet: { name: 'Google Meet', link: 'https://meet.google.com' },
  teams: { name: 'Microsoft Teams', link: 'https://teams.microsoft.com/l/meetup-join' },
  webex: { name: 'Cisco Webex', link: 'https://webex.com/join' },
  custom: { name: 'رابط مخصص', link: '' }
};

/**
 * أسماء الأشهر بالعربية
 */
export const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

/**
 * أسماء أيام الأسبوع بالعربية
 */
export const DAYS_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

/**
 * وظائف مساعدة للتنسيق
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return `${date.getDate()} ${MONTHS_AR[date.getMonth()]} ${date.getFullYear()}`;
};

export const formatTime = (timestamp: number): string => {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ساعة`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} يوم`;
  return new Date(timestamp).toLocaleDateString('ar-SA');
};

/**
 * إنشاء معرف فريد
 */
export const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * التحقق من صحة البريد الإلكتروني
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * التحقق من صحة رقم الجوال السعودي
 */
export const isValidSaudiPhone = (phone: string): boolean => {
  const phoneRegex = /^(05|5)(0|1|2|3|4|5|6|7|8|9)\d{7}$/;
  return phoneRegex.test(phone);
};