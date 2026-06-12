// src/utils/helpers.ts

import { format, formatDistance, formatRelative, differenceInDays, isToday, isTomorrow, isYesterday } from 'date-fns';
import { arSA } from 'date-fns/locale';

// ==========================================
// دوال تنسيق التواريخ
// ==========================================

/**
 * تنسيق التاريخ
 */
export const formatDate = (date: Date | number | string, formatStr: string = 'dd MMMM yyyy'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  return format(dateObj, formatStr, { locale: arSA });
};

/**
 * تنسيق الوقت
 */
export const formatTime = (date: Date | number | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  return format(dateObj, 'hh:mm a', { locale: arSA });
};

/**
 * تنسيق التاريخ والوقت
 */
export const formatDateTime = (date: Date | number | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  return format(dateObj, 'dd MMMM yyyy - hh:mm a', { locale: arSA });
};

/**
 * المسافة الزمنية النسبية
 */
export const formatRelativeTime = (date: Date | number | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  return formatDistance(dateObj, new Date(), { addSuffix: true, locale: arSA });
};

/**
 * التحقق من أن التاريخ اليوم
 */
export const isDateToday = (date: string): boolean => {
  return isToday(new Date(date));
};

/**
 * التحقق من أن التاريخ غداً
 */
export const isDateTomorrow = (date: string): boolean => {
  return isTomorrow(new Date(date));
};

/**
 * التحقق من أن التاريخ أمس
 */
export const isDateYesterday = (date: string): boolean => {
  return isYesterday(new Date(date));
};

/**
 * حساب عدد الأيام المتبقية
 */
export const getDaysRemaining = (date: string): number => {
  const target = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return differenceInDays(target, today);
};

// ==========================================
// دوال تنسيق الأرقام
// ==========================================

/**
 * تنسيق الأرقام
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('ar-SA').format(num);
};

/**
 * تنسيق العملة
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount);
};

/**
 * تنسيق النسبة المئوية
 */
export const formatPercentage = (value: number, total: number): string => {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
};

// ==========================================
// دوال التحقق من صحة البيانات
// ==========================================

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

/**
 * التحقق من صحة رقم الجوال الدولي
 */
export const isValidInternationalPhone = (phone: string): boolean => {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
};

/**
 * تنسيق رقم الجوال السعودي
 */
export const formatSaudiPhone = (phone: string): string => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('966')) {
    cleaned = '0' + cleaned.slice(3);
  }
  if (!cleaned.startsWith('05')) {
    cleaned = '05' + cleaned;
  }
  return cleaned;
};

// ==========================================
// دوال معالجة النصوص
// ==========================================

/**
 * اقتطاع النص
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * تحويل النص إلى slugs
 */
export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

/**
 * استخراج الحروف الأولى
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

/**
 * تلوين النص حسب الأولوية
 */
export const getPriorityColor = (priority: 'high' | 'medium' | 'low'): string => {
  const colors = {
    high: '#EF4444',
    medium: '#F59E0B',
    low: '#22C55E'
  };
  return colors[priority];
};

/**
 * تلوين النص حسب الحالة
 */
export const getStatusColor = (status: 'todo' | 'progress' | 'done'): string => {
  const colors = {
    todo: '#6B7280',
    progress: '#3B82F6',
    done: '#22C55E'
  };
  return colors[status];
};

// ==========================================
// دوال التخزين المحلي
// ==========================================

/**
 * حفظ البيانات في التخزين المحلي
 */
export const setLocalStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

/**
 * جلب البيانات من التخزين المحلي
 */
export const getLocalStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultValue;
  }
};

/**
 * حذف البيانات من التخزين المحلي
 */
export const removeLocalStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
};

// ==========================================
// دوال معالجة الملفات
// ==========================================

/**
 * تحويل الملف إلى Base64
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

/**
 * تحويل Base64 إلى Blob
 */
export const base64ToBlob = (base64: string, mimeType: string): Blob => {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

/**
 * تحميل ملف
 */
export const downloadFile = (url: string, filename: string): void => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * الحصول على أيقونة الملف
 */
export const getFileIcon = (fileType: string): string => {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType === 'application/pdf') return '📄';
  if (fileType.includes('word')) return '📝';
  if (fileType.includes('excel')) return '📊';
  if (fileType.includes('powerpoint')) return '📽️';
  if (fileType.includes('zip') || fileType.includes('rar')) return '🗜️';
  return '📁';
};

// ==========================================
// دوال متنوعة
// ==========================================

/**
 * إنشاء معرف فريد
 */
export const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * تأخير التنفيذ
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * نسخ النص إلى الحافظة
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
};

/**
 * مشاركة المحتوى
 */
export const shareContent = async (title: string, text: string, url?: string): Promise<boolean> => {
  try {
    await navigator.share({ title, text, url });
    return true;
  } catch (error) {
    console.error('Error sharing content:', error);
    return false;
  }
};

/**
 * الحصول على معلمات URL
 */
export const getQueryParams = (): Record<string, string> => {
  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(window.location.search);
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
};

/**
 * تحديث معلمات URL
 */
export const updateQueryParams = (params: Record<string, string | null>): void => {
  const url = new URL(window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    if (value === null) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  });
  window.history.pushState({}, '', url.toString());
};

/**
 * التحقق من اتصال الإنترنت
 */
export const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * الحصول على متصفح المستخدم
 */
export const getBrowserInfo = (): string => {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Unknown';
};

/**
 * الحصول على نظام التشغيل
 */
export const getOSInfo = (): string => {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'Mac';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Unknown';
};