import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FaSave, FaMoon, FaSun, FaGlobe, FaBell, FaLanguage, FaClock, FaSpinner } from 'react-icons/fa';

// ==========================================
// ملف الترجمة الكامل للغتين العربية والإنجليزية
// ==========================================

const translations = {
  ar: {
    settings: 'الإعدادات',
    customizeExperience: 'تخصيص تجربتك في النظام',
    appearance: 'المظهر',
    dark: 'داكن',
    light: 'فاتح',
    language: 'اللغة',
    arabic: 'العربية',
    english: 'English',
    notifications: 'الإشعارات',
    emailNotifications: 'إشعارات البريد الإلكتروني',
    pushNotifications: 'الإشعارات الفورية',
    taskReminder: 'تذكير المهام قبل',
    meetingReminder: 'تذكير الاجتماعات قبل',
    minutes: 'دقائق',
    hour: 'ساعة',
    hours: 'ساعات',
    day: 'يوم',
    workingHours: 'ساعات العمل',
    start: 'بداية',
    end: 'نهاية',
    saveSettings: 'حفظ الإعدادات',
    saving: 'جاري الحفظ...',
    saveSuccess: 'تم حفظ الإعدادات بنجاح',
    saveError: 'حدث خطأ في حفظ الإعدادات',
    loading: 'جاري التحميل...',
    languageChanged: 'تم تغيير اللغة، سيتم تحديث الصفحة',
    minutes_5: '5 دقائق',
    minutes_15: '15 دقيقة',
    minutes_30: '30 دقيقة',
    minutes_60: 'ساعة واحدة',
    minutes_120: 'ساعتين',
    minutes_1440: 'يوم كامل'
  },
  en: {
    settings: 'Settings',
    customizeExperience: 'Customize your experience',
    appearance: 'Appearance',
    dark: 'Dark',
    light: 'Light',
    language: 'Language',
    arabic: 'العربية',
    english: 'English',
    notifications: 'Notifications',
    emailNotifications: 'Email Notifications',
    pushNotifications: 'Push Notifications',
    taskReminder: 'Task Reminder',
    meetingReminder: 'Meeting Reminder',
    minutes: 'minutes',
    hour: 'hour',
    hours: 'hours',
    day: 'day',
    workingHours: 'Working Hours',
    start: 'Start',
    end: 'End',
    saveSettings: 'Save Settings',
    saving: 'Saving...',
    saveSuccess: 'Settings saved successfully',
    saveError: 'Error saving settings',
    loading: 'Loading...',
    languageChanged: 'Language changed, page will reload',
    minutes_5: '5 minutes',
    minutes_15: '15 minutes',
    minutes_30: '30 minutes',
    minutes_60: '1 hour',
    minutes_120: '2 hours',
    minutes_1440: '1 day'
  }
};

// ==========================================
// صفحة الإعدادات الرئيسية
// ==========================================

