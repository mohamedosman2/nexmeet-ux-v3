// src/pages/ProfilePage.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage, uploadFile, deleteFile } from '../config/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import toast from 'react-hot-toast';
import { 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaBuilding, 
  FaCalendarAlt,
  FaSave,
  FaKey,
  FaCamera,
  FaTrash,
  FaCheckCircle,
  FaShieldAlt,
  FaBell,
  FaMoon,
  FaSun,
  FaLanguage,
  FaGlobe,
  FaClock,
  FaChartLine,
  FaFileAlt,
  FaUsers,
  FaTasks,
  FaVideo,
  FaComments
} from 'react-icons/fa';

// ==========================================
// صفحة الملف الشخصي
// ==========================================

export const ProfilePage: React.FC = () => {
  const { currentUser, userProfile, refreshUserProfile, updateUserProfile, userSettings, updateUserSettings } = useAuth();
  
  // حالات الملف الشخصي
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  
  // حالات تغيير كلمة المرور
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  // حالات الإعدادات
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [taskReminderMinutes, setTaskReminderMinutes] = useState(30);
  const [meetingReminderMinutes, setMeetingReminderMinutes] = useState(15);
  
  // حالات الإحصائيات
  const [stats, setStats] = useState({
    tasksCreated: 0,
    tasksCompleted: 0,
    meetingsAttended: 0,
    messagesSent: 0
  });
  
  // Refs
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  // ==========================================
  // تحميل بيانات المستخدم
  // ==========================================
  
  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setPhone(userProfile.phone || '');
      setDepartment(userProfile.department || '');
      setAvatarUrl(userProfile.avatarUrl || null);
    }
  }, [userProfile]);
  
  useEffect(() => {
    if (userSettings) {
      setTheme(userSettings.theme || 'dark');
      setLanguage(userSettings.language || 'ar');
      setEmailNotifications(userSettings.emailNotifications !== false);
      setPushNotifications(userSettings.pushNotifications !== false);
      setTaskReminderMinutes(userSettings.taskReminderMinutes || 30);
      setMeetingReminderMinutes(userSettings.meetingReminderMinutes || 15);
    }
  }, [userSettings]);
  
  // ==========================================
  // جلب الإحصائيات
  // ==========================================
  
  useEffect(() => {
    if (!currentUser) return;
    
    const fetchStats = async () => {
      try {
        // يمكن جلب الإحصائيات من Firebase
        // هذا مثال بسيط، يمكن توسيعه لاحقاً
        setStats({
          tasksCreated: 0,
          tasksCompleted: 0,
          meetingsAttended: 0,
          messagesSent: 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    
    fetchStats();
  }, [currentUser]);
  
  // ==========================================
  // تحديث الصورة الشخصية
  // ==========================================
  
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
      return;
    }
    
    setUploadingAvatar(true);
    
    try {
      // حذف الصورة القديمة إذا وجدت
      if (avatarUrl) {
        try {
          await deleteFile(avatarUrl);
        } catch (e) {
          console.warn('Could not delete old avatar:', e);
        }
      }
      
      // رفع الصورة الجديدة
      const path = `avatars/${currentUser?.uid}/${Date.now()}.jpg`;
      const downloadURL = await uploadFile(path, file);
      
      // تحديث في Firestore
      await updateDoc(doc(db, 'users', currentUser!.uid), { avatarUrl: downloadURL });
      
      setAvatarUrl(downloadURL);
      await refreshUserProfile();
      toast.success('تم تحديث الصورة الشخصية');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('حدث خطأ في رفع الصورة');
    } finally {
      setUploadingAvatar(false);
    }
  };
  
  const handleRemoveAvatar = async () => {
    if (!avatarUrl) return;
    
    if (window.confirm('هل أنت متأكد من إزالة الصورة الشخصية؟')) {
      try {
        await deleteFile(avatarUrl);
        await updateDoc(doc(db, 'users', currentUser!.uid), { avatarUrl: null });
        setAvatarUrl(null);
        await refreshUserProfile();
        toast.success('تم إزالة الصورة الشخصية');
      } catch (error) {
        console.error('Error removing avatar:', error);
        toast.error('حدث خطأ في إزالة الصورة');
      }
    }
  };
  
  // ==========================================
  // حفظ الملف الشخصي
  // ==========================================
  
  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error('الاسم مطلوب');
      return;
    }
    
    setSavingProfile(true);
    
    try {
      await updateUserProfile({
        name: name.trim(),
        phone: phone.trim(),
        department
      });
      
      toast.success('تم حفظ التغييرات');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('حدث خطأ في حفظ التغييرات');
    } finally {
      setSavingProfile(false);
    }
  };
  
  // ==========================================
  // تغيير كلمة المرور
  // ==========================================
  
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    
    setChangingPassword(true);
    
    try {
      // إعادة المصادقة قبل تغيير كلمة المرور
      const credential = EmailAuthProvider.credential(currentUser!.email!, currentPassword);
      await reauthenticateWithCredential(currentUser!, credential);
      
      // تغيير كلمة المرور
      await updatePassword(currentUser!, newPassword);
      
      toast.success('تم تغيير كلمة المرور بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password') {
        toast.error('كلمة المرور الحالية غير صحيحة');
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error('يرجى تسجيل الخروج والدخول مرة أخرى لأسباب أمنية');
      } else {
        toast.error('حدث خطأ في تغيير كلمة المرور');
      }
    } finally {
      setChangingPassword(false);
    }
  };
  
  // ==========================================
  // حفظ الإعدادات
  // ==========================================
  
  const handleSaveSettings = async () => {
    try {
      await updateUserSettings({
        theme,
        language,
        emailNotifications,
        pushNotifications,
        taskReminderMinutes,
        meetingReminderMinutes
      });
      
      // تطبيق الثيم
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('ux4_th', theme);
      
      toast.success('تم حفظ الإعدادات');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('حدث خطأ في حفظ الإعدادات');
    }
  };
  
  // ==========================================
  // الحصول على الحروف الأولى للاسم
  // ==========================================
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };
  
  // ==========================================
  // تنسيق التاريخ
  // ==========================================
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // ==========================================
  // الواجهة الرئيسية
  // ==========================================
  
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* الصورة الشخصية والاسم */}
      <div className="card text-center">
        <div className="relative inline-block mx-auto">
          <div 
            className="w-32 h-32 rounded-full overflow-hidden cursor-pointer group mx-auto"
            onClick={() => avatarInputRef.current?.click()}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold" style={{ background: 'var(--brand-primary)', color: 'white' }}>
                {getInitials(name || userProfile?.name || 'U')}
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <FaCamera className="text-white text-2xl" />
            </div>
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
          {avatarUrl && (
            <button
              onClick={handleRemoveAvatar}
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center bg-red-500 text-white hover:bg-red-600 transition-colors"
              title="إزالة الصورة"
            >
              <FaTrash size={12} />
            </button>
          )}
          {uploadingAvatar && (
            <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center">
              <div className="spinner-sm" />
            </div>
          )}
        </div>
        
        <h2 className="text-xl font-bold mt-4">{userProfile?.name}</h2>
        <p className="text-sm text-gray-500">{userProfile?.email}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="badge badge-primary">{userProfile?.primaryRole === 'chairman' ? 'رئيس مجلس الإدارة' : userProfile?.primaryRole === 'vp' ? 'نائب رئيس' : userProfile?.primaryRole === 'manager' ? 'مدير' : 'موظف'}</span>
          <span className="badge badge-secondary">{userProfile?.department}</span>
        </div>
        {userProfile?.additionalTitles && userProfile.additionalTitles.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1 mt-2">
            {userProfile.additionalTitles.map((title, idx) => (
              <span key={idx} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--hv)' }}>
                {title}
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-500 mt-3">
          عضو منذ {userProfile?.createdAt ? formatDate(userProfile.createdAt) : '-'}
        </p>
      </div>
      
      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-3 text-center">
          <FaTasks className="mx-auto mb-1 text-brand" />
          <p className="text-2xl font-bold">{stats.tasksCreated}</p>
          <p className="text-xs text-gray-500">مهام منشأة</p>
        </div>
        <div className="card p-3 text-center">
          <FaCheckCircle className="mx-auto mb-1 text-green-500" />
          <p className="text-2xl font-bold">{stats.tasksCompleted}</p>
          <p className="text-xs text-gray-500">مهام مكتملة</p>
        </div>
        <div className="card p-3 text-center">
          <FaVideo className="mx-auto mb-1 text-blue-500" />
          <p className="text-2xl font-bold">{stats.meetingsAttended}</p>
          <p className="text-xs text-gray-500">اجتماعات حضرها</p>
        </div>
        <div className="card p-3 text-center">
          <FaComments className="mx-auto mb-1 text-purple-500" />
          <p className="text-2xl font-bold">{stats.messagesSent}</p>
          <p className="text-xs text-gray-500">رسائل مرسلة</p>
        </div>
      </div>
      
      {/* نموذج الملف الشخصي */}
      <div className="card">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <FaUser className="text-brand" /> المعلومات الشخصية
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">الاسم الكامل</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="الاسم الكامل"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              value={userProfile?.email || ''}
              className="input opacity-60 cursor-not-allowed"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">رقم الجوال</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              placeholder="05xxxxxxxx"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">الإدارة</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="input"
              disabled={userProfile?.primaryRole !== 'chairman'}
            >
              <option value="التسويق">التسويق</option>
              <option value="المالية والتدقيق">المالية والتدقيق</option>
              <option value="الموارد البشرية">الموارد البشرية</option>
              <option value="التكنولوجيا">التكنولوجيا</option>
              <option value="العلاقات العامة">العلاقات العامة</option>
              <option value="الإدارة العليا">الإدارة العليا</option>
            </select>
          </div>
        </div>
        
        <button
          onClick={handleSaveProfile}
          disabled={savingProfile}
          className="btn-primary mt-4 w-full md:w-auto"
        >
          {savingProfile ? <FaSpinner className="animate-spin" /> : <FaSave className="ml-2" />}
          حفظ التغييرات
        </button>
      </div>
      
      {/* تغيير كلمة المرور */}
      <div className="card">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <FaKey className="text-brand" /> تغيير كلمة المرور
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">كلمة المرور الحالية</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input"
              placeholder="********"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">كلمة المرور الجديدة</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input"
              placeholder="6 أحرف على الأقل"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">تأكيد كلمة المرور</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              placeholder="أعد كتابة كلمة المرور"
            />
          </div>
        </div>
        
        <button
          onClick={handleChangePassword}
          disabled={changingPassword}
          className="btn-secondary mt-4 w-full md:w-auto"
        >
          {changingPassword ? <FaSpinner className="animate-spin" /> : <FaKey className="ml-2" />}
          تحديث كلمة المرور
        </button>
      </div>
      
      {/* الإعدادات */}
      <div className="card">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <FaShieldAlt className="text-brand" /> الإعدادات والتفضيلات
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* المظهر */}
          <div>
            <label className="block text-sm font-medium mb-2">المظهر</label>
            <div className="flex gap-3">
              <button
                onClick={() => setTheme('dark')}
                className={`flex-1 p-3 rounded-lg border transition-all ${theme === 'dark' ? 'border-brand bg-brand/10' : 'border-bd'}`}
              >
                <FaMoon className="mx-auto mb-1" />
                <span className="text-sm">داكن</span>
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`flex-1 p-3 rounded-lg border transition-all ${theme === 'light' ? 'border-brand bg-brand/10' : 'border-bd'}`}
              >
                <FaSun className="mx-auto mb-1" />
                <span className="text-sm">فاتح</span>
              </button>
            </div>
          </div>
          
          {/* اللغة */}
          <div>
            <label className="block text-sm font-medium mb-2">اللغة</label>
            <div className="flex gap-3">
              <button
                onClick={() => setLanguage('ar')}
                className={`flex-1 p-3 rounded-lg border transition-all ${language === 'ar' ? 'border-brand bg-brand/10' : 'border-bd'}`}
              >
                <FaGlobe className="mx-auto mb-1" />
                <span className="text-sm">العربية</span>
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`flex-1 p-3 rounded-lg border transition-all ${language === 'en' ? 'border-brand bg-brand/10' : 'border-bd'}`}
                disabled
              >
                <FaLanguage className="mx-auto mb-1" />
                <span className="text-sm">English</span>
                <span className="text-[10px] text-gray-500 block">قريباً</span>
              </button>
            </div>
          </div>
          
          {/* الإشعارات */}
          <div>
            <label className="block text-sm font-medium mb-2">الإشعارات</label>
            <div className="space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm">إشعارات البريد الإلكتروني</span>
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="toggle"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm">الإشعارات الفورية</span>
                <input
                  type="checkbox"
                  checked={pushNotifications}
                  onChange={(e) => setPushNotifications(e.target.checked)}
                  className="toggle"
                />
              </label>
            </div>
          </div>
          
          {/* التذكيرات */}
          <div>
            <label className="block text-sm font-medium mb-2">التذكيرات</label>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500">تذكير المهام قبل</label>
                <select
                  value={taskReminderMinutes}
                  onChange={(e) => setTaskReminderMinutes(Number(e.target.value))}
                  className="input text-sm mt-1"
                >
                  <option value={15}>15 دقيقة</option>
                  <option value={30}>30 دقيقة</option>
                  <option value={60}>ساعة واحدة</option>
                  <option value={120}>ساعتين</option>
                  <option value={1440}>يوم كامل</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">تذكير الاجتماعات قبل</label>
                <select
                  value={meetingReminderMinutes}
                  onChange={(e) => setMeetingReminderMinutes(Number(e.target.value))}
                  className="input text-sm mt-1"
                >
                  <option value={5}>5 دقائق</option>
                  <option value={15}>15 دقيقة</option>
                  <option value={30}>30 دقيقة</option>
                  <option value={60}>ساعة واحدة</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleSaveSettings}
          className="btn-primary mt-4 w-full md:w-auto"
        >
          <FaSave className="ml-2" /> حفظ الإعدادات
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;