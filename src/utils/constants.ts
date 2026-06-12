// src/utils/constants.ts

// ==========================================
// ثوابت المستخدم والأدوار
// ==========================================

export const USER_ROLES = {
  CHAIRMAN: 'chairman',
  VP: 'vp',
  MANAGER: 'manager',
  EMPLOYEE: 'employee'
} as const;

export const USER_ROLES_LABELS: Record<string, string> = {
  [USER_ROLES.CHAIRMAN]: 'رئيس مجلس الإدارة',
  [USER_ROLES.VP]: 'نائب رئيس مجلس الإدارة',
  [USER_ROLES.MANAGER]: 'مدير إدارة',
  [USER_ROLES.EMPLOYEE]: 'موظف'
};

export const USER_ROLES_COLORS: Record<string, string> = {
  [USER_ROLES.CHAIRMAN]: '#8B1A1A',
  [USER_ROLES.VP]: '#1E3A6E',
  [USER_ROLES.MANAGER]: '#F59E0B',
  [USER_ROLES.EMPLOYEE]: '#6B7280'
};

// ==========================================
// ثوابت الأولويات
// ==========================================

export const PRIORITIES = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
} as const;

export const PRIORITIES_LABELS: Record<string, string> = {
  [PRIORITIES.HIGH]: 'عالية',
  [PRIORITIES.MEDIUM]: 'متوسطة',
  [PRIORITIES.LOW]: 'منخفضة'
};

export const PRIORITIES_COLORS: Record<string, string> = {
  [PRIORITIES.HIGH]: '#EF4444',
  [PRIORITIES.MEDIUM]: '#F59E0B',
  [PRIORITIES.LOW]: '#22C55E'
};

export const PRIORITIES_ICONS: Record<string, string> = {
  [PRIORITIES.HIGH]: '🔥',
  [PRIORITIES.MEDIUM]: '⚡',
  [PRIORITIES.LOW]: '✅'
};

// ==========================================
// ثوابت حالات المهام
// ==========================================

export const TASK_STATUS = {
  TODO: 'todo',
  PROGRESS: 'progress',
  DONE: 'done'
} as const;

export const TASK_STATUS_LABELS: Record<string, string> = {
  [TASK_STATUS.TODO]: 'لم تبدأ',
  [TASK_STATUS.PROGRESS]: 'قيد التنفيذ',
  [TASK_STATUS.DONE]: 'مكتملة'
};

export const TASK_STATUS_COLORS: Record<string, string> = {
  [TASK_STATUS.TODO]: '#6B7280',
  [TASK_STATUS.PROGRESS]: '#3B82F6',
  [TASK_STATUS.DONE]: '#22C55E'
};

export const TASK_STATUS_ICONS: Record<string, string> = {
  [TASK_STATUS.TODO]: '📋',
  [TASK_STATUS.PROGRESS]: '⚙️',
  [TASK_STATUS.DONE]: '✓'
};

// ==========================================
// ثوابت أنواع الاجتماعات
// ==========================================

export const MEETING_TYPES = {
  ONLINE: 'online',
  OFFLINE: 'offline'
} as const;

export const MEETING_TYPES_LABELS: Record<string, string> = {
  [MEETING_TYPES.ONLINE]: 'عن بُعد',
  [MEETING_TYPES.OFFLINE]: 'حضوري'
};

export const MEETING_PLATFORMS = {
  ZOOM: 'zoom',
  MEET: 'meet',
  TEAMS: 'teams',
  WEBEX: 'webex',
  CUSTOM: 'custom'
} as const;

export const MEETING_PLATFORMS_LABELS: Record<string, string> = {
  [MEETING_PLATFORMS.ZOOM]: 'Zoom',
  [MEETING_PLATFORMS.MEET]: 'Google Meet',
  [MEETING_PLATFORMS.TEAMS]: 'Microsoft Teams',
  [MEETING_PLATFORMS.WEBEX]: 'Cisco Webex',
  [MEETING_PLATFORMS.CUSTOM]: 'رابط مخصص'
};

// ==========================================
// ثوابت الإدارات
// ==========================================

