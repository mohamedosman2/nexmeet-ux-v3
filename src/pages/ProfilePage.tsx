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
  FaComments,
  FaSpinner
} from 'react-icons/fa';

// ==========================================
// واجهة إعدادات المستخدم
// ==========================================

interface UserSettings {
  uid: string;
  theme: 'light' | 'dark';
  language: 'ar' | 'en';
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  taskReminderMinutes: number;
  meetingReminderMinutes: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  weekendDays: number[];
}

// ==========================================
// صفحة الملف الشخصي الرئيسية
// ==========================================

export const ProfilePage: React.FC = () => {
  const { currentUser, userProfile, refreshUserProfile, updateUserProfile, logout } = useAuth();
  
  // ==========================================
  // حالات الملف الشخصي
  // ==========================================
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  
  // ==========================================
  // حالات تغيير كلمة المرور
  // ==========================================
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // ==========================================
  // حالات الإعدادات
  // ==========================================
  
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  
  // ==========================================
  // حالات الإحصائيات الشخصية
  // ==========================================
  
  const [personalStats, setPersonalStats] = useState({
    tasksCreated: 0,
    tasksCompleted: 0,
    tasksInProgress: 0,
    tasksOverdue: 0,
    meetingsCreated: 0,
    meetingsAttended: 0,
    messagesSent: 0,
    joinDate: '',
    lastActive: ''
  });
  
  // ==========================================
  // حالة التبويب النشط
  // ==========================================
  
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'stats'>('profile');
  
  // ==========================================
  // Refs
  // ==========================================
  
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
  
  // ==========================================
  // تحميل إعدادات المستخدم
  // ==========================================
  
  useEffect(() => {
    if (!currentUser) return;
    
    const fetchUserSettings = async () => {
      setLoadingSettings(true);
      try {
        const settingsRef = doc(db, 'userSettings', currentUser.uid);
        const settingsDoc = await getDoc(settingsRef);
        
        if (settingsDoc.exists()) {
          setUserSettings(settingsDoc.data() as UserSettings);
        } else {
          // إنشاء إعدادات افتراضية
          const defaultSettings: UserSettings = {
            uid: currentUser.uid,
            theme: 'dark',
            language: 'ar',
            emailNotifications: true,
            smsNotifications: false,
            pushNotifications: true,
            taskReminderMinutes: 30,
            meetingReminderMinutes: 15,
            workingHoursStart: '09:00',
            workingHoursEnd: '17:00',
            weekendDays: [5, 6]
          };
          setUserSettings(defaultSettings);
        }
      } catch (error) {
        console.error('Error fetching user settings:', error);
      } finally {
        setLoadingSettings(false);
      }
    };
    
    fetchUserSettings();
  }, [currentUser]);
  
  // ==========================================
  // تحميل الإحصائيات الشخصية
  // ==========================================
  
  useEffect(() => {
    if (!currentUser) return;
    
    const fetchPersonalStats = async () => {
      try {
        // يمكن جلب الإحصائيات من Firebase
        // هذا مثال بسيط، يمكن توسيعه لاحقاً
        setPersonalStats({
          tasksCreated: 0,
          tasksCompleted: 0,
          tasksInProgress: 0,
          tasksOverdue: 0,
          meetingsCreated: 0,
          meetingsAttended: 0,
          messagesSent: 0,
          joinDate: userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString('ar-SA') : '-',
          lastActive: userProfile?.lastLoginAt ? new Date(userProfile.lastLoginAt).toLocaleDateString('ar-SA') : '-'
        });
      } catch (error) {
        console.error('Error fetching personal stats:', error);
      }
    };
    
    fetchPersonalStats();
  }, [currentUser, userProfile]);
  
  // ==========================================
  // تحديث الصورة الشخصية
  // ==========================================
  
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // التحقق من حجم الصورة (حد أقصى 2 ميجابايت)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
      return;
    }
    
    // التحقق من نوع الصورة
    if (!file.type.startsWith('image/')) {
      toast.error('الملف المرفق ليس صورة');
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
      const path = `avatars/${currentUser?.uid}/${Date.now()}_${file.name}`;
      const downloadURL = await uploadFile(path, file);
      
      // تحديث في Firestore
      await updateDoc(doc(db, 'users', currentUser!.uid), { avatarUrl: downloadURL });
      
      setAvatarUrl(downloadURL);
      await refreshUserProfile();
      toast.success('تم تحديث الصورة الشخصية بنجاح');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('حدث خطأ في رفع الصورة');
    } finally {
      setUploadingAvatar(false);
    }
  };
  
  // ==========================================
  // إزالة الصورة الشخصية
  // ==========================================
  
  const handleRemoveAvatar = async () => {
    if (!avatarUrl) return;
    
    if (!window.confirm('هل أنت متأكد من إزالة الصورة الشخصية؟')) return;
    
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
  };
  
  // ==========================================
  // حفظ الملف الشخصي
  // ==========================================
  
  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error('الاسم مطلوب');
      return;
    }
    
    if (!phone.trim()) {
      toast.error('رقم الجوال مطلوب');
      return;
    }
    
    setSavingProfile(true);
    
    try {
      await updateUserProfile({
        name: name.trim(),
        phone: phone.trim(),
        department
      });
      
      toast.success('تم حفظ التغييرات بنجاح');
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
    
    if (currentPassword === newPassword) {
      toast.error('كلمة المرور الجديدة يجب أن تكون مختلفة عن القديمة');
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
      
      // تنظيف الحقول
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
    } catch (error: any) {
      console.error('Error changing password:', error);
      
      if (error.code === 'auth/wrong-password') {
        toast.error('كلمة المرور الحالية غير صحيحة');
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error('لأسباب أمنية، يرجى تسجيل الخروج والدخول مرة أخرى');
      } else if (error.code === 'auth/weak-password') {
        toast.error('كلمة المرور الجديدة ضعيفة جداً');
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
    if (!userSettings || !currentUser) return;
    
    setSavingSettings(true);
    
    try {
      const settingsRef = doc(db, 'userSettings', currentUser.uid);
      await updateDoc(settingsRef, {
        theme: userSettings.theme,
        language: userSettings.language,
        emailNotifications: userSettings.emailNotifications,
        smsNotifications: userSettings.smsNotifications,
        pushNotifications: userSettings.pushNotifications,
        taskReminderMinutes: userSettings.taskReminderMinutes,
        meetingReminderMinutes: userSettings.meetingReminderMinutes,
        workingHoursStart: userSettings.workingHoursStart,
        workingHoursEnd: userSettings.workingHoursEnd,
        weekendDays: userSettings.weekendDays,
        updatedAt: Date.now()
      });
      
      // تطبيق الثيم
      document.documentElement.setAttribute('data-theme', userSettings.theme);
      localStorage.setItem('ux4_th', userSettings.theme);
      
      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('حدث خطأ في حفظ الإعدادات');
    } finally {
      setSavingSettings(false);
    }
  };
  
  // ==========================================
  // تحديث إعداد معين
  // ==========================================
  
  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    if (userSettings) {
      setUserSettings({ ...userSettings, [key]: value });
    }
  };
  
  // ==========================================
  // الحصول على الحروف الأولى للاسم
  // ==========================================
  
  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };
  
  // ==========================================
  // الحصول على عرض الدور
  // ==========================================
  
  const getRoleDisplay = () => {
    if (!userProfile) return 'موظف';
    
    if (userProfile.primaryRole === 'chairman') return 'رئيس مجلس الإدارة';
    if (userProfile.primaryRole === 'vp') return 'نائب رئيس مجلس الإدارة';
    if (userProfile.primaryRole === 'manager') return 'مدير إدارة';
    return 'موظف';
  };
  
  // ==========================================
  // الحصول على لون الدور
  // ==========================================
  
  const getRoleColor = () => {
    if (!userProfile) return 'var(--hv)';
    
    if (userProfile.primaryRole === 'chairman') return 'var(--brand-primary)';
    if (userProfile.primaryRole === 'vp') return 'var(--brand-secondary)';
    if (userProfile.primaryRole === 'manager') return 'var(--brand-secondary-light)';
    return 'var(--hv)';
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
  // تسجيل الخروج
  // ==========================================
  
  const handleLogout = async () => {
    if (window.confirm('هل أنت متأكد من تسجيل الخروج؟')) {
      await logout();
    }
  };
  
  // ==========================================
  // الواجهة الرئيسية
  // ==========================================
  
  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
      
      {/* ==========================================
           بطاقة الملف الشخصي العلوية
      ========================================== */}
      
      <div className="card">
        <div className="flex flex-col md:flex-row items-center gap-6">
          
          {/* الصورة الشخصية */}
          <div className="relative group">
            <div 
              className="w-28 h-28 rounded-full overflow-hidden cursor-pointer group"
              onClick={() => avatarInputRef.current?.click()}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold" style={{ background: 'var(--brand-primary)', color: 'white' }}>
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
          
          {/* معلومات المستخدم */}
          <div className="flex-1 text-center md:text-right">
            <h2 className="text-2xl font-bold">{userProfile?.name}</h2>
            <p className="text-gray-500 text-sm">{userProfile?.email}</p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
              <span className="badge" style={{ background: getRoleColor(), color: 'white' }}>
                {getRoleDisplay()}
              </span>
              <span className="badge badge-secondary">{userProfile?.department}</span>
            </div>
            {userProfile?.additionalTitles && userProfile.additionalTitles.length > 0 && (
              <div className="flex flex-wrap justify-center md:justify-start gap-1 mt-2">
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
          
          {/* زر تسجيل الخروج */}
          <button onClick={handleLogout} className="btn-danger">
            <FaKey className="ml-2" /> تسجيل الخروج
          </button>
        </div>
      </div>
      
      {/* ==========================================
           تبويبات التنقل
      ========================================== */}
      
      <div className="flex flex-wrap gap-2 border-b" style={{ borderColor: 'var(--bd)' }}>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 text-sm font-medium transition-all ${activeTab === 'profile' ? 'border-b-2 border-brand text-brand' : 'text-gray-500 hover:text-white'}`}
        >
          <FaUser className="inline ml-2" size={14} /> المعلومات الشخصية
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 text-sm font-medium transition-all ${activeTab === 'security' ? 'border-b-2 border-brand text-brand' : 'text-gray-500 hover:text-white'}`}
        >
          <FaShieldAlt className="inline ml-2" size={14} /> الأمان
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`px-4 py-2 text-sm font-medium transition-all ${activeTab === 'preferences' ? 'border-b-2 border-brand text-brand' : 'text-gray-500 hover:text-white'}`}
        >
          <FaBell className="inline ml-2" size={14} /> الإعدادات والتفضيلات
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 text-sm font-medium transition-all ${activeTab === 'stats' ? 'border-b-2 border-brand text-brand' : 'text-gray-500 hover:text-white'}`}
        >
          <FaChartLine className="inline ml-2" size={14} /> الإحصائيات الشخصية
        </button>
      </div>
      
      {/* ==========================================
           تبويب المعلومات الشخصية
      ========================================== */}
      
      {activeTab === 'profile' && (
        <div className="card">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <FaUser className="text-brand" /> المعلومات الشخصية
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">الاسم الكامل *</label>
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
              <p className="text-xs text-gray-500 mt-1">لا يمكن تغيير البريد الإلكتروني</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">رقم الجوال *</label>
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
              {userProfile?.primaryRole !== 'chairman' && (
                <p className="text-xs text-gray-500 mt-1">لا يمكن تغيير الإدارة إلا من قبل رئيس مجلس الإدارة</p>
              )}
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="btn-primary"
            >
              {savingProfile ? <FaSpinner className="animate-spin ml-2" /> : <FaSave className="ml-2" />}
              حفظ التغييرات
            </button>
          </div>
        </div>
      )}
      
      {/* ==========================================
           تبويب الأمان
      ========================================== */}
      
      {activeTab === 'security' && (
        <div className="card">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <FaKey className="text-brand" /> تغيير كلمة المرور
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">كلمة المرور الحالية</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input"
                  placeholder="أدخل كلمة المرور الحالية"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-brand transition-colors"
                >
                  {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">كلمة المرور الجديدة</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input"
                  placeholder="6 أحرف على الأقل"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-brand transition-colors"
                >
                  {showNewPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">يجب أن تكون كلمة المرور 6 أحرف على الأقل</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">تأكيد كلمة المرور الجديدة</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input"
                  placeholder="أعد كتابة كلمة المرور الجديدة"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-brand transition-colors"
                >
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="btn-secondary"
              >
                {changingPassword ? <FaSpinner className="animate-spin ml-2" /> : <FaKey className="ml-2" />}
                تحديث كلمة المرور
              </button>
            </div>
          </div>
          
          {/* معلومات أمنية إضافية */}
          <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--bd)' }}>
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <FaShieldAlt className="text-brand" size={12} /> نصائح أمنية
            </h4>
            <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
              <li>استخدم كلمة مرور قوية تحتوي على أحرف وأرقام ورموز</li>
              <li>لا تشارك كلمة المرور الخاصة بك مع أي شخص</li>
              <li>قم بتغيير كلمة المرور بشكل دوري</li>
              <li>إذا كنت تعتقد أن حسابك قد تم اختراقه، اتصل بالدعم الفني فوراً</li>
            </ul>
          </div>
        </div>
      )}
      
      {/* ==========================================
           تبويب الإعدادات والتفضيلات
      ========================================== */}
      
      {activeTab === 'preferences' && (
        <div className="card">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <FaBell className="text-brand" /> الإعدادات والتفضيلات
          </h3>
          
          {loadingSettings ? (
            <div className="flex justify-center py-8">
              <div className="spinner-sm" />
            </div>
          ) : userSettings ? (
            <div className="space-y-6">
              {/* المظهر */}
              <div>
                <label className="block text-sm font-medium mb-2">المظهر</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => updateSetting('theme', 'dark')}
                    className={`flex-1 p-3 rounded-lg border transition-all ${userSettings.theme === 'dark' ? 'border-brand bg-brand/10' : 'border-bd'}`}
                  >
                    <FaMoon className="mx-auto mb-1" size={20} />
                    <span className="text-sm">داكن</span>
                  </button>
                  <button
                    onClick={() => updateSetting('theme', 'light')}
                    className={`flex-1 p-3 rounded-lg border transition-all ${userSettings.theme === 'light' ? 'border-brand bg-brand/10' : 'border-bd'}`}
                  >
                    <FaSun className="mx-auto mb-1" size={20} />
                    <span className="text-sm">فاتح</span>
                  </button>
                </div>
              </div>
              
              {/* اللغة */}
              <div>
                <label className="block text-sm font-medium mb-2">اللغة</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => updateSetting('language', 'ar')}
                    className={`flex-1 p-3 rounded-lg border transition-all ${userSettings.language === 'ar' ? 'border-brand bg-brand/10' : 'border-bd'}`}
                  >
                    <FaGlobe className="mx-auto mb-1" size={20} />
                    <span className="text-sm">العربية</span>
                  </button>
                  <button
                    onClick={() => updateSetting('language', 'en')}
                    className={`flex-1 p-3 rounded-lg border transition-all opacity-50 cursor-not-allowed ${userSettings.language === 'en' ? 'border-brand bg-brand/10' : 'border-bd'}`}
                    disabled
                  >
                    <FaLanguage className="mx-auto mb-1" size={20} />
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
                      checked={userSettings.emailNotifications}
                      onChange={(e) => updateSetting('emailNotifications', e.target.checked)}
                      className="w-5 h-5 rounded border-gray-600 text-brand focus:ring-brand"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm">إشعارات SMS</span>
                    <input
                      type="checkbox"
                      checked={userSettings.smsNotifications}
                      onChange={(e) => updateSetting('smsNotifications', e.target.checked)}
                      className="w-5 h-5 rounded border-gray-600 text-brand focus:ring-brand"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm">الإشعارات الفورية</span>
                    <input
                      type="checkbox"
                      checked={userSettings.pushNotifications}
                      onChange={(e) => updateSetting('pushNotifications', e.target.checked)}
                      className="w-5 h-5 rounded border-gray-600 text-brand focus:ring-brand"
                    />
                  </label>
                </div>
              </div>
              
              {/* التذكيرات */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">تذكير المهام قبل</label>
                  <select
                    value={userSettings.taskReminderMinutes}
                    onChange={(e) => updateSetting('taskReminderMinutes', Number(e.target.value))}
                    className="input"
                  >
                    <option value={5}>5 دقائق</option>
                    <option value={15}>15 دقيقة</option>
                    <option value={30}>30 دقيقة</option>
                    <option value={60}>ساعة واحدة</option>
                    <option value={120}>ساعتين</option>
                    <option value={1440}>يوم كامل</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">تذكير الاجتماعات قبل</label>
                  <select
                    value={userSettings.meetingReminderMinutes}
                    onChange={(e) => updateSetting('meetingReminderMinutes', Number(e.target.value))}
                    className="input"
                  >
                    <option value={5}>5 دقائق</option>
                    <option value={15}>15 دقيقة</option>
                    <option value={30}>30 دقيقة</option>
                    <option value={60}>ساعة واحدة</option>
                  </select>
                </div>
              </div>
              
              {/* ساعات العمل */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">بداية ساعات العمل</label>
                  <input
                    type="time"
                    value={userSettings.workingHoursStart}
                    onChange={(e) => updateSetting('workingHoursStart', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">نهاية ساعات العمل</label>
                  <input
                    type="time"
                    value={userSettings.workingHoursEnd}
                    onChange={(e) => updateSetting('workingHoursEnd', e.target.value)}
                    className="input"
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="btn-primary"
                >
                  {savingSettings ? <FaSpinner className="animate-spin ml-2" /> : <FaSave className="ml-2" />}
                  حفظ الإعدادات
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">حدث خطأ في تحميل الإعدادات</p>
            </div>
          )}
        </div>
      )}
      
      {/* ==========================================
           تبويب الإحصائيات الشخصية
      ========================================== */}
      
      {activeTab === 'stats' && (
        <div className="space-y-4">
          {/* بطاقات الإحصائيات السريعة */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card p-3 text-center">
              <FaTasks className="mx-auto mb-1 text-brand" size={20} />
              <p className="text-2xl font-bold">{personalStats.tasksCreated}</p>
              <p className="text-xs text-gray-500">مهام منشأة</p>
            </div>
            <div className="card p-3 text-center">
              <FaCheckCircle className="mx-auto mb-1 text-green-500" size={20} />
              <p className="text-2xl font-bold">{personalStats.tasksCompleted}</p>
              <p className="text-xs text-gray-500">مهام مكتملة</p>
            </div>
            <div className="card p-3 text-center">
              <FaVideo className="mx-auto mb-1 text-blue-500" size={20} />
              <p className="text-2xl font-bold">{personalStats.meetingsAttended}</p>
              <p className="text-xs text-gray-500">اجتماعات حضرها</p>
            </div>
            <div className="card p-3 text-center">
              <FaComments className="mx-auto mb-1 text-purple-500" size={20} />
              <p className="text-2xl font-bold">{personalStats.messagesSent}</p>
              <p className="text-xs text-gray-500">رسائل مرسلة</p>
            </div>
          </div>
          
          {/* إحصائيات المهام التفصيلية */}
          <div className="card">
            <h3 className="font-bold mb-3">إحصائيات المهام</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>مهام قيد التنفيذ</span>
                  <span>{personalStats.tasksInProgress}</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--hv)' }}>
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${personalStats.tasksInProgress}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>مهام متأخرة</span>
                  <span>{personalStats.tasksOverdue}</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--hv)' }}>
                  <div className="h-full rounded-full bg-red-500" style={{ width: `${personalStats.tasksOverdue}%` }} />
                </div>
              </div>
            </div>
          </div>
          
          {/* معلومات إضافية */}
          <div className="card">
            <h3 className="font-bold mb-3">معلومات إضافية</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">تاريخ الانضمام:</span>
                <span>{personalStats.joinDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">آخر نشاط:</span>
                <span>{personalStats.lastActive}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;