export const SettingsPage: React.FC = () => {
  const { userSettings, updateUserSettings } = useAuth();
  const [settings, setSettings] = useState(userSettings);
  const [saving, setSaving] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<'ar' | 'en'>('ar');

  // ==========================================
  // تطبيق اللغة على الصفحة
  // ==========================================

  const applyLanguage = (lang: 'ar' | 'en') => {
    setCurrentLanguage(lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('app_language', lang);
  };

  // ==========================================
  // تحميل اللغة المحفوظة عند بدء التشغيل
  // ==========================================

  useEffect(() => {
    const savedLang = localStorage.getItem('app_language') as 'ar' | 'en' || 'ar';
    setCurrentLanguage(savedLang);
    document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = savedLang;
  }, []);

  // ==========================================
  // الحصول على الترجمة حسب اللغة الحالية
  // ==========================================

  const t = translations[currentLanguage];

  // ==========================================
  // تغيير اللغة (تعمل فوراً)
  // ==========================================

  const handleLanguageChange = async (lang: 'ar' | 'en') => {
    if (settings) {
      const newSettings = { ...settings, language: lang };
      setSettings(newSettings);
      if (updateUserSettings) {
        await updateUserSettings(newSettings);
      }
      applyLanguage(lang);
      toast.success(t.languageChanged);
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  // ==========================================
  // حفظ جميع الإعدادات
  // ==========================================

  const handleSave = async () => {
    if (!settings || !updateUserSettings) {
      return;
    }
    setSaving(true);
    try {
      await updateUserSettings(settings);
      toast.success(t.saveSuccess);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(t.saveError);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // عرض شاشة التحميل إذا لم تكن الإعدادات جاهزة
  // ==========================================

  if (!settings) {
    return (
      <div className="p-6 text-center">
        <div className="spinner-sm mx-auto mb-3"></div>
        <p className="text-gray-500">{t.loading}</p>
      </div>
    );
  }

  // ==========================================
  // الواجهة الرئيسية للصفحة
  // ==========================================

  return (
    <div className="p-6 max-w-2xl mx-auto animate-fadeIn">
      
      {/* عنوان الصفحة */}
      <h1 className="text-2xl font-bold mb-2">{t.settings}</h1>
      <p className="text-gray-500 mb-6">{t.customizeExperience}</p>
      
      {/* بطاقة الإعدادات الرئيسية */}
      <div className="card space-y-6">
        
        {/* ==========================================
             قسم المظهر (الثيم)
        ========================================== */}
        
        <div>
          <label className="block text-sm font-medium mb-2">{t.appearance}</label>
          <div className="flex gap-3">
            <button
              onClick={() => setSettings({ ...settings, theme: 'dark' })}
              className={`flex-1 p-3 rounded-lg border transition-all ${settings.theme === 'dark' ? 'border-brand bg-brand/10' : 'border-bd'}`}
            >
              <FaMoon className="mx-auto mb-1" size={20} />
              <span className="text-sm">{t.dark}</span>
            </button>
            <button
              onClick={() => setSettings({ ...settings, theme: 'light' })}
              className={`flex-1 p-3 rounded-lg border transition-all ${settings.theme === 'light' ? 'border-brand bg-brand/10' : 'border-bd'}`}
            >
              <FaSun className="mx-auto mb-1" size={20} />
              <span className="text-sm">{t.light}</span>
            </button>
          </div>
        </div>
        
        {/* ==========================================
             قسم اللغة (تعمل فوراً)
        ========================================== */}
        
        <div>
          <label className="block text-sm font-medium mb-2">{t.language}</label>
          <div className="flex gap-3">
            <button
              onClick={() => handleLanguageChange('ar')}
              className={`flex-1 p-3 rounded-lg border transition-all ${currentLanguage === 'ar' ? 'border-brand bg-brand/10' : 'border-bd'}`}
            >
              <FaLanguage className="mx-auto mb-1" size={20} />
              <span className="text-sm">{t.arabic}</span>
            </button>
            <button
              onClick={() => handleLanguageChange('en')}
              className={`flex-1 p-3 rounded-lg border transition-all ${currentLanguage === 'en' ? 'border-brand bg-brand/10' : 'border-bd'}`}
            >
              <FaLanguage className="mx-auto mb-1" size={20} />
              <span className="text-sm">{t.english}</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {currentLanguage === 'ar' ? 'سيتم تغيير واجهة النظام إلى اللغة الإنجليزية' : 'The interface will change to English'}
          </p>
        </div>
        
        {/* ==========================================
             قسم الإشعارات
        ========================================== */}
        
        <div>
          <label className="block text-sm font-medium mb-2">{t.notifications}</label>
          <div className="space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">{t.emailNotifications}</span>
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                className="w-4 h-4 rounded border-gray-600 text-brand focus:ring-brand focus:ring-offset-0"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">{t.pushNotifications}</span>
              <input
                type="checkbox"
                checked={settings.pushNotifications}
                onChange={(e) => setSettings({ ...settings, pushNotifications: e.target.checked })}
                className="w-4 h-4 rounded border-gray-600 text-brand focus:ring-brand focus:ring-offset-0"
              />
            </label>
          </div>
        </div>
        
        {/* ==========================================
             قسم التذكيرات
        ========================================== */}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t.taskReminder}</label>
            <select
              value={settings.taskReminderMinutes}
              onChange={(e) => setSettings({ ...settings, taskReminderMinutes: Number(e.target.value) })}
              className="input"
            >
              <option value={5}>{t.minutes_5}</option>
              <option value={15}>{t.minutes_15}</option>
              <option value={30}>{t.minutes_30}</option>
              <option value={60}>{t.minutes_60}</option>
              <option value={120}>{t.minutes_120}</option>
              <option value={1440}>{t.minutes_1440}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t.meetingReminder}</label>
            <select
              value={settings.meetingReminderMinutes}
              onChange={(e) => setSettings({ ...settings, meetingReminderMinutes: Number(e.target.value) })}
              className="input"
            >
              <option value={5}>{t.minutes_5}</option>
              <option value={15}>{t.minutes_15}</option>
              <option value={30}>{t.minutes_30}</option>
              <option value={60}>{t.minutes_60}</option>
            </select>
          </div>
        </div>
        
        {/* ==========================================
             قسم ساعات العمل
        ========================================== */}
        
        <div>
          <label className="block text-sm font-medium mb-2">{t.workingHours}</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t.start}</label>
              <input
                type="time"
                value={settings.workingHoursStart}
                onChange={(e) => setSettings({ ...settings, workingHoursStart: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t.end}</label>
              <input
                type="time"
                value={settings.workingHoursEnd}
                onChange={(e) => setSettings({ ...settings, workingHoursEnd: e.target.value })}
                className="input"
              />
            </div>
          </div>
        </div>
        
        {/* ==========================================
             زر حفظ الإعدادات
        ========================================== */}
        
        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full"
          >
            {saving ? (
              <>
                <FaSpinner className="animate-spin ml-2" />
                {t.saving}
              </>
            ) : (
              <>
                <FaSave className="ml-2" />
                {t.saveSettings}
              </>
            )}
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default SettingsPage;