export const DEPARTMENTS = {
  MARKETING: 'التسويق',
  FINANCE: 'المالية والتدقيق',
  HR: 'الموارد البشرية',
  TECH: 'التكنولوجيا',
  PR: 'العلاقات العامة',
  TOP_MANAGEMENT: 'الإدارة العليا'
} as const;

export const DEPARTMENTS_LIST = Object.values(DEPARTMENTS);

export const DEPARTMENTS_COLORS: Record<string, string> = {
  [DEPARTMENTS.MARKETING]: '#10B981',
  [DEPARTMENTS.FINANCE]: '#3B82F6',
  [DEPARTMENTS.HR]: '#8B5CF6',
  [DEPARTMENTS.TECH]: '#06B6D4',
  [DEPARTMENTS.PR]: '#F59E0B',
  [DEPARTMENTS.TOP_MANAGEMENT]: '#8B1A1A'
};

// ==========================================
// ثوابت أنواع الإشعارات
// ==========================================

export const NOTIFICATION_TYPES = {
  TASK: 'task',
  MEETING: 'meeting',
  CHAT: 'chat',
  APPROVAL: 'approval',
  SYSTEM: 'system',
  MENTION: 'mention'
} as const;

export const NOTIFICATION_TYPES_LABELS: Record<string, string> = {
  [NOTIFICATION_TYPES.TASK]: 'مهمة',
  [NOTIFICATION_TYPES.MEETING]: 'اجتماع',
  [NOTIFICATION_TYPES.CHAT]: 'محادثة',
  [NOTIFICATION_TYPES.APPROVAL]: 'موافقة',
  [NOTIFICATION_TYPES.SYSTEM]: 'نظام',
  [NOTIFICATION_TYPES.MENTION]: 'إشارة'
};

// ==========================================
// ثوابت التواريخ والأشهر
// ==========================================

export const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export const DAYS_SHORT_AR = ['أحد', 'إثن', 'ثلاث', 'أربع', 'خميس', 'جمع', 'سبت'];

// ==========================================
// ثوابت التطبيق
// ==========================================

export const APP_NAME = 'United Experts';
export const APP_NAME_AR = 'شركة UX - خبراء المتحدة';
export const APP_VERSION = '3.0.0';
export const APP_DESCRIPTION = 'نظام إدارة المهام والتقويم المتكامل';

// ==========================================
// ثوابت واجهة المستخدم
// ==========================================

export const SIDEBAR_WIDTH = 260;
export const SIDEBAR_COLLAPSED_WIDTH = 80;
export const HEADER_HEIGHT = 56;

export const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024,
  DESKTOP: 1280,
  WIDE: 1536
};

// ==========================================
// ثوابت التخزين (Storage)
// ==========================================

export const STORAGE_KEYS = {
  THEME: 'ux4_th',
  SIDEBAR_COLLAPSED: 'sidebarCollapsed',
  AUTH_TOKEN: 'ux4_token',
  USER_DATA: 'ux4_user',
  LANGUAGE: 'ux4_lang',
  LAST_VISITED: 'ux4_last_visited',
  NOTIFICATIONS_SEEN: 'ux4_notifications_seen'
};

// ==========================================
// ثوابت Firebase
// ==========================================

export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  TASKS: 'tasks',
  MEETINGS: 'meetings',
  MESSAGES: 'messages',
  NOTIFICATIONS: 'notifications',
  DEPARTMENTS: 'departments',
  REGIONS: 'regions',
  JOIN_REQUESTS: 'joinRequests',
  USER_SETTINGS: 'userSettings',
  SYSTEM_SETTINGS: 'systemSettings',
  EMAILS: 'emails',
  CHAT_GROUPS: 'chatGroups'
} as const;

// ==========================================
// ثوابت الأخطاء
// ==========================================

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'حدث خطأ في الاتصال بالشبكة',
  UNAUTHORIZED: 'غير مصرح بالدخول',
  NOT_FOUND: 'المورد غير موجود',
  SERVER_ERROR: 'حدث خطأ في الخادم',
  VALIDATION_ERROR: 'بيانات غير صالحة',
  DUPLICATE_ENTRY: 'هذا العنصر موجود بالفعل',
  INVALID_CREDENTIALS: 'بيانات الدخول غير صحيحة',
  EMAIL_IN_USE: 'البريد الإلكتروني مستخدم بالفعل',
  WEAK_PASSWORD: 'كلمة المرور ضعيفة جداً',
  USER_NOT_FOUND: 'المستخدم غير موجود',
  TOO_MANY_REQUESTS: 'تم تجاوز عدد المحاولات، حاول لاحقاً'
};

// ==========================================
// ثوابت الرسائل الناجحة
// ==========================================

export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'تم تسجيل الدخول بنجاح',
  LOGOUT_SUCCESS: 'تم تسجيل الخروج بنجاح',
  REGISTER_SUCCESS: 'تم إنشاء الحساب بنجاح',
  TASK_CREATED: 'تم إنشاء المهمة بنجاح',
  TASK_UPDATED: 'تم تحديث المهمة بنجاح',
  TASK_DELETED: 'تم حذف المهمة بنجاح',
  MEETING_CREATED: 'تم إنشاء الاجتماع بنجاح',
  MEETING_UPDATED: 'تم تحديث الاجتماع بنجاح',
  MEETING_DELETED: 'تم حذف الاجتماع بنجاح',
  MESSAGE_SENT: 'تم إرسال الرسالة بنجاح',
  PROFILE_UPDATED: 'تم تحديث الملف الشخصي بنجاح',
  PASSWORD_CHANGED: 'تم تغيير كلمة المرور بنجاح'
};

// ==========================================
// ثوابت الإعدادات الافتراضية
// ==========================================

export const DEFAULT_SETTINGS = {
  THEME: 'dark' as const,
  LANGUAGE: 'ar' as const,
  EMAIL_NOTIFICATIONS: true,
  PUSH_NOTIFICATIONS: true,
  TASK_REMINDER_MINUTES: 30,
  MEETING_REMINDER_MINUTES: 15,
  WORKING_HOURS_START: '09:00',
  WORKING_HOURS_END: '17:00',
  WEEKEND_DAYS: [5, 6] // الجمعة والسبت
};

// ==========================================
// ثوابت الملفات
// ==========================================

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 ميجابايت
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain'
];

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 ميجابايت

// ==========================================
// ثوابت الروابط
// ==========================================

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  CALENDAR: '/calendar',
  TASKS: '/tasks',
  MEETINGS: '/meetings',
  CHAT: '/chat',
  NOTIFICATIONS: '/notifications',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  ADMIN: '/admin',
  USERS: '/users',
  DEPARTMENTS: '/departments',
  REPORTS: '/reports',
  HELP: '/help',
  PENDING: '/pending'
} as const;

// ==========================================
// ثوابت API
// ==========================================

export const API_ENDPOINTS = {
  USERS: '/api/users',
  TASKS: '/api/tasks',
  MEETINGS: '/api/meetings',
  MESSAGES: '/api/messages',
  NOTIFICATIONS: '/api/notifications',
  DEPARTMENTS: '/api/departments',
  REGIONS: '/api/regions',
  AUTH: '/api/auth',
  UPLOAD: '/api/upload'
} as const;

// ==========================================
// ثوابت الوقت
// ==========================================

export const TIME_CONSTANTS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000
};

// ==========================================
// ثوابت الإيموجي
// ==========================================

export const EMOJIS = {
  TASK: '📋',
  MEETING: '📅',
  CHAT: '💬',
  NOTIFICATION: '🔔',
  USER: '👤',
  DEPARTMENT: '🏢',
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
  LOADING: '⏳',
  SEARCH: '🔍',
  FILTER: '🔽',
  SORT: '📊',
  EDIT: '✏️',
  DELETE: '🗑️',
  ADD: '➕',
  SAVE: '💾',
  CANCEL: '✖️',
  CLOSE: '🔚',
  BACK: '🔙',
  FORWARD: '🔜',
  UP: '🔼',
  DOWN: '🔽',
  LEFT: '◀️',
  RIGHT: '▶️'
};